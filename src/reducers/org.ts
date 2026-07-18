import { fromJS, List, Map, type MapOf } from "immutable";
import { isEmpty, times } from "lodash";
import {
  hasActiveClock,
  totalFilteredTimeLogged,
  updateHeadersTotalFilteredTimeLoggedRecursive,
  updateHeadersTotalTimeLoggedRecursive,
} from "../lib/clocking";
import {
  computeCompletionsForDatalist,
  isMatch,
  timeFilter,
} from "../lib/headline_filter";
import headline_filter_parser from "../lib/headline_filter_parser";
import type {
  Context,
  EditModeType,
  FileSetting,
  LogEntryType,
  OrgCookie,
  OrgFile,
  OrgHeadline,
  OrgList,
  OrgListItem,
  OrgPlanningItem,
  OrgPropertyListItem,
  OrgState,
  OrgTableCell,
  OrgTableRow,
  OrgTimestamp,
  OrgTimestampPart,
  OrgTodoKeywordSet,
  PlanningType,
  OrgAction,
  OrgCheckboxState,
} from "../types";

import {
  extractAllOrgProperties,
  extractAllOrgTags,
  getTodoKeywordSetsAsFlattenedArray,
  STATIC_FILE_PREFIX,
} from "../lib/org_utils";

import { attributedStringToRawText } from "../lib/export_org";
import generateId from "../lib/id_generator";
import {
  headerThatContainsListItemId,
  headerThatContainsTableCellId,
  headerWithPath,
  indexAndHeaderWithId,
  indexOfHeaderWithId,
  indexOfPreviousSibling,
  inheritedValueOfProperty,
  newEmptyTableCell,
  newEmptyTableRowLikeRows,
  newListItem,
  nextVisibleHeaderAfterIndex,
  numSubheadersOfHeaderWithId,
  openDirectParent,
  openHeaderWithPath,
  parentIdOfHeaderWithId,
  parentListItemWithIdInHeaders,
  pathAndPartOfListItemWithIdInHeaders,
  pathAndPartOfTimestampItemWithIdInHeaders,
  previousVisibleHeaderAfterIndex,
  subheaderIndicesOfHeaderWithId,
  subheadersOfHeaderWithId,
  todoKeywordSetForKeyword,
  updateContentsWithListItemAddition,
  updateListContainingListItemId,
  updateTableContainingCellId,
} from "../lib/org_utils";
import {
  _updateHeaderFromDescription,
  newHeaderFromText,
  newHeaderWithTitle,
  parseMarkupAndCookies,
  parseOrg,
  parseRawText,
  parseTitleLine,
  updatePlanningItems,
  updatePlanningItemsFromHeader,
} from "../lib/parse_org";
import {
  applyRepeater,
  getTimestampAsText,
  timestampForDate,
} from "../lib/timestamps";
import { formatTextWrap } from "../util/misc";
import { applyFileSettingsFromConfig } from "../util/settings_persister";

export const parseFile = (
  state: MapOf<OrgState>,
  action: {
    type: "PARSE_FILE";
    path: string;
    contents: string;
  },
): MapOf<OrgState> => {
  const { path, contents } = action;

  const parsedFile = parseOrg(contents);

  return state
    .setIn(["files", path, "headers"], parsedFile.get("headers"))
    .setIn(
      ["files", path, "todoKeywordSets"],
      parsedFile.get("todoKeywordSets"),
    )
    .setIn(
      ["files", path, "fileConfigLines"],
      parsedFile.get("fileConfigLines"),
    )
    .setIn(
      ["files", path, "linesBeforeHeadings"],
      parsedFile.get("linesBeforeHeadings"),
    )
    .setIn(["files", path, "activeClocks"], parsedFile.get("activeClocks"));
};

const clearSearch = (state: MapOf<OrgState>): MapOf<OrgState> =>
  state.setIn(["search", "filteredHeaders"], null);

const openHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "OPEN_HEADER";
    headerId: number;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);

  return state.setIn(["headers", headerIndex, "opened"], true);
};

const toggleHeaderOpened = (
  state: MapOf<OrgFile>,
  action: {
    type: "TOGGLE_HEADER_OPENED";
    headerId: number;
    closeSubheadersRecursively: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");

  const { header, headerIndex } = indexAndHeaderWithId(
    headers,
    action.headerId,
  );
  const isOpened = header.get("opened");

  if (isOpened && state.get("narrowedHeaderId") === action.headerId) {
    return state;
  }

  if (isOpened && action.closeSubheadersRecursively) {
    const subheaderIndices = subheaderIndicesOfHeaderWithId(
      headers,
      action.headerId,
    );
    subheaderIndices.forEach((index: number) => {
      state = state.setIn(["headers", index, "opened"], false);
    });
  }

  return state.setIn(["headers", headerIndex, "opened"], !isOpened);
};

const selectHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "SELECT_HEADER";
    headerId: number;
  },
): MapOf<OrgState> => {
  return state.set("selectedHeaderId", action.headerId);
};

const selectHeaderIndex = (
  state: MapOf<OrgFile>,
  action: {
    type: "SELECT_HEADER_INDEX";
    headerIndex: number;
  },
): MapOf<OrgState> => {
  return state.set("selectedHeaderIndex", action.headerIndex);
};

const openParentsOfHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "OPEN_PARENTS_OF_HEADER";
    headerId: number;
  },
): MapOf<OrgState> => {
  let headers = state.get("headers");
  const { headerId } = action;

  let parentHeaderId = parentIdOfHeaderWithId(headers, headerId);
  while (!!parentHeaderId) {
    const parentHeaderIndex = indexOfHeaderWithId(headers, parentHeaderId);
    headers = headers.setIn([parentHeaderIndex, "opened"], true);
    parentHeaderId = parentIdOfHeaderWithId(headers, parentHeaderId);
  }

  return state.set("headers", headers);
};

const updateCookiesInAttributedStringWithChildCompletionStates = (
  parts: List<MapOf<OrgCookie>>,
  completionStates: Array<boolean>,
): List<MapOf<OrgCookie>> => {
  const doneCount = completionStates.filter((isDone: boolean) => isDone).length;
  const totalCount = completionStates.length;

  return parts.map((part: MapOf<OrgCookie>) => {
    switch (part.get("type")) {
      case "fraction-cookie":
        return part.set("fraction", List([doneCount, totalCount]));
      case "percentage-cookie":
        return part.set(
          "percentage",
          Math.floor((doneCount / totalCount) * 100),
        );
      default:
        return part;
    }
  });
};

const updateCookiesOfHeaderWithId = (
  file: MapOf<OrgFile>,
  headerId: number,
) => {
  const headers = file.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, headerId);
  const subheaders = subheadersOfHeaderWithId(headers, headerId);

  const directChildren = [];
  for (let i = 0; i < subheaders.size; ++i) {
    const subheader = subheaders.get(i);
    directChildren.push(subheader);

    const subheaderSubheaders = subheadersOfHeaderWithId(
      headers,
      subheader.get("id"),
    );
    i += subheaderSubheaders.size;
  }

  let completionStates = directChildren
    .map((header: MapOf<OrgHeadline>) =>
      header.getIn(["titleLine", "todoKeyword"]),
    )
    .filter((todoKeyword) => !!todoKeyword)
    .map((todoKeyword) =>
      todoKeywordSetForKeyword(file.get("todoKeywordSets"), todoKeyword)
        .get("completedKeywords")
        .contains(todoKeyword),
    );

  // If there are no headers with possible completion states, check for plain lists instead.
  if (completionStates.length === 0) {
    completionStates = headers
      .get(headerIndex)
      .get("description")
      .filter((part) => part.get("type") === "list")
      .flatMap((listPart: MapOf<OrgList>) => listPart.get("items"))
      .filter((item) => item.get("isCheckbox"))
      .map((item) => item.get("checkboxState") === "checked")
      .toJS();
  }

  return file
    .updateIn(
      ["headers", headerIndex, "titleLine", "title"],
      (title: unknown) =>
        updateCookiesInAttributedStringWithChildCompletionStates(
          title,
          completionStates,
        ),
    )
    .updateIn(["headers", headerIndex, "titleLine"], (titleLine: unknown) =>
      titleLine.set(
        "rawTitle",
        attributedStringToRawText(titleLine.get("title")),
      ),
    );
};

const updateCookiesOfParentOfHeaderWithId = (
  file: MapOf<OrgFile>,
  headerId: number,
) => {
  const parentHeaderId = parentIdOfHeaderWithId(file.get("headers"), headerId);
  if (!parentHeaderId) {
    return file;
  }

  return updateCookiesOfHeaderWithId(file, parentHeaderId);
};

const advanceTodoState = (
  state: MapOf<OrgFile>,
  action: {
    type: "ADVANCE_TODO_STATE";
    headerId: number;
    logIntoDrawer: boolean;
    dirtying: boolean;
    timestamp: MapOf<OrgTimestamp>;
  },
): MapOf<OrgState> => {
  const { headerId, logIntoDrawer, timestamp } = action;
  const existingHeaderId = headerId || state.get("selectedHeaderId");
  if (!existingHeaderId) {
    return state;
  }

  const headers = state.get("headers");
  const { header, headerIndex } = indexAndHeaderWithId(
    headers,
    existingHeaderId,
  );

  const currentTodoState = header.getIn(["titleLine", "todoKeyword"]);
  const currentTodoSet = todoKeywordSetForKeyword(
    state.get("todoKeywordSets"),
    currentTodoState,
  );

  const currentStateIndex = currentTodoSet
    .get("keywords")
    .indexOf(currentTodoState);
  const newStateIndex = currentStateIndex + 1;
  const newTodoState = currentTodoSet.get("keywords").get(newStateIndex) || "";

  const indexedPlanningItemsWithRepeaters = header
    .get("planningItems")
    .map((planningItem: MapOf<OrgPlanningItem>, index: number) => [
      planningItem,
      index,
    ])
    .filter(
      ([planningItem]: [MapOf<OrgPlanningItem>]) =>
        !!planningItem.getIn(["timestamp", "repeaterType"]),
    );

  state = updateHeadlines({
    currentTodoSet,
    newTodoState,
    indexedPlanningItemsWithRepeaters,
    state,
    headerIndex,
    currentTodoState,
    logIntoDrawer,
    timestamp,
  });

  state = updateCookiesOfParentOfHeaderWithId(state, existingHeaderId);

  return state;
};

