import { List, Map, fromJS, type MapOf, Set } from "immutable";
import type { BaseState, BaseAction, DelayUnit, BulletStyle, ModalPage, PopupType, AgendaTimeframe, FinderTab } from "../types";
import { applyCategorySettingsFromConfig } from "../util/settings_persister";

const setLoadingMessage = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_LOADING_MESSAGE";
    loadingMessage: string | null;
  },
): MapOf<BaseState> => state.set("loadingMessage", action.loadingMessage);

const hideLoadingMessage = (state: MapOf<BaseState>) =>
  state.set("loadingMessage", null);

const setFontSize = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_FONT_SIZE";
    newFontSize: number;
  },
): MapOf<BaseState> => state.set("fontSize", action.newFontSize);

const setBulletStyle = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_BULLET_STYLE";
    newBulletStyle: BulletStyle;
  },
): MapOf<BaseState> => state.set("bulletStyle", action.newBulletStyle);

const setShouldTapTodoToAdvance = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOULD_TAP_TODO_TO_ADVANCE";
    newShouldTapTodoToAdvance: boolean;
  },
): MapOf<BaseState> =>
  state.set("shouldTapTodoToAdvance", action.newShouldTapTodoToAdvance);

const setAgendaDefaultDeadlineDelayUnit = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_AGENDA_DEFAULT_DEADLINE_DELAY_UNIT";
    newAgendaDefaultDeadlineDelayUnit: DelayUnit;
  },
): MapOf<BaseState> =>
  state.set(
    "agendaDefaultDeadlineDelayUnit",
    action.newAgendaDefaultDeadlineDelayUnit,
  );

const setAgendaDefaultDeadlineDelayValue = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_AGENDA_DEFAULT_DEADLINE_DELAY_VALUE";
    newAgendaDefaultDeadlineDelayValue: number;
  },
): MapOf<BaseState> =>
  state.set(
    "agendaDefaultDeadlineDelayValue",
    action.newAgendaDefaultDeadlineDelayValue,
  );

const setEditorDescriptionHeightValue = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_EDITOR_DESCRIPTION_HEIGHT_VALUE";
    newEditorDescriptionHeightValue: number;
  },
): MapOf<BaseState> =>
  state.set(
    "editorDescriptionHeightValue",
    action.newEditorDescriptionHeightValue,
  );

const setAgendaStartOnWeekday = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_AGENDA_START_ON_WEEKDAY";
    newAgendaStartOnWeekday: boolean;
  },
): MapOf<BaseState> =>
  state.set("agendaStartOnWeekday", action.newAgendaStartOnWeekday);

const setShouldStoreSettingsInSyncBackend = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOULD_STORE_SETTINGS_IN_SYNC_BACKEND";
    newShouldStoreSettingsInSyncBackend: boolean;
  },
): MapOf<BaseState> =>
  state.set(
    "shouldStoreSettingsInSyncBackend",
    action.newShouldStoreSettingsInSyncBackend,
  );

const setShouldLiveSync = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOULD_LIVE_SYNC";
    shouldLiveSync: boolean;
  },
): MapOf<BaseState> => state.set("shouldLiveSync", action.shouldLiveSync);

const setShowDeadlineDisplay = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOW_DEADLINE_DISPLAY";
    showDeadlineDisplay: boolean;
  },
): MapOf<BaseState> =>
  state.set("showDeadlineDisplay", action.showDeadlineDisplay);

const setShouldSyncOnBecomingVisibile = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOULD_SYNC_ON_BECOMING_VISIBLE";
    shouldSyncOnBecomingVisibile: boolean;
  },
): MapOf<BaseState> =>
  state.set(
    "shouldSyncOnBecomingVisibile",
    action.shouldSyncOnBecomingVisibile,
  );

const setShouldShowTitleInOrgFile = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOULD_SHOW_TITLE_IN_ORG_FILE";
    shouldShowTitleInOrgFile: boolean;
  },
): MapOf<BaseState> =>
  state.set("shouldShowTitleInOrgFile", action.shouldShowTitleInOrgFile);

const setShouldLogIntoDrawer = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOULD_LOG_INTO_DRAWER";
    shouldLogIntoDrawer: boolean;
  },
): MapOf<BaseState> =>
  state.set("shouldLogIntoDrawer", action.shouldLogIntoDrawer);

const setCloseSubheadersRecursively = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_CLOSE_SUBHEADERS_RECURSIVELY";
    closeSubheadersRecursively: boolean;
  },
): MapOf<BaseState> =>
  state.set("closeSubheadersRecursively", action.closeSubheadersRecursively);

