import { debounce } from "lodash";
import type { Dispatch } from "redux";
import { ActionCreators, ActionTypes } from "redux-undo";
import substituteTemplateVariables from "../lib/capture_template_substitution";
import { exportOrg } from "../lib/export_org";
import { headerWithPath, STATIC_FILE_PREFIX } from "../lib/org_utils";
import {
  activatePopup,
  closePopup,
  hideLoadingMessage,
  setDisappearingLoadingMessage,
  setIsLoading,
  setLoadingMessage,
} from "./base";

import { addSeconds, isAfter, parseISO } from "date-fns";
import sampleCaptureTemplates from "../lib/sample_capture_templates";
import type {
  Context,
  EditModeType,
  LogEntryType,
  OrgAction,
  OrgTimestampPart,
  PlanningType,
  SyncOptions,
  ForceAction,
} from "../types";
import {
  persistIsDirty,
  saveFileContentsToLocalStorage,
} from "../util/file_persister";
import {
  localStorageAvailable,
  readOpennessState,
} from "../util/settings_persister";

export const parseFile =
  (path: string, contents: string) =>
  (dispatch: Dispatch<OrgAction>): void => {
    if (localStorageAvailable && !path.startsWith(STATIC_FILE_PREFIX)) {
      saveFileContentsToLocalStorage(path, contents);
      const opennessState = readOpennessState();
      if (!!opennessState) {
        dispatch(setOpennessState(path, opennessState[path]));
      }
    }
    dispatch({
      type: "PARSE_FILE",
      path,
      contents,
    });
    dispatch(applyOpennessState(path));
  };

export const setLastSyncAt = (lastSyncAt: Date, path: string): OrgAction => ({
  type: "SET_LAST_SYNC_AT",
  path,
  lastSyncAt,
});

export const resetFileDisplay = (): ((dispatch: Dispatch) => void) => {
  return (dispatch: Dispatch): void => {
    dispatch(widenHeader());
    dispatch(closePopup());
    dispatch({ type: "CLEAR_SEARCH" });
    dispatch(setPath(null));
    dispatch(ActionCreators.clearHistory());
  };
};

const getDebouncedSyncFunction = () =>
  debounce(
    (dispatch: Dispatch, options: SyncOptions) => dispatch(doSync(options)),
    3000,
    {
      leading: true,
      trailing: true,
    },
  );
const debouncedSyncFunctions = {};
const syncDebounced = (
  dispatch: Dispatch,
  getState,
  options: SyncOptions,
): void => {
  // to make sure no file is skipped when multiple files are dirty
  // a seperately debounced function is used per file
  let filesToSync = [];
  if (options.path) {
    filesToSync = [options.path];
  } else {
    // if no path is passed in, sync all dirty files
    const files = getState().org.present.get("files");
    filesToSync = files
      .keySeq()
      .filter((path: string) => files.getIn([path, "isDirty"]));
  }
  filesToSync.forEach((path: string): void => {
    let debouncedSyncFunction = debouncedSyncFunctions[path];
    if (!debouncedSyncFunction) {
      debouncedSyncFunctions[path] = getDebouncedSyncFunction();
      debouncedSyncFunction = debouncedSyncFunctions[path];
    }
    debouncedSyncFunction(dispatch, options);
  });
};

export const sync =
  (options: SyncOptions) =>
  (dispatch: Dispatch, getState): void => {
    // Don't do anything if the browser is not online. When it gets back
    // from an offline state, a new `sync`action will be triggered then.
    if (getState().base.get("online")) {
      // If the user hits the 'sync' button, no matter if there's a sync
      // in progress or if the sync 'should' be debounced, listen to the
      // user and start a sync.
      if (options.forceAction === "manual") {
        console.log("forcing sync");
        const files = getState().org.present.get("files");
        // sync all files on manual sync
        files
          .keySeq()
          .forEach((path: string) => dispatch(doSync({ ...options, path })));
      } else {
        syncDebounced(dispatch, getState, options);
      }
    }
  };