const setTodoState = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_TODO_STATE";
    newTodoState: string;
    headerId: number;
    logIntoDrawer: boolean;
    dirtying: boolean;
    timestamp: MapOf<OrgTimestamp>;
  },
): MapOf<OrgState> => {
  const { headerId, logIntoDrawer, newTodoState, timestamp } = action;
  const existingHeaderId = headerId || state.get("selectedHeaderId");
  if (!existingHeaderId) {
    return state;
  }

  const headers = state.get("headers");
  const { header, headerIndex } = indexAndHeaderWithId(
    headers,
    existingHeaderId,
  );

  const currentTodoState = header.getIn(["titleLine", "todoKeyword"]);
  const currentTodoSet = todoKeywordSetForKeyword(
    state.get("todoKeywordSets"),
    currentTodoState,
  );
  const newTodoSet = todoKeywordSetForKeyword(
    state.get("todoKeywordSets"),
    newTodoState,
  );
  const isInSameTodoSet = currentTodoSet === newTodoSet;

  if (isInSameTodoSet) {
    const indexedPlanningItemsWithRepeaters = header
      .get("planningItems")
      .map((planningItem: MapOf<OrgPlanningItem>, index: number) => [
        planningItem,
        index,
      ])
      .filter(
        ([planningItem]: [MapOf<OrgPlanningItem>]) =>
          !!planningItem.getIn(["timestamp", "repeaterType"]),
      );

    state = updateHeadlines({
      currentTodoSet,
      newTodoState,
      indexedPlanningItemsWithRepeaters,
      state,
      headerIndex,
      currentTodoState,
      logIntoDrawer,
      timestamp,
    });
  } else {
    state = state.setIn(
      ["headers", headerIndex, "titleLine", "todoKeyword"],
      newTodoState,
    );
  }

  state = updateCookiesOfParentOfHeaderWithId(state, existingHeaderId);

  return state;
};

const enterEditMode = (
  state: MapOf<OrgFile>,
  action: {
    type: "ENTER_EDIT_MODE";
    editModeType: EditModeType;
  },
): MapOf<OrgState> => state.set("editMode", action.editModeType);

const exitEditMode = (state: MapOf<OrgFile>) => state.set("editMode", null);

const updateHeaderTitle = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_HEADER_TITLE";
    newRawTitle: string;
    headerId: number;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);
  const todoKeywordSets = state.get("todoKeywordSets");

  const newTitleLine = parseTitleLine(
    action.newRawTitle.trim(),
    todoKeywordSets,
  );

  state = state.setIn(["headers", headerIndex, "titleLine"], newTitleLine);

  state = state.updateIn(
    ["headers", headerIndex, "planningItems"],
    (planningItems: List<MapOf<OrgPlanningItem>>) =>
      updatePlanningItems(
        planningItems,
        "TIMESTAMP_TITLE",
        newTitleLine.get("title"),
      ),
  );

  return updateCookiesOfParentOfHeaderWithId(state, action.headerId);
};

const updateHeaderDescription = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_HEADER_DESCRIPTION";
    headerId: number;
    newRawDescription: string;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);

  return state.updateIn(
    ["headers", headerIndex],
    (header: MapOf<OrgHeadline>) =>
      _updateHeaderFromDescription(header, action.newRawDescription),
  );
};

const addHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "ADD_HEADER";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const { header, headerIndex } = indexAndHeaderWithId(
    headers,
    action.headerId,
  );

  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);

  const todoKeyword = header.getIn(["titleLine", "todoKeyword"]);

  const newHeader = newHeaderWithTitle(
    todoKeyword ? todoKeyword + " " : "",
    header.get("nestingLevel"),
    state.get("todoKeywordSets"),
  );

  if (action.headerId === state.get("narrowedHeaderId")) {
    state = state.set("narrowedHeaderId", null);
  }

  return state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    headers.insert(headerIndex + subheaders.size + 1, newHeader),
  );
};

const duplicateHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "DUPLICATE_HEADER";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const { header: originalHeader, headerIndex: originalHeaderIndex } =
    indexAndHeaderWithId(headers, action.headerId);

  if (!originalHeader) {
    return state;
  }

  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);
  const headersToClone = [originalHeader].concat(subheaders.toJS());

  const clonedHeaders = headersToClone.map((header: MapOf<OrgHeadline>) => {
    // Deep clone and generate new ID
    return fromJS(header).set("id", generateId());
  });

  return state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    headers.splice(
      originalHeaderIndex + subheaders.size + 1,
      0,
      ...clonedHeaders,
    ),
  );
};

const createFirstHeader = (state: MapOf<OrgFile>) => {
  let newHeader = newHeaderWithTitle(
    "First header",
    1,
    state.get("todoKeywordSets"),
  );

  let description = "Extend the file from here";
  if (state.get("linesBeforeHeadings").size > 0) {
    description = state.get("linesBeforeHeadings").toJS().join("\n");

    state = state.set("linesBeforeHeadings", List());
  }

  newHeader = _updateHeaderFromDescription(newHeader, description);

  return state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    headers.insert(0, newHeader),
  );
};

const selectNextSiblingHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "SELECT_NEXT_SIBLING_HEADER";
    headerId: number;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const { header, headerIndex } = indexAndHeaderWithId(
    headers,
    action.headerId,
  );
  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);

  const nextSibling = headers.get(headerIndex + subheaders.size + 1);

  if (
    !nextSibling ||
    nextSibling.get("nestingLevel") !== header.get("nestingLevel")
  ) {
    return state;
  }

  return state.set("selectedHeaderId", nextSibling.get("id"));
};

const selectNextVisibleHeader = (state: MapOf<OrgFile>) => {
  const headers = state.get("headers");

  if (state.get("selectedHeaderId") === undefined) {
    return state.set("selectedHeaderId", headers.getIn([0, "id"]));
  }

  const headerIndex = indexOfHeaderWithId(
    headers,
    state.get("selectedHeaderId"),
  );

  const nextVisibleHeader = nextVisibleHeaderAfterIndex(headers, headerIndex);

  if (!nextVisibleHeader) {
    return state;
  }

  return state.set("selectedHeaderId", nextVisibleHeader.get("id"));
};

const selectPreviousVisibleHeader = (state: MapOf<OrgFile>) => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(
    headers,
    state.get("selectedHeaderId"),
  );

  const previousVisibleHeader = previousVisibleHeaderAfterIndex(
    headers,
    headerIndex,
  );

  if (!previousVisibleHeader) {
    return state;
  }

  return state.set("selectedHeaderId", previousVisibleHeader.get("id"));
};

const removeHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "REMOVE_HEADER";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  let headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);

  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);
  const numHeadersToRemove = 1 + subheaders.size;

  const parentHeaderId = parentIdOfHeaderWithId(headers, action.headerId);

  times(numHeadersToRemove).forEach(() => {
    headers = headers.delete(headerIndex);
  });

  if (action.headerId === state.get("narrowedHeaderId")) {
    state = state.set("narrowedHeaderId", null);
  }

  state = state.set("headers", headers);

  if (parentHeaderId) {
    state = updateCookiesOfHeaderWithId(state, parentHeaderId);
  }

  return state;
};

const moveHeaderUp = (
  state: MapOf<OrgFile>,
  action: {
    type: "MOVE_HEADER_UP";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  let headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);

  const previousSiblingIndex = indexOfPreviousSibling(headers, headerIndex);
  if (previousSiblingIndex === null) {
    return state;
  }

  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);
  times(1 + subheaders.size).forEach(() => {
    headers = headers.insert(
      previousSiblingIndex,
      headers.get(headerIndex + subheaders.size),
    );
    headers = headers.delete(headerIndex + subheaders.size + 1);
  });

  return state.set("headers", headers);
};

const moveHeaderDown = (
  state: MapOf<OrgFile>,
  action: {
    type: "MOVE_HEADER_DOWN";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  let headers = state.get("headers");
  const { header, headerIndex } = indexAndHeaderWithId(
    headers,
    action.headerId,
  );

  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);
  const nextSiblingIndex = headerIndex + subheaders.size + 1;
  const nextSibling = headers.get(nextSiblingIndex);
  if (
    !nextSibling ||
    nextSibling.get("nestingLevel") < header.get("nestingLevel")
  ) {
    return state;
  }

  const nextSiblingSubheaders = subheadersOfHeaderWithId(
    headers,
    nextSibling.get("id"),
  );
  times(1 + nextSiblingSubheaders.size).forEach(() => {
    headers = headers.insert(
      headerIndex,
      headers.get(nextSiblingIndex + nextSiblingSubheaders.size),
    );
    headers = headers.delete(nextSiblingIndex + nextSiblingSubheaders.size + 1);
  });

  return state.set("headers", headers);
};

const moveHeaderLeft = (
  state: MapOf<OrgFile>,
  action: {
    type: "MOVE_HEADER_LEFT";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);

  const previousParentHeaderId = parentIdOfHeaderWithId(
    headers,
    action.headerId,
  );

  state = shiftTreeNestingLevel({ state, headerIndex }, "-");
  state = updateCookies(state, previousParentHeaderId, action);

  return state;
};

const moveHeaderRight = (
  state: MapOf<OrgFile>,
  action: {
    type: "MOVE_HEADER_RIGHT";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);

  const previousParentHeaderId = parentIdOfHeaderWithId(
    headers,
    action.headerId,
  );

  state = shiftTreeNestingLevel({ state, headerIndex }, "+");
  state = openDirectParent(state, action.headerId);
  state = updateCookies(state, previousParentHeaderId, action);

  return state;
};

const moveSubtreeLeft = (
  state: MapOf<OrgFile>,
  action: {
    type: "MOVE_SUBTREE_LEFT";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const { header, headerIndex } = indexAndHeaderWithId(
    headers,
    action.headerId,
  );

  const previousParentHeaderId = parentIdOfHeaderWithId(
    headers,
    action.headerId,
  );

  if (header.get("nestingLevel") === 1) {
    return state;
  }

  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);

  state = shiftTreeNestingLevel({ state, headerIndex, subheaders }, "-");
  state = updateCookies(state, previousParentHeaderId, action);

  return state;
};

const moveSubtreeRight = (
  state: MapOf<OrgFile>,
  action: {
    type: "MOVE_SUBTREE_RIGHT";
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);

  const previousParentHeaderId = parentIdOfHeaderWithId(
    headers,
    action.headerId,
  );

  const subheaders = subheadersOfHeaderWithId(headers, action.headerId);

  state = shiftTreeNestingLevel({ state, headerIndex, subheaders }, "+");
  state = updateCookies(state, previousParentHeaderId, action);

  return openDirectParent(state, action.headerId);
};

const moveItemInFile = ({
  fromList,
  fromIndex,
  toIndex,
  item,
}: {
  fromList: List<any>;
  fromIndex: number;
  toIndex: number;
}) => {
  const targetItem = fromList.get(toIndex);
  fromList = fromList.delete(fromIndex);
  const targetIndex = fromList.indexOf(targetItem);
  fromList = fromList.insert(targetIndex + 1, item);
  return [fromList, fromList];
};

const moveItemAcrossFiles = ({
  fromList,
  fromIndex,
  toList,
  toIndex,
  item,
}: {
  fromList: List<any>;
  fromIndex: number;
  toList: List<any>;
  toIndex: number;
}) => {
  const targetItem = toList.get(toIndex);
  fromList = fromList.delete(fromIndex);
  const targetIndex = toList.indexOf(targetItem);
  toList = toList.insert(targetIndex + 1, item);
  return [fromList, toList];
};

