import React, { useState, useRef, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { curry } from "lodash/fp";
import { getCurrentTimestampAsText } from "../../../../../lib/timestamps";
import { exitEditMode, updateTableCellValue } from "../../../../../actions/org";
import "./stylesheet.css";

const getSelectedCellId = curry((filePath: string, state) => {
  return state.org.present.getIn(["files", filePath, "selectedTableCellId"]);
});

const CellEditContainer = ({
  filePath,
  cellValue,
  cellId,
  rows,
  cols,
}: {
  filePath: string;
  cellValue: string;
  cellId: number;
  rows: number;
  cols: number;
}) => {
  const dispatch = useDispatch();
  const selectedCellId = useSelector(getSelectedCellId(filePath));
  const [isCellSelected, setIsCellSelected] = useState(
    cellId == selectedCellId,
  );
  const [currentCellValue, setCurrentCellValue] = useState(cellValue);
  const [shouldIgnoreBlur, setShouldIgnoreBlur] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (cellId == selectedCellId) {
      setIsCellSelected(true);
    } else {
      setIsCellSelected(false);
      handleTableCellValueUpdate(cellId, currentCellValue);
    }
  }, [selectedCellId, isCellSelected, cellId, currentCellValue]);

  const handleTableCellValueUpdate = (cellId: number, newValue: string) => {
    dispatch(updateTableCellValue(cellId, newValue));
  };

  const handleExitTableEditMode = () => {
    dispatch(updateTableCellValue(cellId, currentCellValue));
    dispatch(exitEditMode());
  };

  const handleCellChange = (event: Event) =>
    setCurrentCellValue(event?.target?.value);

  // needs to be rethought
  const handleInsertTimestamp = () => {
    setShouldIgnoreBlur(true);
    const insertionIndex = textareaRef?.current?.selectionStart;
    const newValue =
      currentCellValue.substring(0, insertionIndex) +
      getCurrentTimestampAsText() +
      currentCellValue.substring(
        textareaRef?.current?.selectionEnd || insertionIndex,
      );

    textareaRef.current.value = newValue;
    setCurrentCellValue(newValue);

    setShouldIgnoreBlur(false);
    textareaRef?.current.focus();
  };

  const handleTextareaBlur = () => {
    if (!shouldIgnoreBlur) {
      handleExitTableEditMode();
    }
  };

  return (
    <div className="table-cell__edit-container">
      <textarea
        data-testid="edit-cell-container"
        className="table-cell_edit-container-textarea"
        rows={rows}
        cols={cols}
        value={currentCellValue}
        onChange={handleCellChange}
        onBlur={handleTextareaBlur}
        ref={textareaRef}
      />
      <div
        className="table-cell__insert-timestamp-button"
        onClick={handleInsertTimestamp}
      >
        <div>Insert timestamp</div>
        <div className="table-cell__insert-timestamp-icon">
          <FaPlus />
        </div>
      </div>
    </div>
  );
};
export default CellEditContainer;
