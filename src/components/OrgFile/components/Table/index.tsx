import React, { type RefObject } from "react";
import TableCell from "./TableCell/index";
import "./stylesheet.css";

interface TableProps {
  filePath: string;
  table: any;
  headerIndex: number;
  descriptionItemIndex: number;
  tableContainerRef: RefObject<null | HTMLTableElement>;
}

const MINROWSIZEPERCENTAGE: number = 0.03;
const MINROWSIZEHEIGHT: number = 30;

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

  const height: number =
    rowHeightScaledToContainer < MINROWSIZEHEIGHT
      ? MINROWSIZEHEIGHT
      : rowHeightScaledToContainer;

  return (
    <table className="table-part">
      <tbody>
        {table.get("contents").map((row, rowIndex: number) => {
          return (
            <tr
              className={"table-part__row"}
              key={row.get("id")}
              style={{
                height,
              }}
            >
              {row.get("contents").map((cell, columnIndex: number) => {
                const cellId = cell.get("id");
                const cellProps = {
                  filePath,
                  headerIndex,
                  descriptionItemIndex,
                  cellId,
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