// doSync is the actual sync action synchronizing/persisting the Org
// file. When 'live sync' is enabled, there's potentially a quick
// succession of calls to 'sync' and therefore to the sync back-end
// happening. These calls need to be debounced. If there's a really
// succession of calls, only the first and last synchronization will
// happen.
// Note: This action is a redux-thunk action (because it returns a
// function). This function is defined every time it is called. Hence,
// wrapping it in `debounce` will not be good enough. Since it would
// be a new function every time, it would be called every time. The
// solution is to define an inner function `sync` outside of the
// wrapping function `syncDebounced`. This will actually debounce
// `doSync`, because the inner function `sync` will be created only
// once.
const doSync =
  ({
    forceAction = null,
    successMessage = "Changes pushed",
    shouldSuppressMessages = false,
    path,
  }: {
    forceAction?: ForceAction;
    successMessage?: string | undefined;
    shouldSuppressMessages?: boolean | undefined;
    path?: string;
  } = {}) =>
  (dispatch: Dispatch, getState): void => {
    const client = getState().syncBackend.get("client");
    const currentPath = getState().org.present.get("path");
    path = path || currentPath;
    if (!path || path.startsWith(STATIC_FILE_PREFIX)) {
      return;
    }

    // Calls do `doSync` are already debounced using a timer, but on big
    // Org files or slow connections, it's still possible to have
    // concurrent requests to `doSync` which has no merit. When
    // `isLoading`, don't trigger another sync in parallel. Instead,
    // call `syncDebounced` and return immediately. This will
    // recursively enqueue the request to do a sync until the current
    // sync is finished. Since it's a debounced call, enqueueing it
    // recursively is efficient.
    // That is, unless the user manually hits the 'sync' button
    // (indicated by `forceAction === 'manual'`). Then, do what the user
    // requests.
    if (
      getState().base.get("isLoading").includes(path) &&
      forceAction !== "manual"
    ) {
      // Since there is a quick succession of debounced requests to
      // synchronize, the user likely is in a undo/redo workflow with
      // potential new changes to the Org file in between. In such a
      // situation, it is easy for the remote file to have a newer
      // `lastModifiedAt` date than the `lastSyncAt` date. Hence,
      // pushing is the right action - no need for the modal to ask the
      // user for her request to pull/push or cancel.
      dispatch(sync({ forceAction: "push" }));
      return;
    }

    if (!shouldSuppressMessages) {
      dispatch(setLoadingMessage(`Syncing ...`));
    }
    dispatch(setIsLoading(true, path));
    dispatch(setOrgFileErrorMessage(null));

    client
      .getFileContentsAndMetadata(path)
      .then(
        ({
          contents,
          lastModifiedAt,
        }: {
          contents: string;
          lastModifiedAt: string;
        }): void => {
          const isDirty = getState().org.present.getIn([
            "files",
            path,
            "isDirty",
          ]);
          const lastServerModifiedAt = parseISO(lastModifiedAt);
          const lastSyncAt = getState().org.present.getIn([
            "files",
            path,
            "lastSyncAt",
          ]);

          if (
            isAfter(lastSyncAt, lastServerModifiedAt) ||
            forceAction === "push"
          ) {
            if (isDirty) {
              const contents = exportOrg({
                headers: getState().org.present.getIn([
                  "files",
                  path,
                  "headers",
                ]),
                linesBeforeHeadings: getState().org.present.getIn([
                  "files",
                  path,
                  "linesBeforeHeadings",
                ]),
                dontIndent: getState().base.get("shouldNotIndentOnExport"),
              });
              client
                .updateFile(path, contents)
                .then((): void => {
                  if (!shouldSuppressMessages) {
                    dispatch(
                      setDisappearingLoadingMessage(successMessage, 2000),
                    );
                  } else {
                    setTimeout(() => dispatch(hideLoadingMessage()), 2000);
                  }
                  dispatch(setIsLoading(false, path));
                  dispatch(setDirty(false, path));
                  dispatch(setLastSyncAt(addSeconds(new Date(), 5), path));
                })
                .catch((error): void => {
                  const err = `There was an error pushing the file ${path}: ${error.toString()}`;
                  console.error(err);
                  dispatch(setDisappearingLoadingMessage(err, 5000));
                  dispatch(hideLoadingMessage());
                  dispatch(setIsLoading(false, path));
                  // Re-enqueue the file to be synchronized again
                  dispatch(sync({ path }));
                });
            } else {
              if (!shouldSuppressMessages) {
                dispatch(
                  setDisappearingLoadingMessage("Nothing to sync", 2000),
                );
              } else {
                setTimeout(() => dispatch(hideLoadingMessage()), 2000);
              }
              dispatch(setIsLoading(false, path));
            }
          } else {
            if (isDirty && forceAction !== "pull") {
              dispatch(hideLoadingMessage());
              dispatch(setIsLoading(false, path));
              dispatch(
                activatePopup("sync-confirmation", {
                  lastServerModifiedAt,
                  lastSyncAt,
                  path,
                }),
              );
            } else {
              dispatch(parseFile(path, contents));
              dispatch(setDirty(false, path));
              dispatch(setLastSyncAt(addSeconds(new Date(), 5), path));
              if (!shouldSuppressMessages) {
                dispatch(
                  setDisappearingLoadingMessage(
                    `Latest version pulled: ${path}`,
                    2000,
                  ),
                );
              } else {
                setTimeout(() => dispatch(hideLoadingMessage()), 2000);
              }
              dispatch(setIsLoading(false, path));
            }
          }
        },
      )
      .catch((): void => {
        dispatch(hideLoadingMessage());
        dispatch(setIsLoading(false, path));
        dispatch(setOrgFileErrorMessage(`File ${path} not found`));
      });
  };