/**
 * When enabled, keep all heading body text flush-left. When disabled (the
 * default) indent the body text of headings according to the nesting level of
 * the heading.
 */
const setShouldNotIndentOnExport = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_SHOULD_NOT_INDENT_ON_EXPORT";
    shouldNotIndentOnExport: boolean;
  },
): MapOf<BaseState> =>
  state.set("shouldNotIndentOnExport", action.shouldNotIndentOnExport);

const setHasUnseenChangelog = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_HAS_UNSEEN_CHANGELOG";
    newHasUnseenChangelog: boolean;
  },
): MapOf<BaseState> =>
  state.set("hasUnseenChangelog", action.newHasUnseenChangelog);

const setLastSeenChangelogHeader = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_LAST_SEEN_CHANGELOG_HEADER";
    newLastSeenChangelogHash: string;
  },
): MapOf<BaseState> =>
  state.set("lastSeenChangelogHash", action.newLastSeenChangelogHash);

const setLastViewedFile = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_LAST_VIEWED_FILE";
    lastViewedPath: string;
  },
): MapOf<BaseState> => state.set("lastViewedPath", action.lastViewedPath);

const setCustomKeybinding = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_CUSTOM_KEYBINDING";
    keybindingName: string;
    keybinding: string;
  },
): MapOf<BaseState> => {
  if (!state.get("customKeybindings")) {
    state = state.set("customKeybindings", Map());
  }

  return state.setIn(
    ["customKeybindings", action.keybindingName],
    action.keybinding,
  );
};

const restoreBaseSettings = (
  state: MapOf<BaseState>,
  action: {
    type: "RESTORE_BASE_SETTINGS";
    newSettings: Record<string, string>;
  },
): MapOf<BaseState> => {
  if (!action.newSettings) {
    return state;
  }
  return applyCategorySettingsFromConfig(state, action.newSettings, "base");
};

const pushModalPage = (
  state: MapOf<BaseState>,
  action: {
    type: "PUSH_MODAL_PAGE";
    modalPage: ModalPage;
  },
): MapOf<BaseState> =>
  state.update(
    "modalPageStack",
    (
      stack: List<ModalPage>,
    ) => (!!stack ? stack.push(action.modalPage) : List([action.modalPage])),
  );

const popModalPage = (state: MapOf<BaseState>) =>
  state.update(
    "modalPageStack",
    (
      stack: List<ModalPage>
    ) => (!!stack ? stack.pop() : stack),
  );

const clearModalStack = (state: MapOf<BaseState>) =>
  state.set("modalPageStack", List());

const activatePopup = (
  state: MapOf<BaseState>,
  action: {
    type: "ACTIVATE_POPUP";
    popupType: PopupType;
    data: Record<string, string>;
  },
): MapOf<BaseState> => {
  const { data, popupType } = action;

  // Remember active popup in URL state for popups that are uniquely
  // identifiable (aka not related to a single header like tags,
  // properties or timestamps).
  if (["search", "task-list", "agenda"].includes(popupType)) {
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}#${popupType}`,
    );
  }

  // fix later, should not use fromJS here
  return state.set(
    "activePopup",
    fromJS({
      type: popupType,
      data,
    }),
  );
};

const closePopup = (state: MapOf<BaseState>): MapOf<BaseState> => {
  window.history.replaceState(
    "",
    document.title,
    window.location.pathname + window.location.search,
  );
  return state.set("activePopup", null);
};

const setIsLoading = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_IS_LOADING";
    isLoading: Set<string>;
    path: string;
  },
): MapOf<BaseState> => {
  if (action.isLoading) {
    return state.update("isLoading", (isLoading: Set<string>): Set<string> =>
      isLoading.add(action.path),
    );
  } else {
    return state.update("isLoading", (isLoading: Set<string>): Set<string> =>
      isLoading.delete(action.path),
    );
  }
};

const setIsOnline = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_IS_ONLINE";
    online: boolean;
  },
): MapOf<BaseState> => {
  return state.set("online", action.online);
};

const setAgendaTimeframe = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_AGENDA_TIMEFRAME";
    agendaTimeframe: AgendaTimeframe;
  },
): MapOf<BaseState> => state.set("agendaTimeframe", action.agendaTimeframe);

const setFinderTab = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_FINDER_TAB";
    finderTab: FinderTab;
  },
): MapOf<BaseState> => state.set("finderTab", action.finderTab);

