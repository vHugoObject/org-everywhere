import { List } from "immutable";
import type { MapOf } from "immutable";
import type { ActionTypes } from "redux-undo";

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export type AgendaTimeframe = "Week" | "Day" | "Month";
export type TimestampUnits = "h" | "d" | "m" | "w" | "y";
export type DelayUnit = TimestampUnits;
export type RepeaterUnit = TimestampUnits;

export type LogEntryType = "start" | "end";
export type PlanningType = "DEADLINE" | "SCHEDULED";

export type Context = "agenda" | "search" | "task-list" | "refile";
export type FinderTab = "Search" | "Clock List" | "Task List";
export type BulletStyle = "Fancy" | "Classic";

export type OrgTodoKeywordSet = {
  keywords: Array<string>;
  completedKeywords: Array<string>;
  configLine?: string;
  default: boolean;
};

export type OrgFileConfig = {
  todoKeywordSets: List<OrgTodoKeywordSet>;
  fileConfigLines: List<string>;
};

export type OrgTimestampPart = {
  isActive: boolean;
  year: string;
  month: string;
  day: string;
  dayName: string | undefined;
  startHour: string | undefined;
  startMinute: string | undefined;
  endHour: string | undefined;
  endMinute: string | undefined;
  repeaterType: string | undefined;
  repeaterValue: string | undefined;
  repeaterUnit: string | undefined;
  delayType: string | undefined;
  delayValue: string | undefined;
  delayUnit: string | undefined;
  repeaterDeadlineValue: string | undefined;
  repeaterDeadlineUnit: string | undefined;
};

export type OrgMarkupType =
  | "inline-code"
  | "bold"
  | "italic"
  | "strikethrough"
  | "underline"
  | "verbatim";

export type OrgLinkToken = {
  type: "link";
  rawText: string;
  uri: string;
  title?: string;
  index: number;
};

export type OrgSimpleToken =
  | OrgLinkToken
  | {
      type: "percentage-cookie";
      rawText: string;
      percentage: string | undefined;
      index: number;
    }
  | {
      type: "fraction-cookie";
      rawText: string;
      fraction: [string | undefined, string | undefined];
      index: number;
    }
  | {
      type: "inline-markup";
      rawText: string;
      index: number;
      content: string;
      markupType: OrgMarkupType | undefined;
    }
  | {
      type: "timestamp";
      rawText: string;
      index: number;
      firstTimestamp: OrgTimestampPart | null;
      secondTimestamp: OrgTimestampPart | null;
    }
  | {
      type: "url";
      rawText: string;
      index: number;
    }
  | {
      type: "e-mail";
      rawText: string;
      index: number;
    }
  | {
      type: "phone-number";
      rawText: string;
      index: number;
    }
  | {
      type: "www-url";
      rawText: string;
      index: number;
    };

export type OrgRawListContentToken = {
  type: "raw-list-content";
  line: string;
};
export type OrgRawListHeaderToken = {
  type: "raw-list-header";
  line: string;
};

export type OrgRawTableToken = {
  type: "raw-table";
  line: string;
};

export type OrgRecursiveToken =
  | OrgRawTableToken
  | OrgRawListHeaderToken
  | OrgRawListContentToken;

export type OrgToken = OrgRecursiveToken | OrgSimpleToken;

export type OrgText = {
  type: "text";
  contents: string;
};

export type OrgLink = {
  id: number;
  type: "link";
  contents: {
    uri: string;
    title?: string;
  };
};

export type OrgPercentageCookie = {
  id: number;
  type: "percentage-cookie";
  percentage: string | undefined;
};

export type OrgFractionCookie = {
  id: number;
  type: "fraction-cookie";
  fraction: [string | undefined, string | undefined];
};

export type OrgInlineMarkup = {
  id: number;
  type: "inline-markup";
  content: string;
  markupType: OrgMarkupType | undefined;
};

