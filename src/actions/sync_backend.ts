import { addSeconds } from "date-fns";
import type { MapOf } from "immutable";
import { List } from "immutable";
import { get } from "lodash/fp";
import pathParse from "path-parse";
import { Dispatch } from "redux";
import { ActionCreators } from "redux-undo";
import { createGitlabOAuth } from "../sync_backend_clients/gitlab_sync_backend_client";
import type {
    AdditionalSyncBackendState,
    Client,
    DirectoryListing,
    DirectoryListingEntry,
    SyncBackendAction
} from "../types";
import {
    localStorageAvailable,
    persistField,
} from "../util/settings_persister";
import {
    clearModalStack,
    hideLoadingMessage,
    setIsLoading,
    setLoadingMessage,
} from "./base";
import {
    parseFile,
    setDirty,
    setLastSyncAt,
    setOrgFileErrorMessage,
} from "./org";

export const signOut = () => (dispatch: Dispatch, getState): void => {
  switch (getState().syncBackend.get("client", {}).type) {
    case "WebDAV":
      ["Endpoint", "Username", "Password"].forEach((e: string): void => {
        persistField("webdav" + e, null);
      });
      break;
    case "Dropbox":
      // `dropboxAccessToken` is a legacy token that was relevant
      // prior to switching to OAuth 2 and PKCE. Still deleting it
      // here for a consistent state in users localStorage.
      persistField("dropboxAccessToken", null);
      persistField("dropboxRefreshToken", null);
      persistField("codeVerifier", null);
      break;
    case "GitLab":
      persistField("gitLabProject", null);
      createGitlabOAuth().reset();
      break;
    default:
  }

  persistField("authenticatedSyncService", null);

  dispatch({ type: "SIGN_OUT" });
  dispatch(clearModalStack());
  dispatch(hideLoadingMessage());

  if (localStorageAvailable) {
    localStorage.clear();
  }
};

// path is optional?
export const setCurrentFileBrowserDirectoryListing = (
  directoryListing: List<MapOf<DirectoryListingEntry>>,
  hasMore: boolean,
  additionalSyncBackendState: MapOf<AdditionalSyncBackendState>,
  path: string,
): SyncBackendAction => ({
  type: "SET_CURRENT_FILE_BROWSER_DIRECTORY_LISTING",
  directoryListing,
  hasMore,
  additionalSyncBackendState,
  path,
});

export const setIsLoadingMoreDirectoryListing = (isLoadingMore: boolean): SyncBackendAction => ({
  type: "SET_IS_LOADING_MORE_DIRECTORY_LISTING",
  isLoadingMore,
});

export const getDirectoryListing = (path: string) => (dispatch: Dispatch, getState): void => {
  dispatch(setLoadingMessage("Getting listing..."));

  const client = getState().syncBackend.get("client");
  client
    .getDirectoryListing(path)
    .then(
      ({ listing, hasMore, additionalSyncBackendState }: DirectoryListing): void => {
        dispatch(
          setCurrentFileBrowserDirectoryListing(
            listing,
            hasMore,
            additionalSyncBackendState,
            path,
          ),
        );
        dispatch(hideLoadingMessage());
      },
    )
    .catch((error: { status: number }): void => {
      dispatch(hideLoadingMessage());
      const error_summary = get("error.error_summary", error) || "";
      if (
        [400, 401].includes(error.status) ||
        error_summary.includes("expired_access_token")
      ) {
        dispatch(signOut());
      } else {
        alert("There was an error retrieving files!");
        console.error(error);
      }
    });
};

export const loadMoreDirectoryListing = () => (dispatch: Dispatch, getState): void => {
  dispatch(setIsLoadingMoreDirectoryListing(true));

  const client: Client = getState().syncBackend.get("client");
  const currentFileBrowserDirectoryListing = getState().syncBackend.get(
    "currentFileBrowserDirectoryListing",
  );
  client
    .getMoreDirectoryListing(
      currentFileBrowserDirectoryListing.get("additionalSyncBackendState"),
    )
    .then(
      ({ listing, hasMore, additionalSyncBackendState }: DirectoryListing): void => {
        const extendedListing = currentFileBrowserDirectoryListing
          .get("listing")
          .concat(listing);
        dispatch(
          setCurrentFileBrowserDirectoryListing(
            extendedListing,
            hasMore,
            additionalSyncBackendState,
          ),
        );
        dispatch(setIsLoadingMoreDirectoryListing(false));
      },
    );
};

export const pushBackup = (pathOrFileId: string, contents: string) => {
  return (dispatch: Dispatch, getState): void => {
    const client = getState().syncBackend.get("client");
    switch (client.type) {
      case "Dropbox":
      case "WebDAV":
        client.createFile(`${pathOrFileId}.org-everywhere-bak`, contents);
        break;
      case "GitLab":
        // No-op for GitLab, because the beauty of version control makes backup files redundant.
        break;
      default:
    }
  };
};

export const downloadFile = (path: string) => {
  return (dispatch: Dispatch, getState): void => {
    dispatch(setLoadingMessage(`Downloading file ...`));
    getState()
      .syncBackend.get("client")
      .getFileContents(path)
      .then((fileContents: string): void => {
        dispatch(hideLoadingMessage());
        dispatch(pushBackup(path, fileContents));
        dispatch(parseFile(path, fileContents));
        dispatch(setLastSyncAt(addSeconds(new Date(), 5), path));
        dispatch(setDirty(false, path));
        dispatch(ActionCreators.clearHistory());
      })
      .catch((): void => {
        dispatch(hideLoadingMessage());
        dispatch(setIsLoading(false, path));
        dispatch(setOrgFileErrorMessage(`File ${path} not found`));
      });
  };
};


const dirName = (path: string): string => {
  return pathParse(path).dir;
}

export const createFile = (path: string, content: string) => {
  return (dispatch: Dispatch, getState): void => {
    dispatch(setLoadingMessage(`Creating file: ${path}`));
    getState()
      .syncBackend.get("client")
      .createFile(path, content)
      .then((): void => {
        dispatch(setLastSyncAt(addSeconds(new Date(), 5), path));
        dispatch(hideLoadingMessage());
        dispatch(getDirectoryListing(dirName(path)));
      })
      .catch((): void => {
        dispatch(hideLoadingMessage());
        dispatch(setIsLoading(false, path));
        dispatch(setOrgFileErrorMessage(`File ${path} not found`));
      });
  };
};