export const openHeader = (headerId: number): OrgAction => ({
  type: "OPEN_HEADER",
  headerId,
});

export const toggleHeaderOpened = (
  headerId: number,
  closeSubheadersRecursively: boolean,
): OrgAction => ({
  type: "TOGGLE_HEADER_OPENED",
  headerId,
  closeSubheadersRecursively,
});

export const selectHeader =
  (headerId: number) =>
  (dispatch: Dispatch<OrgAction>): void => {
    dispatch({ type: "SELECT_HEADER", headerId });

    if (!!headerId) {
      dispatch(setSelectedTableCellId(null));
      dispatch(setSelectedListItemId(null));
    }
  };

export const selectHeaderIndex =
  (headerIndex: number) =>
  (dispatch: Dispatch): void => {
    dispatch({ type: "SELECT_HEADER_INDEX", headerIndex });
  };

export const setPath =
  (path: string) =>
  (dispatch: Dispatch): void => {
    dispatch({
      type: "SET_PATH",
      path,
    });
    dispatch({ type: ActionTypes.CLEAR_HISTORY });
  };

export const selectHeaderAndOpenParents =
  (path: string, headerId: number) =>
  (dispatch: Dispatch): void => {
    dispatch(setPath(path));
    dispatch({ type: "OPEN_PARENTS_OF_HEADER", headerId });
    // select header after the file is displayed to allow the header to scroll into view
    setTimeout(() => dispatch(selectHeader(headerId)), 0);
  };

/**
 * Action to advance the state, e.g. TODO -> DONE, of the header specified in headerId.
 *
 * @param {*} headerId headerId to advance, or null if you want the currently narrowed header.
 * @param {*} logIntoDrawer false to log state change into body, true to log into :LOGBOOK: drawer.
 */
export const advanceTodoState = (
  headerId: number,
  logIntoDrawer: boolean,
): OrgAction => ({
  type: "ADVANCE_TODO_STATE",
  headerId,
  logIntoDrawer,
  dirtying: true,
  timestamp: new Date(),
});

export const setTodoState = (
  headerId: number,
  newTodoState: string,
  logIntoDrawer: boolean,
): OrgAction => ({
  type: "SET_TODO_STATE",
  newTodoState,
  headerId,
  logIntoDrawer,
  dirtying: true,
  timestamp: new Date(),
});

export const enterEditMode = (editModeType: EditModeType): OrgAction => ({
  type: "ENTER_EDIT_MODE",
  editModeType,
});

export const exitEditMode = (): OrgAction => ({
  type: "EXIT_EDIT_MODE",
});

export const updateHeaderTitle = (
  headerId: number,
  newRawTitle: string,
): OrgAction => ({
  type: "UPDATE_HEADER_TITLE",
  headerId,
  newRawTitle,
  dirtying: true,
});