export type OrgClockString = {
  id: number;
  type: "timestamp";
  firstTimestamp: OrgTimestampPart | null;
  secondTimestamp: OrgTimestampPart | null;
};

export type OrgTimestamp = {
  id: number;
  type: "timestamp";
  timestamp: MapOf<OrgTimestamp>;
};

export type OrgPropertyListItem = {
  property: string;
  value: OrgText | OrgTimestamp | Array<OrgElement> | null;
  id: number;
};

export type OrgCheckboxState = "unchecked" | "checked" | "partial";

export type OrgListItem = {
  id: number;
  titleLine: Array<OrgElement>;
  contents: any;
  forceNumber: string | null;
  isCheckbox: boolean;
  checkboxState: OrgCheckboxState | null;
};

export type OrgList = {
  type: "list";
  id: number;
  items: List<OrgListItem>;
  bulletCharacter: string;
  numberTerminatorCharacter: string | null;
  isOrdered: boolean;
};

export type OrgTableCell = {
  id: number;
  type: "table-cell";
  contents: List<string | OrgInlineMarkup>;
  rawContents: string;
};

export type OrgTableRow = {
  id: number;
  type: "table-row";
  contents: Array<OrgTableCell>;
};

export type OrgTable = {
  id: number;
  type: "table";
  contents: Array<OrgTableRow>;
  columnProperties: Array<any>;
};

export type OrgTitleLine = {
  title: string;
  rawTitle: string;
  todoKeyword: string;
  tags: Array<string>;
};

export type OrgHeadline = {
  titleLine: OrgTitleLine;
  rawDescription: string;
  description: Array<any>;
  opened: boolean;
  id: number;
  nestingLevel: number;
  planningItems: Array<any>;
  propertyListItems: Array<OrgPropertyListItem>;
  logNotes: Array<any>;
  logBookEntries: Array<any>;
};

export type OrgElement =
  | OrgLink
  | OrgPercentageCookie
  | OrgFractionCookie
  | OrgInlineMarkup
  | OrgTimestamp
  | OrgClockString
  | OrgListItem
  | OrgList
  | OrgTable
  | OrgTableCell
  | OrgHeadline
  | OrgText
  | {
      id: number;
      type: "url" | "phone-number" | "e-mail" | "www-url";
      content: string;
    };

export type OrgFile = {
  headers: List<OrgHeadline>;
  activeClocks: number;
  todoKeywordSets: List<MapOf<OrgTodoKeywordSet>>;
  fileConfigLines: List<string>;
  linesBeforeHeadings: List<string>;
};

export type ClientType = "WebDAV" | "Dropbox" | "GitLab";

export type DirectoryListingEntry = {
  id: string;
  name: string;
  isDirectory: boolean;
  path: string | undefined;
};

export type AdditionalSyncBackendState = {
  cursor: string;
};

export type DirectoryListing = {
  listing: List<MapOf<DirectoryListingEntry>>;
  hasMore: boolean;
  isLoadingMore?: boolean;
  additionalSyncBackendState: MapOf<AdditionalSyncBackendState>;
};

export interface Client {
  type: ClientType;
  isSignedIn: () => Promise<boolean>;
  getDirectoryListing: (path: string) => Promise<DirectoryListing>;
  getMoreDirectoryListing: (
    additionalSyncBackendState: MapOf<AdditionalSyncBackendState>,
  ) => Promise<DirectoryListing>;
  updateFile: (path: string, contents: string) => Promise<any>;
  createFile: (path: string, contents: string) => Promise<any>;
  getFileContentsAndMetadata: (
    path: string,
  ) => Promise<{ contents: string; lastModifiedAt: string }>;
  getFileContents: (path: string) => Promise<string>;
  deleteFile: (path: string) => Promise<any>;
}

export type ForceAction = "manual" | "push" | "pull" | null;

export interface SyncOptions {
  forceAction: ForceAction;
  successMessage: string;
  shouldSuppressMessages: boolean;
  path: string;
}

export type EditModeType =
  | "list-title"
  | "list-contents"
  | "table"
  | "description";

