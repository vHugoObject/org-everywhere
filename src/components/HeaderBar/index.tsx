import React, { PureComponent, Fragment } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import type { Dispatch } from 'redux'
import {
  FaRedo,
  FaUndo,
  FaCogs,
  FaQuestionCircle,
  FaChevronLeft,
} from "react-icons/fa";
import { IconContext } from "react-icons";
import { isLandingPage } from "../../util/misc";
import { List } from "immutable";
import { bindAll, includes, last } from "lodash";
import classNames from "classnames";
import { Link, withRouter } from "react-router-dom";

import "./stylesheet.css";

import * as baseActions from "../../actions/base";
import * as orgActions from "../../actions/org";
import { ActionCreators as undoActions } from "redux-undo";

class HeaderBar extends PureComponent {
  constructor(props) {
    super(props);

    bindAll(this, [
      "handleModalPageDoneClick",
      "handleHeaderBarTitleClick",
      "handleBackClick",
      "handleUndoClick",
      "handleRedoClick",
      "handleHelpClick",
      "handleSettingsClick",
    ]);
  }

  getPathRoot() {
    const {
      location: { pathname },
    } = this.props;
    return pathname.split("/")[1];
  }

  getFilename() {
    const {
      location: { pathname },
    } = this.props;
    // only show a filename if it's a file and not a path
    if (pathname.includes(".org")) {
      return pathname.substring(
        pathname.lastIndexOf("/") + 1,
        pathname.lastIndexOf("."),
      );
    } else {
      return "";
    }
  }

  renderFileBrowserBackButton() {
    let backPath = "Back";
    const fileParts = window.location.href
      .split("/")
      .map((e) => decodeURIComponent(e));
    if (includes(fileParts, "files")) {
      backPath = last(fileParts);
    }

    return (
      <button
        onClick={() => {
          window.history.back();
        }}
        className="header-bar__back-button"
      >
        <FaChevronLeft />
        <span className="header-bar__back-button__directory-path">
          {backPath}
        </span>
      </button>
    );
  }

  renderOrgFileBackButton() {
    const {
      location: { pathname },
    } = this.props;

    let filePath = pathname.substr("/file".length);
    if (filePath.endsWith("/")) {
      filePath = filePath.substring(0, filePath.length - 1);
    }

    const pathParts = filePath.split("/");
    const directoryPath = pathParts.slice(0, pathParts.length - 1).join("/");

    return (
      <Link
        to={`/files${directoryPath}`}
        onClick={this.handleBackClick}
        className="header-bar__back-button"
      >
        <FaChevronLeft />
        <span className="header-bar__back-button__directory-path">
          File browser
        </span>
      </Link>
    );
  }

  renderHomeFileBackButton() {
    return (
      <Link to={`/`} className="header-bar__back-button">
        <FaChevronLeft />
        <span className="header-bar__back-button__directory-path">Home</span>
      </Link>
    );
  }

  renderSignInBackButton() {
    return (
      <Link to={`/`} className="header-bar__back-button">
        <FaChevronLeft />
        <span className="header-bar__back-button__directory-path">Home</span>
      </Link>
    );
  }

  handleBackClick() {
    this.props.base.popModalPage();
  }

  renderSettingsSubPageBackButton() {
    return (
      <div className="header-bar__back-button" onClick={this.handleBackClick}>
        <FaChevronLeft />
        <span className="header-bar__back-button__directory-path">
          Settings
        </span>
      </div>
    );
  }

  renderBackButton() {
    const { activeModalPage } = this.props;

    switch (activeModalPage) {
      case "keyboard_shortcuts_editor":
        return this.renderSettingsSubPageBackButton();
      case "capture_templates_editor":
        return this.renderSettingsSubPageBackButton();
      case "file_settings_editor":
        return this.renderSettingsSubPageBackButton();
      case "sample":
        return this.renderOrgFileBackButton();
      default:
    }

    switch (this.getPathRoot()) {
      case "files":
        return this.renderFileBrowserBackButton();
      case "file":
        return this.renderOrgFileBackButton();
      case "sample":
        return this.renderHomeFileBackButton();
      case "sign_in":
        return this.renderSignInBackButton();
      case "settings":
        return this.renderFileBrowserBackButton();
      default:
        return <div />;
    }
  }

