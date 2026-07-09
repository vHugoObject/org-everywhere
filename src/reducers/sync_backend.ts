import { Map, List } from "immutable";
import type { MapOf } from "immutable";
import type {
  SyncBackend,
  SyncBackendAction,
  DirectoryListingEntry,
  AdditionalSyncBackendState,
  DirectoryListing,
} from "../types";

const signOut = (state: MapOf<SyncBackend>): MapOf<SyncBackend> =>
  state.set("isAuthenticated", false).set("client", null);

const setCurrentFileBrowserDirectoryListing = (
  state: MapOf<SyncBackend>,
  action: {
    type: "SET_CURRENT_FILE_BROWSER_DIRECTORY_LISTING";
    directoryListing: List<MapOf<DirectoryListingEntry>>;
    hasMore: boolean;
    additionalSyncBackendState: MapOf<AdditionalSyncBackendState>;
    path: string;
  },
): MapOf<SyncBackend> => {
  const currentFileBrowserDirectoryListing = Map({
    listing: action.directoryListing,
    hasMore: action.hasMore,
    additionalSyncBackendState: action.additionalSyncBackendState,
  });

  return state
    .set(
      "currentFileBrowserDirectoryListing",
      currentFileBrowserDirectoryListing,
    )
    .set("currentPath", action.path);
};

const setIsLoadingMoreDirectoryListing = (state, action) =>
  state
    .update(
      "currentFileBrowserDirectoryListing",
      (currentFileBrowserDirectoryListing: DirectoryListing) =>
        !!currentFileBrowserDirectoryListing
          ? currentFileBrowserDirectoryListing
          : Map(),
    )
    .setIn(
      ["currentFileBrowserDirectoryListing", "isLoadingMore"],
      action.isLoadingMore,
    );

export default (state = Map(), action: SyncBackendAction) => {
  switch (action.type) {
    case "SIGN_OUT":
      return signOut(state);
    case "SET_CURRENT_FILE_BROWSER_DIRECTORY_LISTING":
      return setCurrentFileBrowserDirectoryListing(state, action);
    case "SET_IS_LOADING_MORE_DIRECTORY_LISTING":
      return setIsLoadingMoreDirectoryListing(state, action);
    default:
      return state;
  }
};