export type PopupType =
  | "deadline-editor"
  | "scheduled-editor"
  | "timestamp-editor"
  | "sync-confirmation"
  | "capture"
  | "tags-editor"
  | "property-list-editor"
  | "agenda"
  | "search"
  | "refile"
  | "title-editor"
  | "description-editor"
  | "table-editor";

export type ModalPage =
  | "sample"
  | "keyboard_shortcuts_editor"
  | "capture_templates_editor"
  | "file_settings_editor"
  | "settings";

export type Search = {
  searchFilter: string;
  searchFilterExpr: Array<string>;
};

export type Bookmark = {
  search: List<Search>;
  "task-list": List<string>;
  refile: List<string>;
};

export type FileSetting = {
  id: number;
  path: string;
  loadOnStartup: boolean;
  includeInAgenda: boolean;
  includeInSearch: boolean;
  includeInRefile: boolean;
  includeInTasklist: boolean;
};

export type PendingCapture = {
  capturePath: string;
  captureTemplateName: string;
  captureContent: string;
  customCaptureVariables: Map<string, string>;
};

export type SyncBackendAction =
  | { type: "SIGN_OUT" }
  | {
      type: "SET_CURRENT_FILE_BROWSER_DIRECTORY_LISTING";
      directoryListing: DirectoryListing;
      hasMore: boolean;
      additionalSyncBackendState: AdditionalSyncBackendState;
      path: string;
    }
  | { type: "SET_IS_LOADING_MORE_DIRECTORY_LISTING"; isLoadingMore: boolean };