const refileSubtree = (
  state: MapOf<OrgState>,
  action: {
    type: "REFILE_SUBTREE";
    sourcePath: string;
    sourceHeaderId: number;
    targetPath: string;
    targetHeaderId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const { sourcePath, sourceHeaderId, targetPath, targetHeaderId } = action;
  const moveItem =
    sourcePath === targetPath ? moveItemInFile : moveItemAcrossFiles;
  let sourceHeaders = state.getIn(["files", sourcePath, "headers"]);
  let targetHeaders = state.getIn(["files", targetPath, "headers"]);
  let { header: sourceHeader, headerIndex: sourceHeaderIndex } =
    indexAndHeaderWithId(sourceHeaders, sourceHeaderId);
  let targetHeaderIndex = indexOfHeaderWithId(targetHeaders, targetHeaderId);

  let subheadersOfSourceHeader = subheadersOfHeaderWithId(
    sourceHeaders,
    sourceHeaderId,
  );

  const nestingLevelSource = sourceHeaders.getIn([
    sourceHeaderIndex,
    "nestingLevel",
  ]);
  const nestingLevelTarget = targetHeaders.getIn([
    targetHeaderIndex,
    "nestingLevel",
  ]);

  // Indent the newly placed sourceheader so that it fits underneath the targetHeader
  sourceHeader = sourceHeader.set("nestingLevel", nestingLevelTarget + 1);

  // Put the sourceHeader into the right slot after the targetHeader
  [sourceHeaders, targetHeaders] = moveItem({
    fromList: sourceHeaders,
    fromIndex: sourceHeaderIndex,
    toList: targetHeaders,
    toIndex: targetHeaderIndex,
    item: sourceHeader,
  });

  // Put the subheaders of the sourceHeader right after
  subheadersOfSourceHeader.forEach(
    (subheader: MapOf<OrgHeadline>, index: number) => {
      subheader = subheader.set(
        "nestingLevel",
        // target
        // 1
        //   source
        //   2 (1)
        //     subheader
        //      3 (2)
        //       subheader
        //       4 (3)
        subheader.get("nestingLevel") -
          nestingLevelSource +
          nestingLevelTarget +
          1,
      );
      const fromIndex = indexOfHeaderWithId(sourceHeaders, subheader.get("id"));

      targetHeaderIndex = indexOfHeaderWithId(targetHeaders, targetHeaderId);
      const toIndex = targetHeaderIndex + index + 1;

      [sourceHeaders, targetHeaders] = moveItem({
        fromList: sourceHeaders,
        fromIndex,
        toList: targetHeaders,
        toIndex,
        item: subheader,
      });
    },
  );

  state = state.setIn(["files", sourcePath, "headers"], sourceHeaders);
  state = state.setIn(["files", targetPath, "headers"], targetHeaders);

  state = state.updateIn(["files", sourcePath], (file: MapOf<OrgFile>) =>
    updateCookies(file, sourceHeaderId, action),
  );
  state = state.updateIn(["files", targetPath], (file: MapOf<OrgFile>) =>
    updateCookies(file, targetHeaderId, action),
  );

  return state;
};

// Add a log note to the selected header. This can be any type of log
// note as defined in the Emacs Org mode variable
// `org-log-note-headings`.
const addNoteGeneric = (state: MapOf<OrgState>, action): MapOf<OrgState> => {
  const { noteText } = action;

  const headerId = state.get("selectedHeaderId");
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, headerId);
  return state.updateIn(
    ["headers", headerIndex],
    (header: MapOf<OrgHeadline>) => {
      const updatedHeader = header.update("logNotes", (logNotes) =>
        parseRawText(noteText + (logNotes.isEmpty() ? "\n" : "")).concat(
          logNotes,
        ),
      );
      return updatedHeader.set(
        "planningItems",
        updatePlanningItemsFromHeader(updatedHeader),
      );
    },
  );
};

// See Emacs Org mode `org-add-note` (C-c C-z) and variable
// `org-log-note-headings`.
const addNote = (
  state: MapOf<OrgFile>,
  action: {
    type: "HEADER_ADD_NOTE";
    inputText: string;
    currentDate: Date;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const { inputText, currentDate } = action;
  // Wrap line at 70 characters, see Emacs `fill-column` in "Insert
  // note" window (C-c C-z)
  const wrappedInput = formatTextWrap(inputText, 70).replace(
    /\n(.)/g,
    "\n  $1",
  );
  // Generate note based on a template string (as defined in Emacs Org
  // mode `org-log-note-headings`):
  const timestamp = getTimestampAsText(currentDate, {
    isActive: false,
    withStartTime: true,
  });
  const noteText = `- Note taken on ${timestamp} \\\\\n  ${wrappedInput}`;
  return addNoteGeneric(state, { noteText });
};

const narrowHeader = (
  state: MapOf<OrgFile>,
  action: {
    type: "NARROW_HEADER";
    headerId: number;
  },
): MapOf<OrgState> => {
  return state.set("narrowedHeaderId", action.headerId);
};

const widenHeader = (state: MapOf<OrgFile>) =>
  state.set("narrowedHeaderId", null);

const applyOpennessState = (
  state: MapOf<OrgState>,
  action: {
    type: "APPLY_OPENNESS_STATE";
    path: string;
  },
): MapOf<OrgState> => {
  const { path } = action;
  const opennessState = state.get("opennessState");
  if (!opennessState) {
    return state;
  }

  const fileOpennessState = opennessState.get(path);
  if (!fileOpennessState || fileOpennessState.size === 0) {
    return state;
  }

  let headers = state.getIn(["files", path, "headers"]);
  fileOpennessState.forEach((openHeaderPath: string) => {
    headers = openHeaderWithPath(headers, openHeaderPath);
  });

  return state.setIn(["files", path, "headers"], headers);
};

const setOpennessState = (
  state: MapOf<OrgState>,
  action: {
    type: "SET_OPENNESS_STATE";
    path: string;
    opennessState: boolean;
  },
): MapOf<OrgState> => {
  const { path, opennessState } = action;
  return state.setIn(["opennessState", path], fromJS(opennessState));
};

const setDirty = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_DIRTY";
    isDirty: boolean;
    path: string;
  },
): MapOf<OrgFile> => state.set("isDirty", action.isDirty);

const setSelectedTableId = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_SELECTED_TABLE_ID";
    tableId: number;
  },
): MapOf<OrgState> => state.set("selectedTableId", action.tableId);

const setSelectedDescriptionItemIndex = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_SELECTED_DESCRIPTION_ITEM_INDEX";
    itemIndex: number;
  },
): MapOf<OrgState> =>
  state.set("selectedDescriptionItemIndex", action.itemIndex);

const setSelectedTableCellId = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_SELECTED_TABLE_CELL_ID";
    cellId: number;
  },
): MapOf<OrgState> => state.set("selectedTableCellId", action.cellId);

const updateDescriptionOfHeaderContainingTableCell = (
  state: MapOf<OrgState>,
  cellId: number,
  header: MapOf<OrgHeadline> = null,
) => {
  const headers = state.get("headers");
  if (!header) {
    header = headerThatContainsTableCellId(headers, cellId);
  }
  const headerIndex = indexOfHeaderWithId(headers, header.get("id"));

  return state.updateIn(
    ["headers", headerIndex],
    (header: MapOf<OrgHeadline>) =>
      header.set(
        "rawDescription",
        attributedStringToRawText(header.get("description")),
      ),
  );
};

const addNewTableRow = (state: MapOf<OrgFile>) => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  let newState = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (rowIndex: number) => (rows: List<MapOf<OrgTableRow>>) =>
        rows.insert(rowIndex + 1, newEmptyTableRowLikeRows(rows)),
    ),
  );

  return updateDescriptionOfHeaderContainingTableCell(
    newState,
    selectedTableCellId,
  );
};

const removeTableRow = (state: MapOf<OrgFile>) => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  const containingHeader = headerThatContainsTableCellId(
    state.get("headers"),
    selectedTableCellId,
  );

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (rowIndex: number) => (rows: List<MapOf<OrgTableRow>>) =>
        rows.delete(rowIndex),
    ),
  );

  state = state.set("selectedTableCellId", null);

  return updateDescriptionOfHeaderContainingTableCell(
    state,
    selectedTableCellId,
    containingHeader,
  );
};

const addNewTableColumn = (state: MapOf<OrgFile>) => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (_rowIndex: number, colIndex: number) =>
        (rows: List<MapOf<OrgTableRow>>) =>
          rows.map((row: MapOf<OrgTableRow>) =>
            row.update("contents", (contents: List<OrgTableCell>) =>
              contents.insert(colIndex + 1, newEmptyTableCell()),
            ),
          ),
    ),
  );

  return updateDescriptionOfHeaderContainingTableCell(
    state,
    selectedTableCellId,
  );
};

const removeTableColumn = (state: MapOf<OrgFile>): MapOf<OrgState> => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  const containingHeader = headerThatContainsTableCellId(
    state.get("headers"),
    selectedTableCellId,
  );

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (_rowIndex: number, colIndex: number) =>
        (rows: List<MapOf<OrgTableRow>>) =>
          rows.map((row: MapOf<OrgTableRow>) =>
            row.update("contents", (contents: List<OrgTableCell>) =>
              contents.delete(colIndex),
            ),
          ),
    ),
  );

  state = state.set("selectedTableCellId", null);

  return updateDescriptionOfHeaderContainingTableCell(
    state,
    selectedTableCellId,
    containingHeader,
  );
};

const moveTableRowDown = (state: MapOf<OrgFile>): MapOf<OrgState> => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (rowIndex: number) => (rows: List<MapOf<OrgTableRow>>) =>
        rowIndex + 1 === rows.size
          ? rows
          : rows.insert(rowIndex, rows.get(rowIndex + 1)).delete(rowIndex + 2),
    ),
  );

  return updateDescriptionOfHeaderContainingTableCell(
    state,
    selectedTableCellId,
  );
};

const moveTableRowUp = (state: MapOf<OrgFile>): MapOf<OrgState> => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (rowIndex: number) => (rows: List<MapOf<OrgTableRow>>) =>
        rowIndex === 0
          ? rows
          : rows.insert(rowIndex - 1, rows.get(rowIndex)).delete(rowIndex + 1),
    ),
  );

  return updateDescriptionOfHeaderContainingTableCell(
    state,
    selectedTableCellId,
  );
};

const moveTableColumnLeft = (state: MapOf<OrgFile>) => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (_rowIndex: number, columnIndex: number) =>
        (rows: List<MapOf<OrgTableRow>>) =>
          columnIndex === 0
            ? rows
            : rows.map((row: MapOf<OrgTableRow>) =>
                row.update("contents", (contents: List<OrgTableCell>) =>
                  contents.size === 0
                    ? contents
                    : contents
                        .insert(columnIndex - 1, contents.get(columnIndex))
                        .delete(columnIndex + 1),
                ),
              ),
    ),
  );

  return updateDescriptionOfHeaderContainingTableCell(
    state,
    selectedTableCellId,
  );
};