export const updateHeaderDescription = (
  headerId: number,
  newRawDescription: string,
): OrgAction => ({
  type: "UPDATE_HEADER_DESCRIPTION",
  headerId,
  newRawDescription,
  dirtying: true,
});

export const addHeader = (headerId: number): OrgAction => ({
  type: "ADD_HEADER",
  headerId,
  // Performance optimization: Don't actually sync a whole Org file
  // for an empty header. When the user adds some data and triggers
  // UPDATE_HEADER_TITLE, then it makes sense to save it.
  dirtying: false,
});

export const duplicateHeader = (headerId: number): OrgAction => ({
  type: "DUPLICATE_HEADER",
  headerId,
  dirtying: true,
});

export const createFirstHeader = (): OrgAction => ({
  type: "CREATE_FIRST_HEADER",
  dirtying: true,
});

export const selectNextSiblingHeader = (headerId: number): OrgAction => ({
  type: "SELECT_NEXT_SIBLING_HEADER",
  headerId,
});

export const addHeaderAndEdit =
  (headerId: number) =>
  (dispatch: Dispatch): void => {
    dispatch(addHeader(headerId));
    dispatch(selectNextSiblingHeader(headerId));
    dispatch(activatePopup("title-editor"));
  };

export const selectNextVisibleHeader = (headerId: number): OrgAction => ({
  type: "SELECT_NEXT_VISIBLE_HEADER",
  headerId,
});

export const selectPreviousVisibleHeader = (headerId: number): OrgAction => ({
  type: "SELECT_PREVIOUS_VISIBLE_HEADER",
  headerId,
});

export const removeHeader = (headerId: number): OrgAction => ({
  type: "REMOVE_HEADER",
  headerId,
  dirtying: true,
});

export const moveHeaderUp = (headerId: number): OrgAction => ({
  type: "MOVE_HEADER_UP",
  headerId,
  dirtying: true,
});

export const moveHeaderDown = (headerId: number): OrgAction => ({
  type: "MOVE_HEADER_DOWN",
  headerId,
  dirtying: true,
});

export const moveHeaderLeft = (headerId: number): OrgAction => ({
  type: "MOVE_HEADER_LEFT",
  headerId,
  dirtying: true,
});

export const moveHeaderRight = (headerId: number): OrgAction => ({
  type: "MOVE_HEADER_RIGHT",
  headerId,
  dirtying: true,
});

export const moveSubtreeLeft = (headerId: number): OrgAction => ({
  type: "MOVE_SUBTREE_LEFT",
  headerId,
  dirtying: true,
});

export const moveSubtreeRight = (headerId: number): OrgAction => ({
  type: "MOVE_SUBTREE_RIGHT",
  headerId,
  dirtying: true,
});

export const refileSubtree = (
  sourcePath: string,
  sourceHeaderId: number,
  targetPath: string,
  targetHeaderId: number,
): OrgAction => ({
  type: "REFILE_SUBTREE",
  sourcePath,
  sourceHeaderId,
  targetPath,
  targetHeaderId,
  dirtying: true,
});

export const addNote = (inputText: string, currentDate: Date): OrgAction => ({
  type: "HEADER_ADD_NOTE",
  inputText,
  currentDate,
  dirtying: true,
});

export const narrowHeader = (headerId: number): OrgAction => ({
  type: "NARROW_HEADER",
  headerId,
});

export const widenHeader = (): OrgAction => ({
  type: "WIDEN_HEADER",
});

export const setOpennessState = (
  path: string,
  opennessState: boolean,
): OrgAction => ({
  type: "SET_OPENNESS_STATE",
  path,
  opennessState,
});

export const applyOpennessState = (path: string): OrgAction => ({
  type: "APPLY_OPENNESS_STATE",
  path,
});

export const dirtyAction = (isDirty: boolean, path: string): OrgAction => ({
  type: "SET_DIRTY",
  isDirty,
  path,
});

export const setDirty =
  (isDirty: boolean, path: string) =>
  (dispatch: Dispatch): void => {
    persistIsDirty(isDirty, path);
    dispatch(dirtyAction(isDirty, path));
  };