export type OrgAction =
  | {
      type: "PARSE_FILE";
      path: string;
      contents: string;
    }
  | {
      type: "SET_LAST_SYNC_AT";
      path: string;
      lastSyncAt: Date;
    }
  | {
      type: "CLEAR_SEARCH";
    }
  | {
      type: "OPEN_HEADER";
      headerId: number;
    }
  | {
      type: "TOGGLE_HEADER_OPENED";
      headerId: number;
      closeSubheadersRecursively: boolean;
    }
  | {
      type: "SELECT_HEADER";
      headerId: number;
    }
  | {
      type: "SELECT_HEADER_INDEX";
      headerIndex: number;
    }
  | {
      type: "SET_PATH";
      path: string;
    }
  | {
    type: ActionTypes;
    }
  | {
      type: "OPEN_PARENTS_OF_HEADER";
      headerId: number;
    }
  | {
      type: "ADVANCE_TODO_STATE";
      headerId: number;
      logIntoDrawer: boolean;
      dirtying: boolean;
      timestamp: Date;
    }
  | {
      type: "SET_TODO_STATE";
      newTodoState: string;
      headerId: number;
      logIntoDrawer: boolean;
      dirtying: boolean;
      timestamp: Date;
    }
  | {
      type: "ENTER_EDIT_MODE";
      editModeType: EditModeType;
    }
  | {
      type: "EXIT_EDIT_MODE";
    }
  | {
      type: "UPDATE_HEADER_TppITLE";
      headerId: number;
      newRawTitle: string;
      dirtying: boolean;
    }
  | {
      type: "UPDATE_HEADER_DESCRIPTION";
      headerId: number;
      newRawDescription: string;
      dirtying: boolean;
    }
  | {
      type: "ADD_HEADER";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "DUPLICATE_HEADER";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "CREATE_FIRST_HEADER";
      dirtying: boolean;
    }
  | {
      type: "SELECT_NEXT_SIBLING_HEADER";
      headerId: number;
    }
  | {
      type: "SELECT_NEXT_VISIBLE_HEADER";
      headerId: number;
    }
  | {
      type: "SELECT_PREVIOUS_VISIBLE_HEADER";
      headerId: number;
    }
  | {
      type: "REMOVE_HEADER";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "MOVE_HEADER_UP";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "MOVE_HEADER_DOWN";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "MOVE_HEADER_LEFT";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "MOVE_HEADER_RIGHT";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "MOVE_SUBTREE_LEFT";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "MOVE_SUBTREE_RIGHT";
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "REFILE_SUBTREE";
      sourcePath: string;
      sourceHeaderId: number;
      targetPath: string;
      targetHeaderId: number;
      dirtying: boolean;
    }
  | {
      type: "HEADER_ADD_NOTE";
      inputText: string;
      currentDate: Date;
      dirtying: boolean;
    }
  | {
      type: "NARROW_HEADER";
      headerId: number;
    }
  | {
      type: "WIDEN_HEADER";
    }
  | {
      type: "SET_OPENNESS_STATE";
      path: string;
      opennessState: boolean;
    }
  | {
      type: "APPLY_OPENNESS_STATE";
      path: string;
    }
  | {
      type: "SET_DIRTY";
      isDirty: boolean;
      path: string;
    }
  | {
      type: "SET_SELECTED_DESCRIPTION_ITEM_INDEX";
      itemIndex: number;
    }
  | {
      type: "SET_SELECTED_TABLE_ID";
      tableId: number;
    }
  | {
      type: "SET_SELECTED_TABLE_CELL_ID";
      cellId: number;
    }
  | {
      type: "ADD_NEW_TABLE_ROW";
      dirtying: boolean;
    }
  | {
      type: "REMOVE_TABLE_ROW";
      dirtying: boolean;
    }
  | {
      type: "ADD_NEW_TABLE_COLUMN";
      dirtying: boolean;
    }
  | {
      type: "REMOVE_TABLE_COLUMN";
      dirtying: boolean;
    }
  | {
      type: "MOVE_TABLE_ROW_DOWN";
      dirtying: boolean;
    }
  | {
      type: "MOVE_TABLE_ROW_UP";
      dirtying: boolean;
    }
  | {
      type: "MOVE_TABLE_COLUMN_LEFT";
      dirtying: boolean;
    }
  | {
      type: "MOVE_TABLE_COLUMN_RIGHT";
      dirtying: boolean;
    }
  | {
      type: "UPDATE_TABLE_CELL_VALUE";
      cellId: number;
      newValue: string;
      dirtying: boolean;
    }
  | {
      type: "INSERT_CAPTURE";
      template: string;
      content: string;
      shouldPrepend: boolean;
      dirtying: boolean;
    }
  | {
      type: "CLEAR_PENDING_CAPTURE";
    }
  | {
      type: "ADVANCE_CHECKBOX_STATE";
      listItemId: number;
      dirtying: boolean;
    }
  | {
      type: "SET_SELECTED_LIST_ITEM_ID";
      listItemId: number;
    }
  | {
      type: "UPDATE_LIST_TITLE_VALUE";
      listItemId: number;
      newValue: string;
      dirtying: boolean;
    }
  | {
      type: "UPDATE_LIST_CONTENTS_VALUE";
      listItemId: number;
      newValue: string;
      dirtying: boolean;
    }
  | {
      type: "ADD_NEW_LIST_ITEM";
      dirtying: boolean;
    }
  | {
      type: "SELECT_NEXT_SIBLING_LIST_ITEM";
    }
  | {
      type: "REMOVE_LIST_ITEM";
      dirtying: boolean;
    }
  | {
      type: "MOVE_LIST_ITEM_UP";
      dirtying: boolean;
    }
  | {
      type: "MOVE_LIST_ITEM_DOWN";
      dirtying: boolean;
    }
  | {
      type: "MOVE_LIST_ITEM_LEFT";
      dirtying: boolean;
    }
  | {
      type: "MOVE_LIST_ITEM_RIGHT";
      dirtying: boolean;
    }
  | {
      type: "MOVE_LIST_SUBTREE_LEFT";
      dirtying: boolean;
    }
  | {
      type: "MOVE_LIST_SUBTREE_RIGHT";
      dirtying: boolean;
    }
  | {
      type: "SET_HEADER_TAGS";
      headerId: number;
      tags: Array<string>;
      dirtying: boolean;
    }
  | {
      type: "REORDER_TAGS";
      fromIndex: number;
      toIndex: number;
      dirtying: boolean;
    }
  | {
      type: "REORDER_PROPERTY_LIST";
      fromIndex: number;
      toIndex: number;
      headerId: number;
      dirtying: boolean;
    }
  | {
      type: "UPDATE_TIMESTAMP_WITH_ID";
      timestampId: number;
      newTimestamp: OrgTimestampPart;
      dirtying: boolean;
    }
  | {
      type: "UPDATE_PLANNING_ITEM_TIMESTAMP";
      headerId: number;
      planningItemIndex: number;
      newTimestamp: OrgTimestampPart;
      dirtying: boolean;
    }
  | {
      type: "ADD_NEW_PLANNING_ITEM";
      headerId: number;
      planningType: PlanningType;
      dirtying: boolean;
      timestamp: Date;
    }
  | {
      type: "REMOVE_PLANNING_ITEM";
      headerId: number;
      planningItemIndex: number;
      dirtying: boolean;
    }
  | {
      type: "REMOVE_TIMESTAMP";
      headerId: number;
      timestampId: number;
      dirtying: boolean;
    }
  | {
      type: "UPDATE_PROPERTY_LIST_ITEMS";
      headerId: number;
      newPropertyListItems: Array<string>;
      dirtying: boolean;
    }
  | {
      type: "SET_ORG_FILE_ERROR_MESSAGE";
      message: string;
    }
  | {
      type: "SET_LOG_ENTRY_STOP";
      headerId: number;
      entryId: number;
      time: Date;
      dirtying: boolean;
    }
  | {
      type: "CREATE_LOG_ENTRY_START";
      headerId: number;
      time: Date;
      dirtying: boolean;
    }
  | {
      type: "UPDATE_LOG_ENTRY_TIME";
      headerId: number;
      entryIndex: number;
      entryType: LogEntryType;
      newTime: Date;
      dirtying: boolean;
    }
  | {
      type: "SET_SEARCH_FILTER_INFORMATION";
      searchFilter: string;
      cursorPosition: number;
      context: Context;
    }
  | {
      type: "TOGGLE_CLOCK_DISPLAY";
      showClockDisplay: boolean;
    }
  | {
      type: "UPDATE_FILE_SETTING_FIELD_PATH_VALUE";
      settingId: number;
      fieldPath: string;
      newValue: string;
    }
  | {
      type: "REORDER_FILE_SETTING";
      fromIndex: number;
      toIndex: number;
    }
  | {
      type: "DELETE_FILE_SETTING";
      settingId: number;
    }
  | {
      type: "ADD_NEW_EMPTY_FILE_SETTING";
    }
  | {
      type: "RESTORE_FILE_SETTINGS";
      newSettings: Record<string, string>;
    }
  | {
      type: "SAVE_BOOKMARK";
      context: Context;
      bookmark: string;
    }
  | {
      type: "DELETE_BOOKMARK";
      context: Context;
      bookmark: string;
    }
  | {
      type: "ADD_NEW_FILE";
      path: string;
      content: string;
    }
  | {
      type: "UPDATE_HEADER_TITLE";
      newRawTitle: string;
      headerId: number;
    }
  | {
      type: "TIMESTAMP_TITLE";
    }
  | {
      type: "TIMESTAMP_DESCRIPTION";
    };