const moveTableColumnRight = (state: MapOf<OrgFile>) => {
  const selectedTableCellId = state.get("selectedTableCellId");
  if (!selectedTableCellId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      selectedTableCellId,
      (_rowIndex: number, columnIndex: number) =>
        (rows: List<MapOf<OrgTableRow>>) =>
          columnIndex + 1 >= rows.getIn([0, "contents"]).size
            ? rows
            : rows.map((row: MapOf<OrgTableRow>) =>
                row.update("contents", (contents: List<OrgTableCell>) =>
                  contents.size === 0
                    ? contents
                    : contents
                        .insert(columnIndex, contents.get(columnIndex + 1))
                        .delete(columnIndex + 2),
                ),
              ),
    ),
  );

  return updateDescriptionOfHeaderContainingTableCell(
    state,
    selectedTableCellId,
  );
};

const updateTableCellValue = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_TABLE_CELL_VALUE";
    cellId: number;
    newValue: string;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateTableContainingCellId(
      headers,
      action.cellId,
      (rowIndex: number, colIndex: number) =>
        (rows: List<MapOf<OrgTableRow>>) =>
          rows.updateIn(
            [rowIndex, "contents", colIndex],
            (cell: MapOf<OrgTableCell>) =>
              cell.set("rawContents", action.newValue).set(
                "contents",
                fromJS(
                  parseMarkupAndCookies(action.newValue, {
                    excludeCookies: true,
                  }),
                ),
              ),
          ),
    ),
  );

  return updateDescriptionOfHeaderContainingTableCell(state, action.cellId);
};

const insertCapture = (state: MapOf<OrgState>, action): MapOf<OrgState> => {
  const headers = state.get("headers");
  const { template, content, shouldPrepend } = action;

  const { newIndex, nestingLevel, parentHeader } = insertCapturePosition(
    template,
    headers,
    shouldPrepend,
  );
  if (newIndex === undefined) {
    // Should never happen; see comment in insertCapturePosition below.
    return state;
  }

  const newHeader = newHeaderFromText(
    content,
    state.get("todoKeywordSets"),
  ).set("nestingLevel", nestingLevel);

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    headers.insert(newIndex, newHeader),
  );
  if (parentHeader !== undefined) {
    // We inserted the new header under a parent rather than at the top or
    // bottom of the file.
    state = updateCookiesOfHeaderWithId(state, parentHeader.get("id"));
  }

  return state;
};

const insertCapturePosition = (
  template: string,
  headers: List<MapOf<OrgHeadline>>,
  shouldPrepend: boolean,
) => {
  const headerPaths = template.get("headerPaths");
  if (headerPaths.size === 0) {
    if (shouldPrepend) {
      // Insert at beginning of file
      return { newIndex: 0, nestingLevel: 1 };
    } else {
      // Insert at end of file
      return { newIndex: headers.size + 1, nestingLevel: 1 };
    }
  }

  const parentHeader = headerWithPath(headers, headerPaths);
  if (parentHeader == null) {
    // No parent header found.  In theory this shouldn't happen since
    // CaptureModal already checks whether a valid targetHeader can be
    // found if headerPaths is non-empty.
    return {};
  }
  const parentHeaderIndex = indexOfHeaderWithId(
    headers,
    parentHeader.get("id"),
  );
  const numSubheaders = numSubheadersOfHeaderWithId(
    headers,
    parentHeader.get("id"),
  );
  const newIndex = parentHeaderIndex + 1 + (shouldPrepend ? 0 : numSubheaders);
  const nestingLevel = parentHeader.get("nestingLevel") + 1;
  return { newIndex, nestingLevel, parentHeader };
};

const clearPendingCapture = (state: MapOf<OrgState>) =>
  state.set("pendingCapture", null);

const updateParentListCheckboxes = (
  state: MapOf<OrgState>,
  itemPath: string,
) => {
  const parentListItemPath = itemPath.slice(0, itemPath.length - 4);
  const parentListItem = state.getIn(parentListItemPath);
  if (!parentListItem.get("isCheckbox")) {
    return state;
  }

  const childrenCheckedStates = parentListItem
    .get("contents")
    .filter((part) => part.get("type") === "list")
    .flatMap((listPart: MapOf<OrgList>) =>
      listPart
        .get("items")
        .filter((item) => item.get("isCheckbox"))
        .map((checkboxItem) => checkboxItem.get("checkboxState")),
    );

  if (
    childrenCheckedStates.every(
      (state: OrgCheckboxState) => state === "checked",
    )
  ) {
    state = state.setIn(
      parentListItemPath.concat(["checkboxState"]),
      "checked",
    );
  } else if (
    childrenCheckedStates.every(
      (state: MapOf<OrgState>) => state === "unchecked",
    )
  ) {
    state = state.setIn(
      parentListItemPath.concat(["checkboxState"]),
      "unchecked",
    );
  } else {
    state = state.setIn(
      parentListItemPath.concat(["checkboxState"]),
      "partial",
    );
  }

  const childCompletionStates = childrenCheckedStates
    .map((state: OrgCheckboxState) => {
      switch (state) {
        case "checked":
          return true;
        case "unchecked":
          return false;
        case "partial":
          return false;
        default:
          if (process.env.NODE_ENV !== "production") {
            throw Error("Unexpected checkboxState: '" + state + "'");
          } else {
            return false;
          }
      }
    })
    .toJS();

  state = state.updateIn(
    parentListItemPath.concat("titleLine"),
    (titleLine: unknown) =>
      updateCookiesInAttributedStringWithChildCompletionStates(
        titleLine,
        childCompletionStates,
      ),
  );

  return updateParentListCheckboxes(state, parentListItemPath);
};

const advanceCheckboxState = (
  state: MapOf<OrgFile>,
  action: {
    type: "ADVANCE_CHECKBOX_STATE";
    listItemId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
    state.get("headers"),
    action.listItemId,
  );
  const { path, listItemPart } = pathAndPart;

  const hasDirectCheckboxChildren = listItemPart
    .get("contents")
    .filter((part) => part.get("type") === "list")
    .some((listPart: MapOf<OrgList>) =>
      listPart.get("items").some((item) => item.get("isCheckbox")),
    );
  if (hasDirectCheckboxChildren) {
    return state;
  }

  const newCheckboxState = {
    checked: "unchecked",
    unchecked: "checked",
    partial: "unchecked",
  }[listItemPart.get("checkboxState")];

  state = state.setIn(
    ["headers"].concat(path).concat(["checkboxState"]),
    newCheckboxState,
  );
  state = updateParentListCheckboxes(state, ["headers"].concat(path));

  const headerIndex = path[0];
  state = updateCookiesOfHeaderWithId(
    state,
    state.getIn(["headers", headerIndex, "id"]),
  );
  state = state.updateIn(
    ["headers", headerIndex],
    (header: MapOf<OrgHeadline>) =>
      header.set(
        "rawDescription",
        attributedStringToRawText(header.get("description")),
      ),
  );

  return state;
};

const setSelectedListItemId = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_SELECTED_LIST_ITEM_ID";
    listItemId: number;
  },
): MapOf<OrgState> => state.set("selectedListItemId", action.listItemId);

const updateDescriptionOfHeaderContainingListItem = (
  state: MapOf<OrgState>,
  listItemId: number,
  header = null,
) => {
  let headerIndex = -1;
  const headers = state.get("headers");
  if (!header) {
    const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
      headers,
      listItemId,
    );
    headerIndex = pathAndPart.path[0];
  } else {
    headerIndex = indexOfHeaderWithId(headers, header.get("id"));
  }

  if (headerIndex >= 0) {
    return state.updateIn(
      ["headers", headerIndex],
      (header: MapOf<OrgHeadline>) =>
        header.set(
          "rawDescription",
          attributedStringToRawText(header.get("description")),
        ),
    );
  } else {
    return state;
  }
};

const updateListTitleValue = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_LIST_TITLE_VALUE";
    listItemId: number;
    newValue: string;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const selectedListItemId = action.listItemId;
  if (!selectedListItemId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items) =>
        items.updateIn([itemIndex], (item) =>
          item.set("titleLine", fromJS(parseMarkupAndCookies(action.newValue))),
        ),
    ),
  );

  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const updateListContentsValue = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_LIST_CONTENTS_VALUE";
    listItemId: number;
    newValue: string;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const selectedListItemId = action.listItemId;
  if (!selectedListItemId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items) =>
        items.updateIn([itemIndex], (item) =>
          item.set("contents", fromJS(parseRawText(action.newValue))),
        ),
    ),
  );

  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const addNewListItem = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
    state.get("headers"),
    selectedListItemId,
  );

  let newItem = newListItem();
  if (pathAndPart.listItemPart.get("isCheckbox")) {
    newItem = newItem.set("isCheckbox", true).set("checkboxState", "unchecked");
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items) => items.insert(itemIndex + 1, newItem),
    ),
  );
  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const selectNextSiblingListItem = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
    state.get("headers"),
    selectedListItemId,
  );
  let { path } = pathAndPart;
  path[path.length - 1] = path[path.length - 1] + 1;

  state = state.set(
    "selectedListItemId",
    state.getIn(["headers"].concat(path).concat("id")),
  );

  return state;
};

const removeListItem = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  const containingHeader = headerThatContainsListItemId(
    state.get("headers"),
    selectedListItemId,
  );

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items) => items.delete(itemIndex),
    ),
  );

  state = state.set("selectedListItemId", null);

  return updateDescriptionOfHeaderContainingListItem(
    state,
    selectedListItemId,
    containingHeader,
  );
};

const moveListItemUp = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items) =>
        itemIndex === 0
          ? items
          : items
              .insert(itemIndex - 1, items.get(itemIndex))
              .delete(itemIndex + 1),
    ),
  );
  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const moveListItemDown = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items) =>
        itemIndex + 1 === items.size
          ? items
          : items
              .insert(itemIndex, items.get(itemIndex + 1))
              .delete(itemIndex + 2),
    ),
  );

  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const moveListItemLeft = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
    state.get("headers"),
    selectedListItemId,
  );

  const hasChildrenItem = pathAndPart.listItemPart
    .get("contents")
    .filter((part) => part.get("type") === "list")
    .some((listPart: MapOf<OrgList>) => listPart.get("items").size > 0);
  if (hasChildrenItem) {
    return state;
  }
  return moveListSubtreeLeft(state);
};

