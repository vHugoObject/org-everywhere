import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import classNames from "classnames";
import { is, type MapOf } from "immutable";
import type { OrgTableCell } from "../../../../../types";
import AttributedString from "../../AttributedString";
import TableCellEditContainer from "../TableCellEditContainer/index";
import {
  getTableCell,
  getSelectedCellId,
  getInTableEditMode,
} from "../../../../../lib/org_utils";
import { activatePopup } from "../../../../../actions/base";
import {
  setSelectedTableCellId,
  advanceCheckboxState,
  enterEditMode,
} from "../../../../../actions/org";
import "./stylesheet.css";

type TableCellProps = {
  filePath: string;
  headerIndex: number;
  descriptionItemIndex: number;
  cellId: number;
  row: number;
  column: number;
};

const TableCell = ({
  props: { filePath, headerIndex, descriptionItemIndex, cellId, row, column },
}: {
  props: TableCellProps;
}) => {
  const dispatch = useDispatch();
  const inTableEditMode = useSelector(getInTableEditMode(filePath));
  const selectedCellId = useSelector(getSelectedCellId(filePath));
  const tableCellRef = useRef<HTMLTableCellElement | null>(null);

  const [isCellSelected, setIsCellSelected] = useState(
    cellId === selectedCellId,
  );

  const tableCellGetter = getTableCell({
    filePath,
    headerIndex,
    descriptionItemIndex,
    row,
    column,
  });
  const cell: MapOf<OrgTableCell> = useSelector(tableCellGetter, is);
  const cellContents = cell.get("contents");
  const cellRawContents: string = cell.get("rawContents");

  useEffect(() => {
    if (cellId == selectedCellId) {
      setIsCellSelected(true);
    } else {
      setIsCellSelected(false);
    }
  }, [selectedCellId, isCellSelected, cellId]);

  const className = classNames("table-part__cell", {
    "table-part__cell--selected": isCellSelected,
  });

  const handleSingleClick = () => {
    setIsCellSelected(true);
    tableCellRef.current?.focus();
    dispatch(setSelectedTableCellId(cellId));
  };

  const handleDoubleClick = () => {
    dispatch(enterEditMode("table"));
  };

  const handleCheckboxClick = (listItemId: number) => {
    dispatch(advanceCheckboxState(listItemId));
  };

  const handleTimestampClick = (timestampId: number) => {
    dispatch(activatePopup("timestamp-editor", { timestampId }));
  };

  const subPartDataAndHandlers = {
    inTableEditMode: inTableEditMode,
    onCheckboxClick: handleCheckboxClick,
    onTimestampClick: handleTimestampClick,
  };

  return (
    <td
      className={className}
      key={cellId}
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      ref={tableCellRef}
      tabIndex={-1}
    >
      {isCellSelected && inTableEditMode ? (
        <TableCellEditContainer
          filePath={filePath}
          cellValue={cellRawContents}
          cellId={cellId}
        />
      ) : (
        <AttributedString
          parts={cellContents}
          subPartDataAndHandlers={subPartDataAndHandlers}
        />
      )}
    </td>
  );
};

export default TableCell;
