import React, { useState, useLayoutEffect, useRef } from "react";
import { IconContext } from "react-icons";
import { FaTimes } from "react-icons/fa";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { is, Map } from "immutable";
import { curry } from "lodash/fp";
import Table from "../Table/index";
import TableActionButtons from "./components/TableActionButtons";
import { closePopup } from "../../../../actions/base";
import { getTable } from "../../../../lib/org_utils";
import "./stylesheet.css";

const getFilePath = (state) => state.org.present.get("path");
const getFile = curry((filePath: string, state) => {
  return state.org.present.getIn(["files", filePath], Map());
});

const TableEditorModal = ({ onClose }: { onClose: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  useLayoutEffect(() => {
    setIsVisible(true);
  }, []);

  const dispatch = useDispatch();
  const filePath = useSelector(getFilePath);
  const file = useSelector(getFile(filePath), is);
  const headerIndex = file.get("selectedHeaderIndex");
  const descriptionItemIndex = file.get("selectedDescriptionItemIndex");
  const tableGetter = getTable({ filePath, headerIndex, descriptionItemIndex });
  const table = useSelector(tableGetter, is);
  const tableContainerRef = useRef<null | HTMLTableElement>(null);

  const outerClassName = classNames("table-drawer-outer-container", {
    "table-drawer-outer-container--visible": isVisible,
  });

  const tableProps = {
    filePath,
    table,
    headerIndex,
    descriptionItemIndex,
    tableContainerRef,
  };

  const handlePopupClose = () => {
    setIsVisible(false);
    dispatch(closePopup());
  };

  if (
    (table && table.get("contents").size === 0) ||
    table.getIn(["contents", 0, "contents"]).size === 0
  ) {
    handlePopupClose();
  }

  return (
    <div className={outerClassName}>
      <div className="table-drawer-inner-container" data-testid="table-drawer">
        <div className="table-drawer__header-container">
          <h2>Edit Table</h2>
          <IconContext.Provider value={{ className: "fas fa-lg" }}>
            <div
              className="table-drawer__close-button"
              onClick={handlePopupClose}
            >
              <FaTimes />
            </div>
          </IconContext.Provider>
        </div>
        <div
          ref={tableContainerRef}
          className="table-drawer-inner-inner-container"
        >
          <Table props={tableProps} />
        </div>
        <TableActionButtons filePath={filePath} />
      </div>
    </div>
  );
};

export default TableEditorModal;
