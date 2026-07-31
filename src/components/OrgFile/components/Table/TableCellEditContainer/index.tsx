import React, {
  useState,
  useRef,
  useEffect,
  type FocusEvent,
  type MouseEvent,
} from "react";
import { FaPlus } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentJSDateAsOrgTimestampString } from "../../../../../lib/timestamps";
import { getSelectedCellId } from "../../../../../lib/org_utils";
import { updateTableCellValue } from "../../../../../actions/org";
import "./stylesheet.css";

const CellEditContainer = ({
  filePath,
  cellValue,
  cellId,
}: {
  filePath: string;
  cellValue: string;
  cellId: number;
}) => {
  const dispatch = useDispatch();
  const selectedCellId = useSelector(getSelectedCellId(filePath));
  const [isCellSelected, setIsCellSelected] = useState(
    cellId === selectedCellId,
  );

  const [currentCellValue, setCurrentCellValue] = useState(cellValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (cellId === selectedCellId) {
      setIsCellSelected(true);
    } else {
      setIsCellSelected(false);
      handleTableCellValueUpdate(cellId, currentCellValue);
    }
  }, [selectedCellId, isCellSelected, cellId, currentCellValue]);

  useEffect(
    () => () => {
      handleTableCellValueUpdate(cellId, currentCellValue);
    },
    [cellId, currentCellValue],
  );

  const handleTableCellValueUpdate = (cellId: number, newValue: string) => {
    dispatch(updateTableCellValue(cellId, newValue));
  };

  const handleCellChange = (event: {
    target: { value: React.SetStateAction<string> };
  }) => setCurrentCellValue(event?.target?.value);

  const handleInsertTimestamp = () => {
    const insertionIndex = textareaRef?.current?.selectionStart;
    const newValue =
      currentCellValue.substring(0, insertionIndex) +
      getCurrentJSDateAsOrgTimestampString() +
      currentCellValue.substring(
        textareaRef?.current?.selectionEnd || insertionIndex,
      );

    textareaRef.current.value = newValue;
    setCurrentCellValue(newValue);

    textareaRef?.current.focus();
  };

  const handleTextareaBlur = (event: FocusEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="table-cell__edit-container">
      <textarea
        data-testid="edit-cell-container"
        className="table-cell_edit-container-textarea"
        value={currentCellValue}
        onChange={handleCellChange}
        onBlur={handleTextareaBlur}
        onClick={handleClick}
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