  renderTitle() {
    const titleContainerWithText = (text) => (
      <div
        className="header-bar__title"
        onClick={this.handleHeaderBarTitleClick}
      >
        {text}
      </div>
    );

    switch (this.props.activeModalPage) {
      case "settings":
        return titleContainerWithText("Settings");
      case "keyboard_shortcuts_editor":
        return titleContainerWithText("Shortcuts");
      case "capture_templates_editor":
        return titleContainerWithText("Capture");
      case "file_settings_editor":
        return titleContainerWithText("Files");
      case "sample":
        return titleContainerWithText("Sample");
      default:
    }

    switch (this.getPathRoot()) {
      case "sample":
        return titleContainerWithText("Sample");
      case "sign_in":
        return titleContainerWithText("Sign in");
      case "settings":
        return titleContainerWithText("Settings");
      default:
    }

    return titleContainerWithText(
      this.props.shouldShowTitleInOrgFile ? this.getFilename() : "",
    );
  }

  handleModalPageDoneClick() {
    this.props.base.clearModalStack();
  }

  handleHeaderBarTitleClick() {
    this.props.org.selectHeader(null);
  }

  handleUndoClick() {
    if (this.props.isUndoEnabled) {
      this.props.undo.undo();
    }
  }

  handleRedoClick() {
    if (this.props.isRedoEnabled) {
      this.props.undo.redo();
    }
  }

  handleHelpClick() {
    this.props.base.restoreStaticFile("sample");
    this.props.base.pushModalPage("sample");
  }

  handleSettingsClick() {
    this.props.base.setLastViewedFile(this.props.path);
  }

  renderActions() {
    const {
      isAuthenticated,
      activeModalPage,
      path,
      isUndoEnabled,
      isRedoEnabled,
    } = this.props;

    if (!!activeModalPage) {
      return (
        <div
          className="header-bar__actions"
          onClick={this.handleModalPageDoneClick}
        >
          Done
        </div>
      );
    } else if (this.getPathRoot() !== "settings") {
      const undoIconClassName = classNames("header-bar__actions__item", {
        "header-bar__actions__item--disabled": !isUndoEnabled,
      });
      const redoIconClassName = classNames("header-bar__actions__item", {
        "header-bar__actions__item--disabled": !isRedoEnabled,
      });

      const settingsIconClassName = classNames("header-bar__actions__item");

      return (
        <div className="header-bar__actions">
          {!isAuthenticated && this.getPathRoot() !== "sign_in" && (
            <Link to="/sign_in">
              <div className="header-bar__actions__item" title="Sign in">
                Sign in
              </div>
            </Link>
          )}

          {isAuthenticated && !activeModalPage && !!path && (
            <Fragment>
              <button
                onClick={this.handleUndoClick}
                disabled={!this.props.isUndoEnabled}
              >
                <div className={undoIconClassName} data-testid="undo">
                  <FaUndo />
                </div>
              </button>
              <button
                onClick={this.handleRedoClick}
                disabled={!this.props.isRedoEnabled}
              >
                <div className={redoIconClassName} data-testid="redo">
                  <FaRedo />
                </div>
              </button>
              <button onClick={this.handleHelpClick}>
                <IconContext.Provider
                  value={{ className: "header-bar__actions__item" }}
                >
                  <div>
                    <FaQuestionCircle />
                  </div>
                </IconContext.Provider>
              </button>
            </Fragment>
          )}

          {isAuthenticated && (
            <Link to="/settings" onClick={this.handleSettingsClick}>
              <IconContext.Provider
                value={{ className: settingsIconClassName }}
              >
                <div>
                  <FaCogs />
                </div>
              </IconContext.Provider>
            </Link>
          )}
        </div>
      );
    }
  }

  render() {
    const className = classNames("header-bar", {
      "header-bar--with-logo": this.getPathRoot() === "",
    });

    // The LP does not show the HeaderBar
    if (!isLandingPage()) {
      return (
        <div className={className}>
          {this.renderBackButton()}
          {this.renderTitle()}
          {this.renderActions()}
        </div>
      );
    }
    return null;
  }
}

const mapStateToProps = (state) => {
  return {
    isAuthenticated: state.syncBackend.get("isAuthenticated"),
    activeModalPage: state.base.get("modalPageStack", List()).last(),
    shouldShowTitleInOrgFile: state.base.get("shouldShowTitleInOrgFile"),
    path: state.org.present.get("path"),
    isUndoEnabled: state.org.past.length > 0,
    isRedoEnabled: state.org.future.length > 0,
    syncBackendType:
      state.syncBackend.get("client") && state.syncBackend.get("client").type,
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    base: bindActionCreators(baseActions, dispatch),
    org: bindActionCreators(orgActions, dispatch),
    undo: bindActionCreators(undoActions, dispatch),
  };
};

export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(HeaderBar),
);
