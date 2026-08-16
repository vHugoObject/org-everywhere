import React, { type RefObject } from "react";
import TableCell from "./TableCell/index";
import "./stylesheet.css";
import type { OrgTable, OrgTableCell, OrgTableRow } from "../../../../types";
import type { MapOf } from "immutable";

interface TableProps {
  filePath: string;
  table: MapOf<OrgTable>;
  headerIndex: number;
  descriptionItemIndex: number;
  tableContainerRef: RefObject<null | HTMLTableElement>;
}

const MINROWSIZEPERCENTAGE: number = 0.03;
const MINROWSIZEHEIGHT: number = 30;
const MINCOLUMNSIZE: number = 50;

const Table = ({
  props: {
    filePath,
    table,
    headerIndex,
    descriptionItemIndex,
    tableContainerRef,
  },
}: {
  props: TableProps;
}) => {
  const rowHeightScaledToContainer: number = tableContainerRef?.current
    ? parseInt(getComputedStyle(tableContainerRef?.current).height) *
      MINROWSIZEPERCENTAGE
    : 0;

  const columnWidthScaledToContainer: number = tableContainerRef?.current
    ? parseInt(getComputedStyle(tableContainerRef?.current).height) *
      MINCOLUMNSIZE
    : 0;

  const height: number =
    rowHeightScaledToContainer < MINROWSIZEHEIGHT
      ? MINROWSIZEHEIGHT
      : rowHeightScaledToContainer;

  const minWidth: number =
    rowHeightScaledToContainer < MINROWSIZEHEIGHT
      ? MINCOLUMNSIZE
      : columnWidthScaledToContainer;


  return (
    <table className="table-part">
      <tbody>
        {table.get("contents").map((row: MapOf<OrgTableRow>, rowIndex: number) => {
          return (
            <tr
              className={"table-part__row"}
              key={row.get("id")}
              style={{
                height,
              }}
            >
              {row.get("contents").map((cell: MapOf<OrgTableCell>, columnIndex: number) => {
                const cellId = cell.get("id");
                const cellProps = {
                  filePath,
                  headerIndex,
                  descriptionItemIndex,
                  cellId,
		  minWidth,
                  row: rowIndex,
                  column: columnIndex,
                };
                return <TableCell key={cellId} props={cellProps} />;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default Table;