const setPreferEditRawValues = (
  state: MapOf<BaseState>,
  action: {
    type: "PREFER_EDIT_RAW_VALUES";
    preferEditRawValues: boolean;
  },
): MapOf<BaseState> =>
  state.set("preferEditRawValues", action.preferEditRawValues);

const setColorScheme = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_COLOR_SCHEME";
    colorScheme: string;
  },
): MapOf<BaseState> => {
  return state.set("colorScheme", action.colorScheme);
};

const setTheme = (
  state: MapOf<BaseState>,
  action: {
    type: "SET_THEME";
    theme: string;
  },
): MapOf<BaseState> => {
  return state.set("theme", action.theme);
};

/**
 * Reducer that is responsible for the "base" state slice.
 */
export default (
  state: MapOf<BaseState> = Map({} as BaseState),
  action: BaseAction,
): MapOf<BaseState> => {
  switch (action.type) {
    case "SET_LOADING_MESSAGE":
      return setLoadingMessage(state, action);
    case "HIDE_LOADING_MESSAGE":
      return hideLoadingMessage(state, action);
    case "SET_FONT_SIZE":
      return setFontSize(state, action);
    case "SET_BULLET_STYLE":
      return setBulletStyle(state, action);
    case "SET_SHOULD_TAP_TODO_TO_ADVANCE":
      return setShouldTapTodoToAdvance(state, action);
    case "SET_AGENDA_DEFAULT_DEADLINE_DELAY_UNIT":
      return setAgendaDefaultDeadlineDelayUnit(state, action);
    case "SET_AGENDA_DEFAULT_DEADLINE_DELAY_VALUE":
      return setAgendaDefaultDeadlineDelayValue(state, action);
    case "SET_EDITOR_DESCRIPTION_HEIGHT_VALUE":
      return setEditorDescriptionHeightValue(state, action);
    case "SET_AGENDA_START_ON_WEEKDAY":
      return setAgendaStartOnWeekday(state, action);
    case "SET_SHOULD_STORE_SETTINGS_IN_SYNC_BACKEND":
      return setShouldStoreSettingsInSyncBackend(state, action);
    case "SET_COLOR_SCHEME":
      return setColorScheme(state, action);
    case "SET_THEME":
      return setTheme(state, action);
    case "SET_SHOULD_LIVE_SYNC":
      return setShouldLiveSync(state, action);
    case "SET_SHOW_DEADLINE_DISPLAY":
      return setShowDeadlineDisplay(state, action);
    case "SET_SHOULD_SYNC_ON_BECOMING_VISIBLE":
      return setShouldSyncOnBecomingVisibile(state, action);
    case "SET_SHOULD_SHOW_TITLE_IN_ORG_FILE":
      return setShouldShowTitleInOrgFile(state, action);
    case "SET_SHOULD_LOG_INTO_DRAWER":
      return setShouldLogIntoDrawer(state, action);
    case "SET_CLOSE_SUBHEADERS_RECURSIVELY":
      return setCloseSubheadersRecursively(state, action);
    case "SET_SHOULD_NOT_INDENT_ON_EXPORT":
      return setShouldNotIndentOnExport(state, action);
    case "SET_HAS_UNSEEN_CHANGELOG":
      return setHasUnseenChangelog(state, action);
    case "SET_LAST_SEEN_CHANGELOG_HEADER":
      return setLastSeenChangelogHeader(state, action);
    case "SET_LAST_VIEWED_FILE":
      return setLastViewedFile(state, action);
    case "SET_CUSTOM_KEYBINDING":
      return setCustomKeybinding(state, action);
    case "RESTORE_BASE_SETTINGS":
      return restoreBaseSettings(state, action);
    case "PUSH_MODAL_PAGE":
      return pushModalPage(state, action);
    case "POP_MODAL_PAGE":
      return popModalPage(state, action);
    case "CLEAR_MODAL_STACK":
      return clearModalStack(state, action);
    case "ACTIVATE_POPUP":
      return activatePopup(state, action);
    case "CLOSE_POPUP":
      return closePopup(state, action);
    case "SET_IS_LOADING":
      return setIsLoading(state, action);
    case "SET_IS_ONLINE":
      return setIsOnline(state, action);
    case "SET_AGENDA_TIMEFRAME":
      return setAgendaTimeframe(state, action);
    case "SET_FINDER_TAB":
      return setFinderTab(state, action);
    case "PREFER_EDIT_RAW_VALUES":
      return setPreferEditRawValues(state, action);
    default:
      return state;
  }
};
