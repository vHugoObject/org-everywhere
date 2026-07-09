import { Map, List } from "immutable";
import type { MapOf } from "immutable";
import type {
  SyncBackendState,
  SyncBackendAction,
  DirectoryListingEntry,
  AdditionalSyncBackendState,
  DirectoryListing,
} from "../types";

const signOut = (state: MapOf<SyncBackendState>): MapOf<SyncBackendState> =>
  state.set("isAuthenticated", false).set("client", null);

const setCurrentFileBrowserDirectoryListing = (
  state: MapOf<SyncBackendState>,
  action: {
    type: "SET_CURRENT_FILE_BROWSER_DIRECTORY_LISTING";
    directoryListing: List<MapOf<DirectoryListingEntry>>;
    hasMore: boolean;
    additionalSyncBackendState: MapOf<AdditionalSyncBackendState>;
    path: string;
  },
): MapOf<SyncBackendState> => {
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

const setIsLoadingMoreDirectoryListing = (
  state: MapOf<SyncBackendState>,
  action: {
    type: "SET_IS_LOADING_MORE_DIRECTORY_LISTING";
    isLoadingMore: boolean;
  },
) => {
  return state
    .update(
      "currentFileBrowserDirectoryListing",
      (
        currentFileBrowserDirectoryListing: MapOf<DirectoryListing>,
      ): MapOf<DirectoryListing> => {
        const emptyDirectoryListing = {} as DirectoryListing;
        return !!currentFileBrowserDirectoryListing
          ? currentFileBrowserDirectoryListing
          : Map(emptyDirectoryListing);
      },
    )
    .setIn(
      ["currentFileBrowserDirectoryListing", "isLoadingMore"],
      action.isLoadingMore,
    );
};

export default (
  state = Map({} as SyncBackendState),
  action: SyncBackendAction,
): MapOf<SyncBackendState> => {
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
