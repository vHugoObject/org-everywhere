import React, { useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import type { Dispatch } from 'redux'
import { IconContext } from "react-icons";
import { FaFolder, FaSpinner } from "react-icons/fa";
import { Link } from "react-router-dom";
import { List } from "immutable";
import type { MapOf } from "immutable";
import type {
  SyncBackend,
  ClientType,
  Client,
  DirectoryListingEntry,
} from "../../types";
import { getIcon } from "../UI/icons";

import ActionDrawer from "./components/ActionDrawer";

import "./stylesheet.css";

import classNames from "classnames";

import * as syncBackendActions from "../../actions/sync_backend";

const RegularFileIcon = ({ file }: { file: MapOf<DirectoryListingEntry> }) => {
  const isBackupFile: boolean = file.get("name").endsWith(".organice-bak");
  const isOrgFile: boolean = file.get("name").endsWith(".org");
  const isSettingsFile: boolean = file.get("name") === ".organice-config.json";
  const iconName: string =
    (isBackupFile && "copy" && isSettingsFile && "cogs") || "file";

  const iconClass: string = classNames("file-browser__file-list__icon fas", {
    "file-browser__file-list__icon--not-org": !isOrgFile,
  });

  return (
    <Link to={`/file${file.get("path")}`} key={file.get("id")}>
      <li className="file-browser__file-list__element">
        <IconContext.Provider value={{ className: iconClass }}>
          <div>
            {getIcon(iconName)} {file.get("name")}
          </div>
        </IconContext.Provider>
      </li>
    </Link>
  );
};

const FileDirectoryIcon = ({
  file,
}: {
  file: MapOf<DirectoryListingEntry>;
}) => {
  const iconClass: string = classNames(
    "file-browser__file-list__icon fas",
    "file-browser__file-list__icon--directory",
    "file-browser__file-list__icon--not-org",
  );

  return (
    <Link to={`/files${file.get("path")}`} key={file.get("id")}>
      <li className="file-browser__file-list__element">
        <IconContext.Provider value={{ className: iconClass }}>
          <div>
            <FaFolder /> {file.get("name")}
          </div>
        </IconContext.Provider>
      </li>
    </Link>
  );
};

const FileIcon = ({ file }: { file: MapOf<DirectoryListingEntry> }) => {
  return file && file.get("isDirectory") ? (
    <FileDirectoryIcon file={file} />
  ) : (
    <RegularFileIcon file={file} />
  );
};

interface FileBrowserProps {
  path: string;
  listing: List<MapOf<DirectoryListingEntry>>;
  hasMore: boolean;
  isLoadingMore: boolean;
  syncBackendType: ClientType;
  syncBackend: any;
}

const FileBrowser = ({
  path,
  listing,
  hasMore,
  isLoadingMore,
  syncBackendType,
  syncBackend,
}: FileBrowserProps) => {
  useEffect(() => {
    syncBackend.getDirectoryListing(path);
  }, [syncBackend, path]);

  // is this the problem
  const handleLoadMoreClick = () => syncBackend.loadMoreDirectoryListing();

  // use path-parse here?
  const getParentDirectoryPath = () => {
    switch (syncBackendType) {
      case "Dropbox":
      case "GitLab":
      case "WebDAV":
        const pathParts = path.split("/");
        return pathParts.slice(0, pathParts.length - 1).join("/");
      default:
        return null;
    }
  };

  const isTopLevelDirectory = path === "";

  return (
    <div className="file-browser-container">
      {syncBackendType === "Dropbox" && (
        <h3 className="file-browser__header">
          Directory: {isTopLevelDirectory ? "/" : path}
        </h3>
      )}

      <ActionDrawer />

      <ul className="file-browser__file-list">
        {!isTopLevelDirectory && (
          <Link to={`/files${getParentDirectoryPath()}`}>
            <li className="file-browser__file-list__element">
              <IconContext.Provider
                value={{
                  className:
                    "fas fa-folder file-browser__file-list__icon--directory",
                }}
              >
                <div>
                  <FaFolder /> ..
                </div>
              </IconContext.Provider>
            </li>
          </Link>
        )}

        {(listing || []).map(
          (file: MapOf<DirectoryListingEntry>, key: number) => {
            return <FileIcon key={key} file={file} />;
          },
        )}

        {hasMore &&
          (isLoadingMore ? (
            <li className="file-browser__file-list__loading-more-container">
              <IconContext.Provider
                value={{
                  className: "fas fas-lg",
                }}
              >
                <div>
                  <FaSpinner />
                </div>
              </IconContext.Provider>
            </li>
          ) : (
            <li
              className="file-browser__file-list__element file-browser__file-list__element--load-more-row"
              onClick={handleLoadMoreClick}
            >
              Load more...
            </li>
          ))}
      </ul>
    </div>
  );
};

const mapStateToProps = (state) => {
  const currentFileBrowserDirectoryListing = state.syncBackend.get(
    "currentFileBrowserDirectoryListing",
  );
  return {
    syncBackendType: state.syncBackend.get("client").type,
    listing: !!currentFileBrowserDirectoryListing
      ? currentFileBrowserDirectoryListing.get("listing")
      : null,
    hasMore:
      !!currentFileBrowserDirectoryListing &&
      currentFileBrowserDirectoryListing.get("hasMore"),
    isLoadingMore:
      !!currentFileBrowserDirectoryListing &&
      currentFileBrowserDirectoryListing.get("isLoadingMore"),
    additionalSyncBackendState:
      !!currentFileBrowserDirectoryListing &&
      currentFileBrowserDirectoryListing.get("additionalSyncBackendState"),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    syncBackend: bindActionCreators(syncBackendActions, dispatch),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FileBrowser);
3;