const moveListItemRight = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
    state.get("headers"),
    selectedListItemId,
  );
  let { path, listItemPart: selectedListItem } = pathAndPart;
  const listPart = state.getIn(
    ["headers"].concat(path.slice(0, path.length - 2)),
  );
  const prevSiblingItemIndex = path[path.length - 1] - 1;

  if (prevSiblingItemIndex < 0) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items) => items.delete(itemIndex),
    ),
  );

  const prevSiblingItemContentsPath = ["headers"]
    .concat(path.slice(0, path.length - 1))
    .concat(prevSiblingItemIndex)
    .concat("contents");

  const childrenListParts = selectedListItem
    .get("contents")
    .filter((part) => part.get("type") === "list");

  selectedListItem = selectedListItem.update("contents", (contents: string) =>
    contents.filter((part) => part.get("type") !== "list"),
  );

  state = state.updateIn(prevSiblingItemContentsPath, (contents: string) =>
    updateContentsWithListItemAddition(contents, selectedListItem, listPart),
  );

  childrenListParts.map((listPart: MapOf<OrgList>) =>
    listPart.get("items").forEach((item: MapOf<OrgListItem>) => {
      state = state.updateIn(prevSiblingItemContentsPath, (contents: string) =>
        updateContentsWithListItemAddition(contents, item, listPart),
      );
    }),
  );

  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const moveListSubtreeLeft = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
    state.get("headers"),
    selectedListItemId,
  );
  let { path, listItemPart: selectedListItem } = pathAndPart;
  const selectedListItemIndex = path[path.length - 1];
  if (path.filter((partOfPath: string) => partOfPath === "items").length < 2) {
    return state;
  }

  const parentListItem = parentListItemWithIdInHeaders(
    state.getIn(["headers"]),
    selectedListItemId,
  );

  parentListItem
    .get("contents")
    .filter((part) => part.get("type") === "list")
    .map((listPart: MapOf<OrgList>) =>
      listPart
        .get("items")
        .forEach((item: MapOf<OrgListItem>, itemIndex: number) => {
          if (itemIndex > selectedListItemIndex) {
            selectedListItem = selectedListItem.update(
              "contents",
              (contents: string) =>
                updateContentsWithListItemAddition(contents, item, listPart),
            );
          }
        }),
    );

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      () => (items: List<MapOf<OrgListItem>>) =>
        items.filter(
          (_item: MapOf<OrgListItem>, index: number) =>
            index < selectedListItemIndex,
        ),
    ),
  );

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      parentListItem.get("id"),
      (itemIndex: number) => (items: List<MapOf<OrgListItem>>) =>
        items.insert(itemIndex + 1, selectedListItem),
    ),
  );

  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const moveListSubtreeRight = (state: MapOf<OrgFile>) => {
  const selectedListItemId = state.get("selectedListItemId");
  if (!selectedListItemId) {
    return state;
  }

  const pathAndPart = pathAndPartOfListItemWithIdInHeaders(
    state.get("headers"),
    selectedListItemId,
  );
  const { path, listItemPart: selectedListItem } = pathAndPart;
  const listPart = state.getIn(
    ["headers"].concat(path.slice(0, path.length - 2)),
  );
  const prevSiblingItemIndex = path[path.length - 1] - 1;
  if (prevSiblingItemIndex < 0) {
    return state;
  }

  state = state.update("headers", (headers: List<MapOf<OrgHeadline>>) =>
    updateListContainingListItemId(
      headers,
      selectedListItemId,
      (itemIndex: number) => (items: List<MapOf<OrgListItem>>) =>
        itemIndex === 0 ? items : items.delete(itemIndex),
    ),
  );

  state = state.updateIn(
    ["headers"]
      .concat(path.slice(0, path.length - 1))
      .concat(prevSiblingItemIndex)
      .concat("contents"),
    (contents: string) =>
      updateContentsWithListItemAddition(contents, selectedListItem, listPart),
  );

  return updateDescriptionOfHeaderContainingListItem(state, selectedListItemId);
};

const setLastSyncAt = (
  state: MapOf<OrgState>,
  action: {
    type: "SET_LAST_SYNC_AT";
    path: string;
    lastSyncAt: Date;
  },
): MapOf<OrgState> => state.set("lastSyncAt", action.lastSyncAt);

const setHeaderTags = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_HEADER_TAGS";
    headerId: number;
    tags: Array<string>;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headers = state.get("headers");
  const headerIndex = indexOfHeaderWithId(headers, action.headerId);
  if (headerIndex === -1) {
    return state;
  }

  return state.setIn(
    ["headers", headerIndex, "titleLine", "tags"],
    action.tags,
  );
};

const reorderTags = (
  state: MapOf<OrgFile>,
  action: {
    type: "REORDER_TAGS";
    fromIndex: number;
    toIndex: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const selectedHeaderId = state.get("selectedHeaderId");
  if (!selectedHeaderId) {
    return state;
  }
  const headerIndex = indexOfHeaderWithId(
    state.get("headers"),
    selectedHeaderId,
  );

  return state.updateIn(
    ["headers", headerIndex, "titleLine", "tags"],
    (tags: List<string>) =>
      tags
        .splice(action.fromIndex, 1)
        .splice(action.toIndex, 0, tags.get(action.fromIndex)),
  );
};

const reorderPropertyList = (
  state: MapOf<OrgFile>,
  action: {
    type: "REORDER_PROPERTY_LIST";
    fromIndex: number;
    toIndex: number;
    headerId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headerId = action.headerId;
  if (!headerId) {
    return state;
  }
  const headerIndex = indexOfHeaderWithId(state.get("headers"), headerId);

  return state.updateIn(
    ["headers", headerIndex, "propertyListItems"],
    (propertyListItems: List<MapOf<OrgPropertyListItem>>) =>
      propertyListItems
        .splice(action.fromIndex, 1)
        .splice(action.toIndex, 0, propertyListItems.get(action.fromIndex)),
  );
};

const updateTimestampWithId = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_TIMESTAMP_WITH_ID";
    timestampId: number;
    newTimestamp: OrgTimestampPart;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const pathAndPart = pathAndPartOfTimestampItemWithIdInHeaders(
    state.get("headers"),
    action.timestampId,
  );
  if (!pathAndPart) {
    return state;
  }

  const { path } = pathAndPart;
  const headerIndex = path[0];

  return state
    .setIn(["headers"].concat(path), action.newTimestamp)
    .updateIn(["headers", headerIndex], (header: MapOf<OrgHeadline>) => {
      const description = header.get("description");
      const title = header.getIn(["titleLine", "title"]);

      return header
        .setIn(["titleLine", "rawTitle"], attributedStringToRawText(title))
        .set("rawDescription", attributedStringToRawText(description))
        .set("planningItems", updatePlanningItemsFromHeader(header));
    });
};

// This is for special planning items like SCHEDULED: and DEADLINE:; but not
// for normal active timestamps (which are also added to planning items).
const updatePlanningItemTimestamp = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_PLANNING_ITEM_TIMESTAMP";
    headerId: number;
    planningItemIndex: number;
    newTimestamp: OrgTimestampPart;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const { headerId, planningItemIndex, newTimestamp } = action;
  const headerIndex = indexOfHeaderWithId(state.get("headers"), headerId);

  return state.setIn(
    ["headers", headerIndex, "planningItems", planningItemIndex, "timestamp"],
    newTimestamp,
  );
};

const addNewPlanningItem = (
  state: MapOf<OrgFile>,
  action: {
    type: "ADD_NEW_PLANNING_ITEM";
    headerId: number;
    planningType: PlanningType;
    dirtying: boolean;
    timestamp: MapOf<OrgTimestamp>;
  },
): MapOf<OrgState> => {
  const headerIndex = indexOfHeaderWithId(
    state.get("headers"),
    action.headerId,
  );

  const newPlanningItem = fromJS({
    id: generateId(),
    type: action.planningType,
    timestamp: timestampForDate(action.timestamp),
  });

  return state.updateIn(
    ["headers", headerIndex, "planningItems"],
    (planningItems: List<MapOf<OrgPlanningItem>>) =>
      !!planningItems
        ? planningItems.push(newPlanningItem)
        : List([newPlanningItem]),
  );
};