export type UpdateOrgCaptureAction = {
  type: "UPDATE_TEMPLATE_FIELD_PATH_VALUE";
  templateId: number;
  fieldPath: string;
  newValue: string;
};
export type OrgCaptureUpdateAction =
  | {
      type: "ADD_NEW_TEMPLATE_ORG_FILE_AVAILABILITY";
      templateId: number;
    }
  | {
      type: "REMOVE_TEMPLATE_ORG_FILE_AVAILABILITY";
      templateId: number;
      orgFileAvailabilityIndex: number;
    }
  | {
      type: "ADD_NEW_TEMPLATE_HEADER_PATH";
      templateId: number;
    }
  | {
      type: "REMOVE_TEMPLATE_HEADER_PATH";
      templateId: number;
      headerPathIndex: number;
    }
  | {
      type: "DELETE_TEMPLATE";
      templateId: number;
    }
  | UpdateOrgCaptureAction;

export type ReorderOrgCaptureTemplateAction = {
  type: "REORDER_CAPTURE_TEMPLATE";
  fromIndex: number;
  toIndex: number;
};

export type RestoreOrgCaptureAction = {
  type: "RESTORE_CAPTURE_SETTINGS";
  newSettings: Record<string, string>;
};

export type OrgCaptureAction =
  | {
      type: "ADD_NEW_EMPTY_CAPTURE_TEMPLATE";
    }
  | RestoreOrgCaptureAction
  | ReorderOrgCaptureTemplateAction
  | OrgCaptureUpdateAction;