export const setSelectedDescriptionItemIndex =
  (itemIndex: number) =>
  (dispatch: Dispatch): void => {
    dispatch({ type: "SET_SELECTED_DESCRIPTION_ITEM_INDEX", itemIndex });
  };

export const setSelectedTableId =
  (tableId: number) =>
  (dispatch: Dispatch): void => {
    dispatch({ type: "SET_SELECTED_TABLE_ID", tableId });
  };

export const setSelectedTableCellId =
  (cellId: number) =>
  (dispatch: Dispatch): void => {
    dispatch({ type: "SET_SELECTED_TABLE_CELL_ID", cellId });

    if (!!cellId) {
      dispatch(setSelectedListItemId(null));
    }
  };

export const addNewTableRow = (): OrgAction => ({
  type: "ADD_NEW_TABLE_ROW",
  dirtying: true,
});

export const removeTableRow = (): OrgAction => ({
  type: "REMOVE_TABLE_ROW",
  dirtying: true,
});

export const addNewTableColumn = (): OrgAction => ({
  type: "ADD_NEW_TABLE_COLUMN",
  dirtying: true,
});

export const removeTableColumn = (): OrgAction => ({
  type: "REMOVE_TABLE_COLUMN",
  dirtying: true,
});

export const moveTableRowDown = (): OrgAction => ({
  type: "MOVE_TABLE_ROW_DOWN",
  dirtying: true,
});

export const moveTableRowUp = (): OrgAction => ({
  type: "MOVE_TABLE_ROW_UP",
  dirtying: true,
});

export const moveTableColumnLeft = (): OrgAction => ({
  type: "MOVE_TABLE_COLUMN_LEFT",
  dirtying: true,
});

export const moveTableColumnRight = (): OrgAction => ({
  type: "MOVE_TABLE_COLUMN_RIGHT",
  dirtying: true,
});

export const updateTableCellValue = (
  cellId: number,
  newValue: string,
): OrgAction => ({
  type: "UPDATE_TABLE_CELL_VALUE",
  cellId,
  newValue,
  dirtying: true,
});

export const insertCapture =
  (templateId: number, content: string, shouldPrepend: boolean) =>
  (dispatch: Dispatch, getState): void => {
    dispatch(closePopup());

    const template = getState()
      .capture.get("captureTemplates")
      .concat(sampleCaptureTemplates)
      .find((template: string): boolean => template.get("id") === templateId);
    dispatch({
      type: "INSERT_CAPTURE",
      template,
      content,
      shouldPrepend,
      dirtying: true,
    });
  };

export const clearPendingCapture = (): OrgAction => ({
  type: "CLEAR_PENDING_CAPTURE",
});

export const insertPendingCapture =
  () =>
  (dispatch: Dispatch, getState): void => {
    const path = getState().org.present.get("path");
    const pendingCapture = getState().org.present.get("pendingCapture");
    const templateName = pendingCapture.get("captureTemplateName");
    const captureContent = pendingCapture.get("captureContent");
    const customCaptureVariables = pendingCapture.get("customCaptureVariables");

    dispatch(clearPendingCapture());
    window.history.pushState({}, "", window.location.pathname);

    const template = getState()
      .capture.get("captureTemplates")
      .filter(
        (template: string) =>
          template.get("isAvailableInAllOrgFiles") ||
          template
            .get("orgFilesWhereAvailable")
            .includes(getState().org.present.get("path")),
      )
      .find(
        (template: string): boolean =>
          template.get("description").trim() === templateName.trim(),
      );
    if (!template) {
      dispatch(
        setDisappearingLoadingMessage(
          `Capture failed: "${templateName}" template not found or not available in this file`,
          8000,
        ),
      );
      return;
    }

    const targetHeader = headerWithPath(
      getState().org.present.getIn(["files", path, "headers"]),
      template.get("headerPaths"),
    );
    if (!targetHeader) {
      dispatch(
        setDisappearingLoadingMessage(
          `Capture failed: "${template.get("description")}" header path invalid in this file`,
          8000,
        ),
      );
      return;
    }

    const [substitutedTemplate, initialCursorIndex] =
      substituteTemplateVariables(
        template.get("template"),
        customCaptureVariables,
      );

    const content = !!initialCursorIndex
      ? `${substitutedTemplate.substring(
          0,
          initialCursorIndex,
        )}${captureContent}${substitutedTemplate.substring(initialCursorIndex)}`
      : `${substitutedTemplate}${captureContent}`;

    dispatch(
      insertCapture(template.get("id"), content, template.get("shouldPrepend")),
    );
    dispatch(sync({ successMessage: "Item captured" }));
  };