const removePlanningItem = (
  state: MapOf<OrgFile>,
  action: {
    type: "REMOVE_PLANNING_ITEM";
    headerId: number;
    planningItemIndex: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headerIndex = indexOfHeaderWithId(
    state.get("headers"),
    action.headerId,
  );
  const { planningItemIndex } = action;

  return state.removeIn([
    "headers",
    headerIndex,
    "planningItems",
    planningItemIndex,
  ]);
};

const removeTimestamp = (
  state: MapOf<OrgFile>,
  action: {
    type: "REMOVE_TIMESTAMP";
    headerId: number;
    timestampId: number;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const { path } = pathAndPartOfTimestampItemWithIdInHeaders(
    state.get("headers"),
    action.timestampId,
  );

  // remove parsed timestamp
  state = state.removeIn(["headers", ...path]);

  // in case this is an active timestamp, remove it from planning items.
  state = state.updateIn(
    ["headers", path[0], "planningItems"],
    (planningItems: List<MapOf<OrgPlanningItem>>) =>
      planningItems.filter(
        (item: MapOf<OrgPlanningItem>) => item.get("id") !== action.timestampId,
      ),
  );

  // rebuild text representation of header
  state = state.setIn(
    ["headers", path[0], "titleLine", "rawTitle"],
    attributedStringToRawText(
      state.getIn(["headers", path[0], "titleLine", "title"]),
    ),
  );
  state = state.setIn(
    ["headers", path[0], "rawDescription"],
    attributedStringToRawText(state.getIn(["headers", path[0], "description"])),
  );

  return state;
};

export const updatePropertyListItems = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_PROPERTY_LIST_ITEMS";
    headerId: number;
    newPropertyListItems: Array<string>;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const headerIndex = indexOfHeaderWithId(
    state.get("headers"),
    action.headerId,
  );

  return state.setIn(
    ["headers", headerIndex, "propertyListItems"],
    action.newPropertyListItems,
  );
};

export const setLogEntryStop = (
  state: MapOf<OrgFile>,
  action: {
    type: "SET_LOG_ENTRY_STOP";
    headerId: number;
    entryId: number;
    time: Date;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const { headerId, entryId, time } = action;
  const headerIdx = indexOfHeaderWithId(state.get("headers"), headerId);
  const entryIndex = state
    .getIn(["headers", headerIdx, "logBookEntries"])
    .findIndex((entry) => entry.get("id") === entryId);
  state = state.update("activeClocks", (i: number) => i - 1);
  return state.setIn(
    ["headers", headerIdx, "logBookEntries", entryIndex, "end"],
    fromJS(time),
  );
};

export const createLogEntryStart = (
  state: MapOf<OrgFile>,
  action: {
    type: "CREATE_LOG_ENTRY_START";
    headerId: number;
    time: Date;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const { headerId, time } = action;
  const headerIdx = indexOfHeaderWithId(state.get("headers"), headerId);
  const newEntry = fromJS({
    id: generateId(),
    start: time,
    end: null,
  });
  state = state.update("activeClocks", (i: number) => i + 1);
  return state.updateIn(
    ["headers", headerIdx, "logBookEntries"],
    (entries: unknown) =>
      !!entries ? entries.unshift(newEntry) : List([newEntry]),
  );
};

export const updateLogEntryTime = (
  state: MapOf<OrgFile>,
  action: {
    type: "UPDATE_LOG_ENTRY_TIME";
    headerId: number;
    entryIndex: number;
    entryType: LogEntryType;
    newTime: Date;
    dirtying: boolean;
  },
): MapOf<OrgState> => {
  const { headerId, entryIndex, entryType, newTime } = action;
  const headerIdx = indexOfHeaderWithId(state.get("headers"), headerId);
  return state.setIn(
    ["headers", headerIdx, "logBookEntries", entryIndex, entryType],
    fromJS(newTime),
  );
};

export const determineIncludedFiles = (
  files: List<MapOf<OrgFile>>,
  fileSettings: List<MapOf<FileSetting>>,
  path: string,
  settingValue: number | string | boolean,
  includeByDefault: boolean,
) =>
  files.mapEntries(([filePath, file]: [string, MapOf<OrgFile>]) => [
    filePath,
    file.update("headers", (headers: List<MapOf<OrgHeadline>>) => {
      const fileSetting = fileSettings.find(
        (setting: MapOf<FileSetting>) => filePath === setting.get("path"),
      );
      // always include the viewed file
      if (path === filePath) {
        return headers;
      } else if (fileSetting) {
        if (fileSetting.get(settingValue)) {
          return headers;
        } else {
          return List();
        }
      } else if (filePath.startsWith(STATIC_FILE_PREFIX)) {
        // never include static files
        return List();
      } else {
        // if no setting exists
        return includeByDefault ? headers : List();
      }
    }),
  ]);

const searchHeaders = ({
  searchFilterExpr = [],
  headersToSearch,
  path,
}: {
  searchFilterExpr: never[];
  headersToSearch: List<MapOf<OrgHeadline>>;
  path: string;
}) => {
  let filteredHeaders;
  let nrOfHeadersToSearch = 200;
  const searchFilterFunction = isMatch(searchFilterExpr);

  // search the current file first
  const headersFoundInCurrentFile = headersToSearch
    .get(path)
    .filter(searchFilterFunction)
    .take(nrOfHeadersToSearch);
  nrOfHeadersToSearch -= headersFoundInCurrentFile.count();
  filteredHeaders = Map().set(path, headersFoundInCurrentFile);

  // search rest of files until nrOfHeadersToDisplay results are found
  const filePathsToSearch = headersToSearch
    .keySeq()
    .filter((p: number) => p !== path);
  filePathsToSearch.forEach((filePath: string) => {
    if (nrOfHeadersToSearch > 0) {
      const headersFoundInFile = headersToSearch
        .get(filePath)
        .filter(searchFilterFunction)
        .take(nrOfHeadersToSearch);
      nrOfHeadersToSearch -= headersFoundInFile.count();
      filteredHeaders = filteredHeaders.set(filePath, headersFoundInFile);
    }
  });
  return filteredHeaders;
};

const isActiveClockFilter = (clockFilter) =>
  clockFilter.field.timerange.type === "point" &&
  clockFilter.field.timerange.point.type === "special" &&
  clockFilter.field.timerange.point.value === "now";

export const setSearchFilterInformation = (
  state: MapOf<OrgState>,
  action: {
    type: "SET_SEARCH_FILTER_INFORMATION";
    searchFilter: string;
    cursorPosition: number;
    context: Context;
  },
): MapOf<OrgState> => {
  const { searchFilter, cursorPosition, context } = action;

  let files = state.get("files");
  state = state.asMutable();

  let searchFilterValid = true;
  let searchFilterExpr;
  try {
    searchFilterExpr = headline_filter_parser.parse(searchFilter);
    state.setIn(["search", "searchFilterExpr"], searchFilterExpr);
  } catch (e) {
    // No need to print this parser exceptions. They are expected, see
    // *.grammar.pegjs. However, we don't need to update the filtered
    // headers when given an invalid search filter.
    searchFilterValid = false;
  }

  const path = state.get("path");
  const fileSettings = state.get("fileSettings");
  // Decide which files to include
  if (context === "agenda") {
    files = determineIncludedFiles(
      files,
      fileSettings,
      path,
      "includeInAgenda",
      false,
    );
  } else if (context === "search") {
    files = determineIncludedFiles(
      files,
      fileSettings,
      path,
      "includeInSearch",
      false,
    );
  } else if (context === "task-list") {
    files = determineIncludedFiles(
      files,
      fileSettings,
      path,
      "includeInTasklist",
      false,
    );
  } else if (context === "refile") {
    files = determineIncludedFiles(
      files,
      fileSettings,
      path,
      "includeInRefile",
      false,
    );
  } // there should not be another context, but if so use all files

  state.setIn(["search", "searchFilterValid"], searchFilterValid);
  // Only run filter if a filter is given and parsing was successful
  if (searchFilterValid) {
    const headers = files.map((file: MapOf<OrgFile>) => file.get("headers"));

    // show clocked times & sum if there is a clock search term
    const clockedTimeAndActiveClockFilters = searchFilterExpr
      .filter((f) => f.type === "field")
      .filter((f) => f.field.type === "clock");
    const clockFilters = clockedTimeAndActiveClockFilters.filter(
      (f) => !isActiveClockFilter(f),
    );
    // check for special case "clock:now" which searches active clocks
    const hasActiveClockFilter =
      clockedTimeAndActiveClockFilters.length !== clockFilters.length;

    const filterFunctions = clockFilters.map(timeFilter);
    const showClockedTimes = clockFilters.length !== 0;
    state.setIn(["search", "showClockedTimes"], showClockedTimes);

    // Only search subheaders if a header is narrowed
    const narrowedHeaderId = state.getIn(["files", path, "narrowedHeaderId"]);
    let headersToSearch;
    if (!narrowedHeaderId || context === "refile") {
      headersToSearch = headers;
    } else {
      headersToSearch = Map().set(
        path,
        subheadersOfHeaderWithId(headers.get(path), narrowedHeaderId),
      );
    }

    if (hasActiveClockFilter) {
      headersToSearch = headersToSearch.map(
        (headersOfFile: List<MapOf<OrgHeadline>>) =>
          headersOfFile.filter(hasActiveClock),
      );
    }

    // calculate relevant clocked times and total
    if (showClockedTimes) {
      headersToSearch = headersToSearch.map(
        (headersOfFile: List<MapOf<OrgHeadline>>) =>
          headersOfFile.map((header: MapOf<OrgHeadline>) =>
            header.set(
              "totalFilteredTimeLogged",
              totalFilteredTimeLogged(filterFunctions, header),
            ),
          ),
      );
      headersToSearch = headersToSearch.map(
        (headersOfFile: List<MapOf<OrgHeadline>>) =>
          updateHeadersTotalFilteredTimeLoggedRecursive(
            filterFunctions,
            headersOfFile,
          ).filter(
            (header: MapOf<OrgHeadline>) =>
              header.get("totalFilteredTimeLoggedRecursive") !== 0,
          ),
      );
    }

    // perform the actual search
    let filteredHeaders = searchHeaders({
      searchFilterExpr,
      headersToSearch,
      path,
    });

    if (showClockedTimes) {
      const clockedTime = filteredHeaders
        .map((headersOfFile: List<MapOf<OrgHeadline>>) =>
          headersOfFile.reduce(
            (acc: number, val: MapOf<OrgHeadline>) =>
              acc + val.get("totalFilteredTimeLogged"),
            0,
          ),
        )
        .toList()
        .reduce((acc: number, val: number) => acc + val, 0);
      state.setIn(["search", "clockedTime"], clockedTime);
    }

    // Filter selectedHeader and its subheaders from `headers`,
    // because you don't want to refile a header to itself or to one
    // of its subheaders.
    if (context === "refile") {
      const selectedHeaderId = state.getIn(["files", path, "selectedHeaderId"]);
      const subheaders = subheadersOfHeaderWithId(
        headers.get(path),
        selectedHeaderId,
      );
      let filterIds = subheaders.map((s) => s.get("id")).toJS();
      filterIds.push(selectedHeaderId);
      filteredHeaders = filteredHeaders.update(
        path,
        (headersOfFile: List<MapOf<OrgHeadline>>) =>
          headersOfFile.filter((h: MapOf<OrgHeadline>) => {
            return !filterIds.includes(h.get("id"));
          }),
      );
    }

    state.setIn(["search", "filteredHeaders"], filteredHeaders);
  }

  state.setIn(["search", "searchFilter"], searchFilter);

  let searchFilterSuggestions = [];
  if (!isEmpty(searchFilter)) {
    // TODO: Currently only showing suggestions based on opened file.
    // Decide if they should be based on all files.
    const currentFile = files.get(path);
    const headersOfFile = currentFile.get("headers");
    const todoKeywords = getTodoKeywordSetsAsFlattenedArray(currentFile);
    const tagNames = extractAllOrgTags(headersOfFile).toJS();
    const allProperties = extractAllOrgProperties(headersOfFile).toJS();
    searchFilterSuggestions = computeCompletionsForDatalist(
      todoKeywords,
      tagNames,
      allProperties,
    )(searchFilterExpr, searchFilter, cursorPosition);
  }

  state.setIn(["search", "searchFilterSuggestions"], searchFilterSuggestions);

  // update bookmarks to order them by 'last used'
  let bookmarks: List<string> = state.getIn(["bookmarks", context]);
  if (bookmarks.contains(searchFilter)) {
    bookmarks = bookmarks
      .filter((x) => x !== searchFilter)
      .unshift(searchFilter)
      .take(10);
  }
  state.setIn(["bookmarks", context], bookmarks);

  return state.asImmutable();
};

const setOrgFileErrorMessage = (
  state: MapOf<OrgState>,
  action: {
    type: "SET_ORG_FILE_ERROR_MESSAGE";
    message: string;
  },
): MapOf<OrgState> => state.set("orgFileErrorMessage", action.message);

const setPath = (
  state: MapOf<OrgState>,
  action: {
    type: "SET_PATH";
    path: string;
  },
): MapOf<OrgState> => state.set("path", action.path);

const setShowClockDisplay = (
  state: MapOf<OrgState>,
  action: {
    type: "TOGGLE_CLOCK_DISPLAY";
    showClockDisplay: boolean;
  },
): MapOf<OrgState> => {
  if (action.showClockDisplay) {
    state = state.update("headers", updateHeadersTotalTimeLoggedRecursive);
  }
  return state.set("showClockDisplay", action.showClockDisplay);
};

const indexOfFileSettingWithId = (
  settings: List<MapOf<FileSetting>>,
  settingId: number,
) =>
  settings.findIndex(
    (setting: MapOf<FileSetting>) => setting.get("id") === settingId,
  );

const updateFileSettingFieldPathValue = (
  state: MapOf<OrgState>,
  action: {
    type: "UPDATE_FILE_SETTING_FIELD_PATH_VALUE";
    settingId: number;
    fieldPath: string;
    newValue: string;
  },
): MapOf<OrgState> => {
  const settingIndex = indexOfFileSettingWithId(
    state.get("fileSettings"),
    action.settingId,
  );

  return state.setIn(
    ["fileSettings", settingIndex].concat(action.fieldPath),
    action.newValue,
  );
};

const reorderFileSetting = (
  state: MapOf<OrgState>,
  action: {
    type: "REORDER_FILE_SETTING";
    fromIndex: number;
    toIndex: number;
  },
): MapOf<OrgState> =>
  state.update("fileSettings", (settings: List<MapOf<FileSetting>>) =>
    settings
      .splice(action.fromIndex, 1)
      .splice(action.toIndex, 0, settings.get(action.fromIndex)),
  );

const deleteFileSetting = (
  state: MapOf<OrgState>,
  action: {
    type: "DELETE_FILE_SETTING";
    settingId: number;
  },
): MapOf<OrgState> => {
  const settingIndex = indexOfFileSettingWithId(
    state.get("fileSettings"),
    action.settingId,
  );

  return state.update("fileSettings", (settings: List<MapOf<FileSetting>>) =>
    settings.delete(settingIndex),
  );
};

const saveBookmark = (
  state: MapOf<OrgState>,
  {
    context,
    bookmark,
  }: {
    context: Context;
    bookmark: string;
  },
) => {
  return state.updateIn(
    ["bookmarks", context],
    (bookmarks: List<string>): List<string> =>
      bookmarks
        .filter((x) => x !== bookmark)
        .unshift(bookmark)
        .take(10),
  );
};

const deleteBookmark = (
  state: MapOf<OrgState>,
  {
    context,
    bookmark,
  }: {
    context: Context;
    bookmark: string;
  },
): MapOf<OrgState> => {
  return state.updateIn(
    ["bookmarks", context],
    (bookmarks: List<string>): List<string> =>
      bookmarks.filter((x) => x !== bookmark).take(10),
  );
};

const addNewFile = (
  state: MapOf<OrgState>,
  {
    path,
    content,
  }: {
    path: string;
    content: string;
  },
): MapOf<OrgState> => {
  const parsedFile = parseOrg(content);

  return state
    .setIn(["files", path, "headers"], parsedFile.get("headers"))
    .setIn(
      ["files", path, "todoKeywordSets"],
      parsedFile.get("todoKeywordSets"),
    )
    .setIn(
      ["files", path, "fileConfigLines"],
      parsedFile.get("fileConfigLines"),
    )
    .setIn(
      ["files", path, "linesBeforeHeadings"],
      parsedFile.get("linesBeforeHeadings"),
    )
    .setIn(["files", path, "activeClocks"], parsedFile.get("activeClocks"))
    .setIn(["files", path, "isDirty"], false);
};

const addNewEmptyFileSetting = (state: MapOf<OrgState>) =>
  state.update("fileSettings", (settings: List<MapOf<FileSetting>>) =>
    settings.push(
      Map({
        id: generateId(),
        path: "",
        loadOnStartup: false,
        includeInAgenda: false,
        includeInSearch: false,
        includeInRefile: false,
        includeInTasklist: false,
      }),
    ),
  );

const restoreFileSettings = (
  state: MapOf<OrgState>,
  action: {
    type: "RESTORE_FILE_SETTINGS";
    newSettings: Record<string, string>;
  },
): MapOf<OrgState> => {
  if (!action.newSettings) {
    return state;
  }

  return applyFileSettingsFromConfig(state, action.newSettings);
};

const reduceInFile =
  <A, B>(state: MapOf<OrgState>, action: A, path: string) =>
  (
    func: (state: MapOf<OrgFile>, action: A, ...args: B) => MapOf<OrgFile>,
    ...args: B
  ): MapOf<OrgState> => {
    return state.updateIn(
      ["files", path],
      (file: MapOf<OrgFile>): MapOf<OrgFile> =>
        func(file ? file : Map(), action, ...args),
    );
  };

const reducer = (
  state: MapOf<OrgState>,
  action: OrgAction,
): MapOf<OrgState> => {
  const path = state.get("path");
  const inFile = reduceInFile(state, action, path);

  switch (action.type) {
    case "PARSE_FILE":
      return parseFile(state, action);
    case "CLEAR_SEARCH":
      return clearSearch(state, action);
    case "TOGGLE_HEADER_OPENED":
      return inFile(toggleHeaderOpened);
    case "OPEN_HEADER":
      return inFile(openHeader);
    case "SELECT_HEADER":
      return inFile(selectHeader);
    case "SELECT_HEADER_INDEX":
      return inFile(selectHeaderIndex);
    case "OPEN_PARENTS_OF_HEADER":
      return inFile(openParentsOfHeader);
    case "ADVANCE_TODO_STATE":
      return inFile(advanceTodoState);
    case "SET_TODO_STATE":
      return inFile(setTodoState);
    case "ENTER_EDIT_MODE":
      return inFile(enterEditMode);
    case "EXIT_EDIT_MODE":
      return inFile(exitEditMode);
    case "UPDATE_HEADER_TITLE":
      return inFile(updateHeaderTitle);
    case "UPDATE_HEADER_DESCRIPTION":
      return inFile(updateHeaderDescription);
    case "ADD_HEADER":
      return inFile(addHeader);
    case "DUPLICATE_HEADER":
      return inFile(duplicateHeader);
    case "CREATE_FIRST_HEADER":
      return inFile(createFirstHeader);
    case "SELECT_NEXT_SIBLING_HEADER":
      return inFile(selectNextSiblingHeader);
    case "SELECT_NEXT_VISIBLE_HEADER":
      return inFile(selectNextVisibleHeader);
    case "SELECT_PREVIOUS_VISIBLE_HEADER":
      return inFile(selectPreviousVisibleHeader);
    case "REMOVE_HEADER":
      return inFile(removeHeader);
    case "MOVE_HEADER_UP":
      return inFile(moveHeaderUp);
    case "MOVE_HEADER_DOWN":
      return inFile(moveHeaderDown);
    case "MOVE_HEADER_LEFT":
      return inFile(moveHeaderLeft);
    case "MOVE_HEADER_RIGHT":
      return inFile(moveHeaderRight);
    case "MOVE_SUBTREE_LEFT":
      return inFile(moveSubtreeLeft);
    case "MOVE_SUBTREE_RIGHT":
      return inFile(moveSubtreeRight);
    case "REFILE_SUBTREE":
      return refileSubtree(state, action);
    case "HEADER_ADD_NOTE":
      return inFile(addNote);
    case "APPLY_OPENNESS_STATE":
      return applyOpennessState(state, action);
    case "SET_OPENNESS_STATE":
      return setOpennessState(state, action);
    case "SET_DIRTY":
      return action.path
        ? reduceInFile(state, action, action.path)(setDirty)
        : inFile(setDirty);
    case "NARROW_HEADER":
      return inFile(narrowHeader);
    case "WIDEN_HEADER":
      return inFile(widenHeader);
    case "SET_SELECTED_DESCRIPTION_ITEM_INDEX":
      return inFile(setSelectedDescriptionItemIndex);
    case "SET_SELECTED_TABLE_ID":
      return inFile(setSelectedTableId);
    case "SET_SELECTED_TABLE_CELL_ID":
      return inFile(setSelectedTableCellId);
    case "ADD_NEW_TABLE_ROW":
      return inFile(addNewTableRow);
    case "REMOVE_TABLE_ROW":
      return inFile(removeTableRow);
    case "ADD_NEW_TABLE_COLUMN":
      return inFile(addNewTableColumn);
    case "REMOVE_TABLE_COLUMN":
      return inFile(removeTableColumn);
    case "MOVE_TABLE_ROW_DOWN":
      return inFile(moveTableRowDown);
    case "MOVE_TABLE_ROW_UP":
      return inFile(moveTableRowUp);
    case "MOVE_TABLE_COLUMN_LEFT":
      return inFile(moveTableColumnLeft);
    case "MOVE_TABLE_COLUMN_RIGHT":
      return inFile(moveTableColumnRight);
    case "UPDATE_TABLE_CELL_VALUE":
      return inFile(updateTableCellValue);
    case "INSERT_CAPTURE":
      return action.template.get("file")
        ? reduceInFile(
            state,
            action,
            action.template.get("file"),
          )(insertCapture)
        : inFile(insertCapture);
    case "CLEAR_PENDING_CAPTURE":
      return clearPendingCapture(state, action);
    case "ADVANCE_CHECKBOX_STATE":
      return inFile(advanceCheckboxState);
    case "SET_SELECTED_LIST_ITEM_ID":
      return inFile(setSelectedListItemId);
    case "UPDATE_LIST_TITLE_VALUE":
      return inFile(updateListTitleValue);
    case "UPDATE_LIST_CONTENTS_VALUE":
      return inFile(updateListContentsValue);
    case "ADD_NEW_LIST_ITEM":
      return inFile(addNewListItem);
    case "SELECT_NEXT_SIBLING_LIST_ITEM":
      return inFile(selectNextSiblingListItem);
    case "REMOVE_LIST_ITEM":
      return inFile(removeListItem);
    case "MOVE_LIST_ITEM_UP":
      return inFile(moveListItemUp);
    case "MOVE_LIST_ITEM_DOWN":
      return inFile(moveListItemDown);
    case "MOVE_LIST_ITEM_LEFT":
      return inFile(moveListItemLeft);
    case "MOVE_LIST_ITEM_RIGHT":
      return inFile(moveListItemRight);
    case "MOVE_LIST_SUBTREE_LEFT":
      return inFile(moveListSubtreeLeft);
    case "MOVE_LIST_SUBTREE_RIGHT":
      return inFile(moveListSubtreeRight);
    case "SET_LAST_SYNC_AT":
      return action.path
        ? reduceInFile(state, action, action.path)(setLastSyncAt)
        : inFile(setLastSyncAt);
    case "SET_HEADER_TAGS":
      return inFile(setHeaderTags);
    case "REORDER_TAGS":
      return inFile(reorderTags);
    case "REORDER_PROPERTY_LIST":
      return inFile(reorderPropertyList);
    case "UPDATE_TIMESTAMP_WITH_ID":
      return inFile(updateTimestampWithId);
    case "UPDATE_PLANNING_ITEM_TIMESTAMP":
      return inFile(updatePlanningItemTimestamp);
    case "ADD_NEW_PLANNING_ITEM":
      return inFile(addNewPlanningItem);
    case "REMOVE_PLANNING_ITEM":
      return inFile(removePlanningItem);
    case "REMOVE_TIMESTAMP":
      return inFile(removeTimestamp);
    case "UPDATE_PROPERTY_LIST_ITEMS":
      return inFile(updatePropertyListItems);
    case "SET_ORG_FILE_ERROR_MESSAGE":
      return setOrgFileErrorMessage(state, action);
    case "SET_LOG_ENTRY_STOP":
      return inFile(setLogEntryStop);
    case "CREATE_LOG_ENTRY_START":
      return inFile(createLogEntryStart);
    case "UPDATE_LOG_ENTRY_TIME":
      return inFile(updateLogEntryTime);
    case "SET_SEARCH_FILTER_INFORMATION":
      return setSearchFilterInformation(state, action);
    case "SET_PATH":
      return setPath(state, action);
    case "TOGGLE_CLOCK_DISPLAY":
      return setShowClockDisplay(state, action);
    case "UPDATE_FILE_SETTING_FIELD_PATH_VALUE":
      return updateFileSettingFieldPathValue(state, action);
    case "REORDER_FILE_SETTING":
      return reorderFileSetting(state, action);
    case "DELETE_FILE_SETTING":
      return deleteFileSetting(state, action);
    case "ADD_NEW_EMPTY_FILE_SETTING":
      return addNewEmptyFileSetting(state, action);
    case "RESTORE_FILE_SETTINGS":
      return restoreFileSettings(state, action);
    case "SAVE_BOOKMARK":
      return saveBookmark(state, action);
    case "DELETE_BOOKMARK":
      return deleteBookmark(state, action);
    case "ADD_NEW_FILE":
      return addNewFile(state, action);
    default:
      return state;
  }
};

export default (
  state: MapOf<OrgState> = Map({} as OrgState),
  action: OrgAction,
): MapOf<OrgState> => {
  const affectedFiles: Array<string> = determineAffectedFiles(state, action);
  affectedFiles.forEach((path: string): void => {
    state = state.setIn(["files", path, "isDirty"], true);
  });

  state = reducer(state, action);

  if (action.dirtying && state.get("showClockDisplay")) {
    affectedFiles.forEach((path: string): void => {
      state = state.updateIn(
        ["files", path, "headers"],
        updateHeadersTotalTimeLoggedRecursive,
      );
    });
  }
  return state;
};

export const determineAffectedFiles = (
  state: MapOf<OrgState>,
  action: OrgAction,
): Array<string> => {
  if (action.dirtying) {
    if (action.type === "REFILE_SUBTREE") {
      return [action.sourcePath, action.targetPath];
    } else if (action.type === "INSERT_CAPTURE") {
      const captureTarget = action.template.get("file");
      if (captureTarget) {
        return [captureTarget];
      } else {
        return [state.get("path")];
      }
    } else {
      return [state.get("path")];
    }
  } else {
    return [];
  }
};

function updateHeadlines({
  currentTodoSet,
  newTodoState,
  indexedPlanningItemsWithRepeaters,
  state,
  headerIndex,
  currentTodoState,
  logIntoDrawer,
  timestamp,
}: {
  currentTodoSet: MapOf<OrgTodoKeywordSet>;
  newTodoState: string;
  indexedPlanningItemsWithRepeaters: List<MapOf<OrgPlanningItem>>;
  state: MapOf<OrgState>;
  headerIndex: number;
  currentTodoState: string;
  logIntoDrawer: boolean;
  timestamp: MapOf<OrgTimestamp>;
}): MapOf<OrgState> {
  if (
    currentTodoSet.get("completedKeywords").includes(newTodoState) &&
    indexedPlanningItemsWithRepeaters.size > 0
  )
    return updatePlanningItemsWithRepeaters({
      indexedPlanningItemsWithRepeaters,
      state,
      headerIndex,
      currentTodoSet,
      newTodoState,
      currentTodoState,
      logIntoDrawer,
      timestamp,
    });
  // Update simple headline (without repeaters)
  return state.setIn(
    ["headers", headerIndex, "titleLine", "todoKeyword"],
    newTodoState,
  );
}

function addTodoStateChangeLogItem(
  state: MapOf<OrgState>,
  headerIndex: number,
  newTodoState: string,
  currentTodoState: string,
  logIntoDrawer: boolean,
  timestamp: MapOf<OrgTimestamp>,
): MapOf<OrgState> {
  // This is how the TODO state change will be logged
  const inactiveTimestamp = getTimestampAsText(timestamp, {
    isActive: false,
    withStartTime: true,
  });
  const newStateChangeLogText = `- State "${newTodoState}"       from "${currentTodoState}"       ${inactiveTimestamp}`;

  if (logIntoDrawer) {
    // Prepend this single item to the :LOGBOOK: drawer, same as org-log-into-drawer setting
    // https://www.gnu.org/software/emacs/manual/html_node/org/Tracking-TODO-state-changes.html
    const newEntry = fromJS({
      id: generateId(),
      raw: newStateChangeLogText,
    });
    return state.updateIn(
      ["headers", headerIndex, "logBookEntries"],
      (entries: unknown) => entries.unshift(newEntry),
    );
  } else {
    // When org-log-into-drawer not set, prepend state change log text to log notes
    return addNoteGeneric(state, { noteText: newStateChangeLogText });
  }
}

function updatePlanningItemsWithRepeaters({
  indexedPlanningItemsWithRepeaters,
  state,
  headerIndex,
  currentTodoSet,
  newTodoState,
  currentTodoState,
  logIntoDrawer,
  timestamp,
}: {
  indexedPlanningItemsWithRepeaters: List<MapOf<OrgPlanningItem>>;
  state: MapOf<OrgState>;
  headerIndex: number;
  currentTodoSet: MapOf<OrgTodoKeywordSet>;
  newTodoState: string;
  currentTodoState: string;
  logIntoDrawer: boolean;
  timestamp: MapOf<OrgTimestamp>;
}): MapOf<OrgState> {
  const headerId = state.getIn(["headers", headerIndex, "id"]);
  state = selectHeader(state, { headerId });

  indexedPlanningItemsWithRepeaters.forEach(
    ([planningItem, planningItemIndex]: [MapOf<OrgPlanningItem>, number]) => {
      const adjustedTimestamp = applyRepeater(
        planningItem.get("timestamp"),
        timestamp,
      );
      state = state.setIn(
        [
          "headers",
          headerIndex,
          "planningItems",
          planningItemIndex,
          "timestamp",
        ],
        adjustedTimestamp,
      );

      // INFO: Active timestamps are now manually updated in place.
      // Rationale: The active timestamps in title and description are
      // added to `planningItems` on parse. Since there can be an
      // arbitrary amount of timestamps it makes sense not to have one
      // `planningItem` representing the title or the description. We
      // need to preserve the place of a timestamp in title/description
      // and we want to have it in a list of `planningItems`. So they
      // necessarily exist in more than one place. There might be a
      // cleaner solution where we store the timestamp only in one place
      // and use references to that place but I don't see any extra
      // benefit for what would be no negligible refactoring effort.

      // Scheduled / deadline timestamps on the other hand are part of
      // `rawDescription` but not of the parsed description. These
      // timestamps only exist in one place (`planningItems`) so
      // changing them there is visible and will be persisted.
      switch (planningItem.get("type")) {
        case "TIMESTAMP_TITLE":
          const titleIndex = state
            .getIn(["headers", headerIndex, "titleLine", "title"])
            .findIndex(
              (titlePart) => planningItem.get("id") === titlePart.get("id"),
            );
          state = state.setIn(
            [
              "headers",
              headerIndex,
              "titleLine",
              "title",
              titleIndex,
              "firstTimestamp",
            ],
            adjustedTimestamp,
          );
          state = state.setIn(
            ["headers", headerIndex, "titleLine", "rawTitle"],
            attributedStringToRawText(
              state.getIn(["headers", headerIndex, "titleLine", "title"]),
            ),
          );
          break;
        case "TIMESTAMP_DESCRIPTION":
          const descriptionIndex = state
            .getIn(["headers", headerIndex, "description"])
            .findIndex(
              (descriptionPart) =>
                planningItem.get("id") === descriptionPart.get("id"),
            );
          state = state.setIn(
            [
              "headers",
              headerIndex,
              "description",
              descriptionIndex,
              "firstTimestamp",
            ],
            adjustedTimestamp,
          );
          state = state.setIn(
            ["headers", headerIndex, "rawDescription"],
            attributedStringToRawText(
              state.getIn(["headers", headerIndex, "description"]),
            ),
          );
          break;
        default:
          break;
      }
    },
  );
  state = state.setIn(
    ["headers", headerIndex, "titleLine", "todoKeyword"],
    currentTodoSet.get("keywords").first(),
  );
  if (!noLogRepeatEnabledP({ state, headerIndex })) {
    const lastRepeatTimestamp = timestampForDate(timestamp, {
      isActive: false,
      withStartTime: true,
    });
    const newLastRepeatValue = [
      {
        type: "timestamp",
        id: generateId(),
        firstTimestamp: lastRepeatTimestamp,
        secondTimestamp: null,
      },
    ];

    state = state.updateIn(
      ["headers", headerIndex, "propertyListItems"],
      (propertyListItems: List<MapOf<OrgPropertyListItem>>) =>
        propertyListItems.some(
          (item: MapOf<OrgPropertyListItem>) =>
            item.get("property") === "LAST_REPEAT",
        )
          ? propertyListItems.map((item: MapOf<OrgPropertyListItem>) =>
              item.get("property") === "LAST_REPEAT"
                ? item.set("value", fromJS(newLastRepeatValue))
                : item,
            )
          : propertyListItems.push(
              fromJS({
                property: "LAST_REPEAT",
                value: newLastRepeatValue,
                id: generateId(),
              }),
            ),
    );

    state = addTodoStateChangeLogItem(
      state,
      headerIndex,
      newTodoState,
      currentTodoState,
      logIntoDrawer,
      timestamp,
    );
  }
  return state;
}

/**
 * Is the `nologrepeat` feature enabled for this buffer?
 * More info:
 * https://www.gnu.org/software/emacs/manual/html_node/org/Repeated-tasks.html
 */
export const noLogRepeatEnabledP = ({
  state,
  headerIndex,
}: {
  state: MapOf<OrgState>;
  headerIndex: number;
}): MapOf<OrgState> => {
  const startupOptNoLogRepeat = state
    .get("fileConfigLines")
    .some((elt: string) => elt.match(/^#\+STARTUP:.*nologrepeat.*/));
  const loggingProp = inheritedValueOfProperty(
    state.get("headers"),
    headerIndex,
    "LOGGING",
  );
  return !!(
    startupOptNoLogRepeat ||
    (loggingProp &&
      loggingProp.some(
        (v: MapOf<OrgPropertyListItem>) =>
          v.get("type") === "text" &&
          v.get("contents").match(/\s*nologrepeat\s*/),
      ))
  );
};

/**
 * Function wrapper around `updateCookiesOfHeaderWithId` and
 * `updateCookiesOfParentOfHeaderWithId`.
 */
function updateCookies(
  file: MapOf<OrgFile>,
  previousParentHeaderId: number,
  action: { headerId: number },
): MapOf<OrgFile> {
  file = updateCookiesOfHeaderWithId(file, previousParentHeaderId);
  file = updateCookiesOfParentOfHeaderWithId(file, action.headerId);
  return file;
}

function shiftTreeNestingLevel(
  {
    state,
    headerIndex,
    subheaders = [] as Array<MapOf<OrgHeadline>>,
  }: {
    state: MapOf<OrgState>;
    headerIndex: number;
    subheaders: Array<MapOf<OrgHeadline>>;
  },
  direction: string = "-",
): MapOf<OrgState> {
  state = state.updateIn(
    ["headers", headerIndex, "nestingLevel"],
    calculateNestingLevel(),
  );
  subheaders.forEach((_: MapOf<OrgHeadline>, index: number) => {
    state = state.updateIn(
      ["headers", headerIndex + index + 1, "nestingLevel"],
      calculateNestingLevel(),
    );
  });
  return state;

  function calculateNestingLevel() {
    return (nestingLevel: number): number => {
      if (direction === "-") {
        // Don't move a header further to the left than the first
        // column
        return Math.max(nestingLevel - 1, 1);
      } else {
        return nestingLevel + 1;
      }
    };
  }
}