export type BaseAction =
  | {
      type: "SET_LOADING_MESSAGE";
      loadingMessage: string;
    }
  | {
      type: "HIDE_LOADING_MESSAGE";
    }
  | {
      type: "SET_IS_LOADING";
      isLoading: boolean;
      path: string;
    }
  | {
      type: "SET_IS_ONLINE";
      online: boolean;
    }
  | {
      type: "SET_LAST_VIEWED_FILE";
      lastViewedPath: string;
    }
  | {
      type: "SET_FONT_SIZE";
      newFontSize: number;
    }
  | {
      type: "SET_BULLET_STYLE";
      newBulletStyle: string;
    }
  | {
      type: "SET_SHOULD_TAP_TODO_TO_ADVANCE";
      newShouldTapTodoToAdvance: boolean;
    }
  | {
      type: "SET_AGENDA_DEFAULT_DEADLINE_DELAY_UNIT";
      newAgendaDefaultDeadlineDelayUnit: DelayUnit;
    }
  | {
      type: "SET_AGENDA_DEFAULT_DEADLINE_DELAY_VALUE";
      newAgendaDefaultDeadlineDelayValue: number;
    }
  | {
      type: "SET_EDITOR_DESCRIPTION_HEIGHT_VALUE";
      newEditorDescriptionHeightValue: number;
    }
  | {
      type: "SET_AGENDA_START_ON_WEEKDAY";
      newAgendaStartOnWeekday: boolean;
    }
  | {
      type: "SET_SHOULD_LIVE_SYNC";
      shouldLiveSync: boolean;
    }
  | {
      type: "SET_SHOW_DEADLINE_DISPLAY";
      showDeadlineDisplay: boolean;
    }
  | {
      type: "SET_SHOULD_SYNC_ON_BECOMING_VISIBLE";
      shouldSyncOnBecomingVisibile: boolean;
    }
  | {
      type: "SET_SHOULD_SHOW_TITLE_IN_ORG_FILE";
      shouldShowTitleInOrgFile: boolean;
    }
  | {
      type: "SET_SHOULD_LOG_INTO_DRAWER";
      shouldLogIntoDrawer: boolean;
    }
  | {
      type: "SET_CLOSE_SUBHEADERS_RECURSIVELY";
      closeSubheadersRecursively: boolean;
    }
  | {
      type: "SET_SHOULD_NOT_INDENT_ON_EXPORT";
      shouldNotIndentOnExport: boolean;
    }
  | {
      type: "SET_SHOULD_STORE_SETTINGS_IN_SYNC_BACKEND";
      newShouldStoreSettingsInSyncBackend: boolean;
    }
  | {
      type: "SET_COLOR_SCHEME";
      colorScheme: string;
    }
  | {
      type: "SET_THEME";
      theme: string;
    }
  | {
      type: "SET_CUSTOM_KEYBINDING";
      keybindingName: string;
      keybinding: string;
    }
  | {
      type: "RESTORE_BASE_SETTINGS";
      newSettings: Record<string, string>;
    }
  | {
      type: "PUSH_MODAL_PAGE";
      modalPage: ModalPage;
    }
  | {
      type: "POP_MODAL_PAGE";
    }
  | {
      type: "CLEAR_MODAL_STACK";
    }
  | {
      type: "ACTIVATE_POPUP";
      popupType: PopupType;
      data: Record<string, string>;
    }
  | {
      type: "CLOSE_POPUP";
    }
  | {
      type: "SET_AGENDA_TIMEFRAME";
      agendaTimeframe: AgendaTimeframe;
    }
  | {
      type: "SET_FINDER_TAB";
      finderTab: FinderTab;
    }
  | {
      type: "PREFER_EDIT_RAW_VALUES";
      preferEditRawValues: boolean;
    }
  | {
      type: "SET_HAS_UNSEEN_CHANGELOG";
      newHasUnseenChangelog: boolean;
    }
  | {
      type: "SET_LAST_SEEN_CHANGELOG_HEADER";
      newLastSeenChangelogHash: string;
    };