export const advanceCheckboxState = (listItemId: number): OrgAction => ({
  type: "ADVANCE_CHECKBOX_STATE",
  listItemId,
  dirtying: true,
});

export const setSelectedListItemId =
  (listItemId: number) =>
  (dispatch: Dispatch): void => {
    dispatch({ type: "SET_SELECTED_LIST_ITEM_ID", listItemId });

    if (!!listItemId) {
      dispatch(selectHeader(null));
      dispatch(setSelectedTableCellId(null));
    }
  };

export const updateListTitleValue = (
  listItemId: number,
  newValue: string,
): OrgAction => ({
  type: "UPDATE_LIST_TITLE_VALUE",
  listItemId,
  newValue,
  dirtying: true,
});

export const updateListContentsValue = (
  listItemId: number,
  newValue: string,
): OrgAction => ({
  type: "UPDATE_LIST_CONTENTS_VALUE",
  listItemId,
  newValue,
  dirtying: true,
});

export const addNewListItem = (): OrgAction => ({
  type: "ADD_NEW_LIST_ITEM",
  dirtying: true,
});

export const selectNextSiblingListItem = (): OrgAction => ({
  type: "SELECT_NEXT_SIBLING_LIST_ITEM",
});

export const addNewListItemAndEdit =
  () =>
  (dispatch: Dispatch): void => {
    dispatch(addNewListItem());
    dispatch(selectNextSiblingListItem());
    dispatch(enterEditMode("list-title"));
  };

export const removeListItem = (): OrgAction => ({
  type: "REMOVE_LIST_ITEM",
  dirtying: true,
});

export const moveListItemUp = (): OrgAction => ({
  type: "MOVE_LIST_ITEM_UP",
  dirtying: true,
});

export const moveListItemDown = (): OrgAction => ({
  type: "MOVE_LIST_ITEM_DOWN",
  dirtying: true,
});

export const moveListItemLeft = (): OrgAction => ({
  type: "MOVE_LIST_ITEM_LEFT",
  dirtying: true,
});

export const moveListItemRight = (): OrgAction => ({
  type: "MOVE_LIST_ITEM_RIGHT",
  dirtying: true,
});

export const moveListSubtreeLeft = (): OrgAction => ({
  type: "MOVE_LIST_SUBTREE_LEFT",
  dirtying: true,
});

export const moveListSubtreeRight = (): OrgAction => ({
  type: "MOVE_LIST_SUBTREE_RIGHT",
  dirtying: true,
});

export const setHeaderTags = (
  headerId: number,
  tags: Array<string>,
): OrgAction => ({
  type: "SET_HEADER_TAGS",
  headerId,
  tags,
  dirtying: true,
});

export const reorderTags = (fromIndex: number, toIndex: number): OrgAction => ({
  type: "REORDER_TAGS",
  fromIndex,
  toIndex,
  dirtying: true,
});

export const reorderPropertyList =
  (fromIndex: number, toIndex: number) =>
  (
    dispatch: Dispatch,
    getState,
  ): {
    type: string;
    fromIndex: number;
    toIndex: number;
    headerId: number;
    dirtying: boolean;
  } =>
    dispatch({
      type: "REORDER_PROPERTY_LIST",
      fromIndex,
      toIndex,
      headerId: getState().base.getIn(["activePopup", "data", "headerId"]),
      dirtying: true,
    });

/**
 * Action to change the timestamp using a cross-cutting id.
 *
 * @param {*} timestampId cross-cutting id of the timestamp (might be in the title or description).
 * @param {*} newTimestamp the new value for the timestamp;
 *                         must have the form: {id:, type:, firstTimestamp:, secondTimestamp:}.
 */
export const updateTimestampWithId = (
  timestampId: number,
  newTimestamp: OrgTimestampPart,
): OrgAction => ({
  type: "UPDATE_TIMESTAMP_WITH_ID",
  timestampId,
  newTimestamp,
  dirtying: true,
});

