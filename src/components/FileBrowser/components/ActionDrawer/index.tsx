// INFO: There's an <ActionDrawer> component within the <OrgFile>
// component, as well.

import React, { Fragment } from "react";
import { connect } from "react-redux";
import type { Dispatch } from "redux";
import { bindActionCreators } from "redux";
import { includes } from "lodash/fp";
import { List } from "immutable";
import type { MapOf } from "immutable";
import type { Client, DirectoryListingEntry } from "../../../../types";
import "../../stylesheet.css";

import * as orgActions from "../../../../actions/org";
import * as syncActions from "../../../../actions/sync_backend";

import ActionButton from "../../../OrgFile/components/ActionDrawer/components/ActionButton";

const ensureCompleteFilename = (fileName: string) => {
  return fileName.endsWith(".org") ? fileName : `${fileName}.org`;
};

interface ActionDrawerProps {
  org: any;
  files: List<MapOf<DirectoryListingEntry>>;
  syncBackend: Client;
  path: string;
}

const ActionDrawer = ({ org, files, syncBackend, path }: ActionDrawerProps) => {
  const handleAddNewOrgFileClick = () => {
    const content = "* First header\nExtend the file from here.";
    let fileName = prompt("New filename:");

    if (!fileName) return;

    fileName = ensureCompleteFilename(fileName);
    let newPath = `${path}/${fileName}`;

    if (includes(newPath, files)) {
      alert("File already exists. Aborting.");
    } else {
      syncBackend.createFile(newPath, content);
      org.addNewFile(newPath, content);
    }
  };

  const mainButtonStyle = {
    opacity: 1,
    position: "relative",
    zIndex: 1,
  };

  return (
    <div className="file-browser__action-drawer-container nice-scroll">
      {
        <Fragment>
          <div
            style={{
              marginLeft: "auto",
              marginRight: 0,
            }}
          >
            <ActionButton
              iconName="plus"
              isDisabled={false}
              onClick={handleAddNewOrgFileClick}
              style={mainButtonStyle}
              tooltip="Add new Org file"
            />
          </div>
        </Fragment>
      }
    </div>
  );
};

const mapStateToProps = (state) => {
  const path: string = state.syncBackend.get("currentPath");
  let files: List<MapOf<DirectoryListingEntry>> = state.syncBackend.getIn([
    "currentFileBrowserDirectoryListing",
    "listing",
  ]);
  // this does not make sense
  files = files ? files.map((e) => e.get("id")).toJS() : [];
  return {
    path,
    files,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    org: bindActionCreators(orgActions, dispatch),
    syncBackend: bindActionCreators(syncActions, dispatch),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ActionDrawer);