export type Action =
  | SyncBackendAction
  | BaseAction
  | OrgCaptureAction
  | OrgAction;

export type OrgCaptureTemplate = {
  id: number;
  description: string;
  letter: string;
  iconName: string;
  isAvailableInAllOrgFiles: boolean;
  file: string;
  orgFilesWhereAvailable: List<string>;
  headerPaths: List<string>;
  shouldPrepend: boolean;
  template: string;
};

export type SyncBackendState = {
  isAuthenticated: boolean;
  client: Client | null;
  currentFileBrowserDirectoryListing: MapOf<DirectoryListing>;
  currentPath: string;
};

export type OrgCaptureState = {
  captureTemplates: List<MapOf<OrgCaptureTemplate>>;
};

export type BaseState = {
  loadingMessage: string;
  fontSize: number;
  bulletStyle: BulletStyle;
  shouldTapTodoToAdvance: boolean;
  agendaDefaultDeadlineDelayUnit: DelayUnit;
  agendaDefaultDeadlineDelayValue: number;
  editorDescriptionHeightValue: number;
  agendaStartOnWeekday: boolean;
  shouldStoreSettingsInSyncBackend: boolean;
  shouldLiveSync: boolean;
  showDeadlineDisplay: boolean;
  shouldSyncOnBecomingVisibile: boolean;
  shouldShowTitleInOrgFile: boolean;
  shouldLogIntoDrawer: boolean;
  closeSubheadersRecursively: boolean;
  shouldNotIndentOnExport: boolean;
  hasUnseenChangelog: boolean;
  lastSeenChangelogHash: string;
  lastViewedPath: string;
  customKeybindings: Map<string, string>;
  modalPageStack: List<ModalPage>;
  activePopup: PopupType;
  isLoading: boolean;
  online: boolean;
  agendaTimeframe: AgendaTimeframe;
  finderTab: FinderTab;
  preferEditRawValues: boolean;
  colorScheme: string;
  theme: string;
};

export type OrgState = {
  files: List<OrgFile>;
  search: Search;
  headers: List<OrgHeadline>;
  narrowedHeaderId: number;
  selectedHeaderId: number;
  selectedHeaderIndex: number;
  todoKeywordSets: OrgTodoKeywordSet;
  editMode: EditModeType;
  linesBeforeHeadings: List<string>;
  opennessState: boolean;
  isDirty: boolean;
  selectedTableId: number;
  selectedDescriptionItemIndex: number;
  selectedTableCellId: number;
  pendingCapture: PendingCapture;
  checkboxState: OrgCheckboxState;
  titleLine: any;
  selectedListItemId: number;
  lastSyncAt: Date;
  activeClocks: number;
  path: string;
  fileSettings: List<FileSetting>;
  bookmarks: Bookmark;
  orgFileErrorMessage: string;
  showClockDisplay: boolean;
  fileConfigLines: Array<string>;
};