export const updatePlanningItemTimestamp = (
  headerId: number,
  planningItemIndex: number,
  newTimestamp: OrgTimestampPart,
): OrgAction => ({
  type: "UPDATE_PLANNING_ITEM_TIMESTAMP",
  headerId,
  planningItemIndex,
  newTimestamp,
  dirtying: true,
});

export const addNewPlanningItem = (
  headerId: number,
  planningType: PlanningType,
): OrgAction => ({
  type: "ADD_NEW_PLANNING_ITEM",
  headerId,
  planningType,
  dirtying: true,
  timestamp: new Date(),
});

export const removePlanningItem = (
  headerId: number,
  planningItemIndex: number,
): OrgAction => ({
  type: "REMOVE_PLANNING_ITEM",
  headerId,
  planningItemIndex,
  dirtying: true,
});

export const removeTimestamp = (
  headerId: number,
  timestampId: number,
): OrgAction => ({
  type: "REMOVE_TIMESTAMP",
  headerId,
  timestampId,
  dirtying: true,
});

export const updatePropertyListItems = (
  headerId: number,
  newPropertyListItems: Array<string>,
): OrgAction => ({
  type: "UPDATE_PROPERTY_LIST_ITEMS",
  headerId,
  newPropertyListItems,
  dirtying: true,
});

export const setOrgFileErrorMessage = (message: string): OrgAction => ({
  type: "SET_ORG_FILE_ERROR_MESSAGE",
  message,
});

export const setLogEntryStop = (
  headerId: number,
  entryId: number,
  time: Date,
): OrgAction => ({
  type: "SET_LOG_ENTRY_STOP",
  headerId,
  entryId,
  time,
  dirtying: true,
});

export const createLogEntryStart = (
  headerId: number,
  time: Date,
): OrgAction => ({
  type: "CREATE_LOG_ENTRY_START",
  headerId,
  time,
  dirtying: true,
});

export const updateLogEntryTime = (
  headerId: number,
  entryIndex: number,
  entryType: LogEntryType,
  newTime: Date,
): OrgAction => ({
  type: "UPDATE_LOG_ENTRY_TIME",
  headerId,
  entryIndex,
  entryType,
  newTime,
  dirtying: true,
});

export const setSearchFilterInformation = (
  searchFilter: string,
  cursorPosition: number,
  context: Context,
): OrgAction => ({
  type: "SET_SEARCH_FILTER_INFORMATION",
  searchFilter,
  cursorPosition,
  context,
});

export const setShowClockDisplay = (showClockDisplay: boolean): OrgAction => ({
  type: "TOGGLE_CLOCK_DISPLAY",
  showClockDisplay,
});

export const updateFileSettingFieldPathValue = (
  settingId: number,
  fieldPath: string,
  newValue: string,
): OrgAction => ({
  type: "UPDATE_FILE_SETTING_FIELD_PATH_VALUE",
  settingId,
  fieldPath,
  newValue,
});

export const reorderFileSetting = (
  fromIndex: number,
  toIndex: number,
): OrgAction => ({
  type: "REORDER_FILE_SETTING",
  fromIndex,
  toIndex,
});

export const deleteFileSetting = (settingId: number): OrgAction => ({
  type: "DELETE_FILE_SETTING",
  settingId,
});

export const addNewEmptyFileSetting =
  () =>
  (dispatch: Dispatch): { type: string } =>
    dispatch({ type: "ADD_NEW_EMPTY_FILE_SETTING" });

export const restoreFileSettings = (
  newSettings: Record<string, string>,
): OrgAction => ({
  type: "RESTORE_FILE_SETTINGS",
  newSettings,
});

export const saveBookmark = (
  context: Context,
  bookmark: string,
): OrgAction => ({
  type: "SAVE_BOOKMARK",
  context,
  bookmark,
});

export const deleteBookmark = (
  context: Context,
  bookmark: string,
): OrgAction => ({
  type: "DELETE_BOOKMARK",
  context,
  bookmark,
});

export const addNewFile = (path: string, content: string): OrgAction => ({
  type: "ADD_NEW_FILE",
  path,
  content,
});
