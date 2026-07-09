import type { Dispatch } from "redux";
import type { ModalPage, PopupType } from "../types.ts";
import sampleContent from "../../sample.org?raw";
import { STATIC_FILE_PREFIX } from "../lib/org_utils";
import type {
  AgendaTimeframe,
  BaseAction,
  DelayUnit,
  FinderTab,
} from "../types";
import { parseFile, resetFileDisplay, setPath } from "./org";

export const setLoadingMessage = (loadingMessage: string): BaseAction => ({
  type: "SET_LOADING_MESSAGE",
  loadingMessage,
});

export const hideLoadingMessage = (): BaseAction => ({
  type: "HIDE_LOADING_MESSAGE",
});

export const setIsLoading = (isLoading: boolean, path: string): BaseAction => ({
  type: "SET_IS_LOADING",
  isLoading,
  path,
});

export const setIsOnline = (online: boolean): BaseAction => ({
  type: "SET_IS_ONLINE",
  online,
});

export const setDisappearingLoadingMessage =
  (loadingMessage: string, delay: number) =>
  (dispatch: Dispatch): void => {
    dispatch(setLoadingMessage(loadingMessage));
    setTimeout(() => dispatch(hideLoadingMessage()), delay);
  };

export const setLastViewedFile = (lastViewedPath: string): BaseAction => ({
  type: "SET_LAST_VIEWED_FILE",
  lastViewedPath,
});

export const restoreStaticFile = (
  staticFile: string,
  lastViewedFilePath: string,
) => {
  return (dispatch: Dispatch): void => {
    dispatch(setLastViewedFile(lastViewedFilePath));

    dispatch(parseFile(STATIC_FILE_PREFIX + staticFile, sampleContent));
  };
};

export const unloadStaticFile = (): ((
  dispatch: Dispatch,
  getState,
) => void) => {
  return (dispatch: Dispatch, getState): void => {
    dispatch(resetFileDisplay());

    const path: string = getState().base.get("lastViewedPath");
    if (!!path) {
      dispatch(setPath(path));
    }
  };
};

export const setFontSize = (newFontSize: number): BaseAction => ({
  type: "SET_FONT_SIZE",
  newFontSize,
});

export const setBulletStyle = (newBulletStyle: string): BaseAction => ({
  type: "SET_BULLET_STYLE",
  newBulletStyle,
});

export const setShouldTapTodoToAdvance = (
  newShouldTapTodoToAdvance: boolean,
): BaseAction => ({
  type: "SET_SHOULD_TAP_TODO_TO_ADVANCE",
  newShouldTapTodoToAdvance,
});

export const setAgendaDefaultDeadlineDelayUnit = (
  newAgendaDefaultDeadlineDelayUnit: DelayUnit,
): BaseAction => ({
  type: "SET_AGENDA_DEFAULT_DEADLINE_DELAY_UNIT",
  newAgendaDefaultDeadlineDelayUnit,
});

export const setAgendaDefaultDeadlineDelayValue = (
  newAgendaDefaultDeadlineDelayValue: number,
): BaseAction => ({
  type: "SET_AGENDA_DEFAULT_DEADLINE_DELAY_VALUE",
  newAgendaDefaultDeadlineDelayValue,
});

export const setEditorDescriptionHeightValue = (
  newEditorDescriptionHeightValue: number,
): BaseAction => ({
  type: "SET_EDITOR_DESCRIPTION_HEIGHT_VALUE",
  newEditorDescriptionHeightValue,
});

export const setAgendaStartOnWeekday = (
  newAgendaStartOnWeekday: boolean,
): BaseAction => ({
  type: "SET_AGENDA_START_ON_WEEKDAY",
  newAgendaStartOnWeekday,
});

export const setShouldLiveSync = (shouldLiveSync: boolean): BaseAction => ({
  type: "SET_SHOULD_LIVE_SYNC",
  shouldLiveSync,
});

export const setShowDeadlineDisplay = (
  showDeadlineDisplay: boolean,
): BaseAction => ({
  type: "SET_SHOW_DEADLINE_DISPLAY",
  showDeadlineDisplay,
});

export const setShouldSyncOnBecomingVisibile = (
  shouldSyncOnBecomingVisibile: boolean,
): BaseAction => ({
  type: "SET_SHOULD_SYNC_ON_BECOMING_VISIBLE",
  shouldSyncOnBecomingVisibile,
});

export const setShouldShowTitleInOrgFile = (
  shouldShowTitleInOrgFile: boolean,
): BaseAction => ({
  type: "SET_SHOULD_SHOW_TITLE_IN_ORG_FILE",
  shouldShowTitleInOrgFile,
});

export const setShouldLogIntoDrawer = (
  shouldLogIntoDrawer: boolean,
): BaseAction => ({
  type: "SET_SHOULD_LOG_INTO_DRAWER",
  shouldLogIntoDrawer,
});

export const setCloseSubheadersRecursively = (
  closeSubheadersRecursively: boolean,
): BaseAction => ({
  type: "SET_CLOSE_SUBHEADERS_RECURSIVELY",
  closeSubheadersRecursively,
});

export const setShouldNotIndentOnExport = (
  shouldNotIndentOnExport: boolean,
): BaseAction => ({
  type: "SET_SHOULD_NOT_INDENT_ON_EXPORT",
  shouldNotIndentOnExport,
});

export const setShouldStoreSettingsInSyncBackend = (
  newShouldStoreSettingsInSyncBackend: boolean,
): ((dispatch: Dispatch, getState) => void) => {
  return (dispatch: Dispatch, getState): void => {
    dispatch({
      type: "SET_SHOULD_STORE_SETTINGS_IN_SYNC_BACKEND",
      newShouldStoreSettingsInSyncBackend,
    });

    if (!newShouldStoreSettingsInSyncBackend) {
      const client = getState().syncBackend.get("client");
      switch (client.type) {
        case "Dropbox":
        case "GitLab":
        case "WebDAV":
          client
            .deleteFile("/.org-everywhere-config.json")
            .catch((doesFileNotExist, error): void | null =>
              doesFileNotExist
                ? null
                : alert(
                    `There was an error trying to delete the .org-everywhere-config.json file: ${error}`,
                  ),
            );
          break;
        default:
      }

      window.previousSettingsFileContents = null;
    }
  };
};

export const setColorScheme = (colorScheme: string): BaseAction => ({
  type: "SET_COLOR_SCHEME",
  colorScheme,
});

export const setTheme = (theme: string): BaseAction => ({
  type: "SET_THEME",
  theme,
});

export const setCustomKeybinding = (
  keybindingName: string,
  keybinding: string,
): BaseAction => ({
  type: "SET_CUSTOM_KEYBINDING",
  keybindingName,
  keybinding,
});

export const restoreBaseSettings = (
  newSettings: Record<string, string>,
): BaseAction => ({
  type: "RESTORE_BASE_SETTINGS",
  newSettings,
});

export const pushModalPage = (modalPage: ModalPage): BaseAction => ({
  type: "PUSH_MODAL_PAGE",
  modalPage,
});

export const popModalPage = (): BaseAction => ({
  type: "POP_MODAL_PAGE",
});

export const clearModalStack = (): BaseAction => ({
  type: "CLEAR_MODAL_STACK",
});

export const activatePopup = (
  popupType: PopupType,
  data: Record<string, string>,
): BaseAction => ({
  type: "ACTIVATE_POPUP",
  popupType,
  data,
});

export const closePopup = (): BaseAction => ({
  type: "CLOSE_POPUP",
});

export const setAgendaTimeframe =
  (agendaTimeframe: AgendaTimeframe) =>
  (dispatch: Dispatch): { type: string; agendaTimeframe: AgendaTimeframe } =>
    dispatch({
      type: "SET_AGENDA_TIMEFRAME",
      agendaTimeframe,
    });

export const setFinderTab =
  (finderTab: FinderTab) =>
  (dispatch: Dispatch): { type: string; finderTab: FinderTab } =>
    dispatch({
      type: "SET_FINDER_TAB",
      finderTab,
    });

export const setPreferEditRawValues =
  (preferEditRawValues: boolean) =>
  (dispatch: Dispatch): { type: string; preferEditRawValues: boolean } =>
    dispatch({
      type: "PREFER_EDIT_RAW_VALUES",
      preferEditRawValues,
    });
