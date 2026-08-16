import { format, parseISO } from "date-fns";
import { Map, type MapOf } from "immutable";
import { isEmpty, isNumber } from "lodash/fp";
import React, { type ChangeEvent, Fragment } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import * as baseActions from "../../../../actions/base";
import * as orgActions from "../../../../actions/org";
import { getSelectedHeader } from "../../../../lib/org_utils";
import { renderAsText } from "../../../../lib/timestamps";
import type {
  OrgFile,
  OrgTimestampPart,
  PlanningType,
  Popup,
  RepeaterType,
  DelayType,
  DelayUnit,
  StartOrEnd,
  RepeaterUnit
} from "../../../../types";
import { getIcon } from "../../../UI/icons";
import Switch from "../../../UI/Switch/";
import TabButtons from "../../../UI/TabButtons/";
import "./stylesheet.css";
import {
  activeToggle,
  addTime,
  removeTime,
  timeChange,
  addRepeater,
  removeRepeater,
  repeaterTypeChange,
  repeaterValueChange,
  repeaterUnitChange,
  addDelay,
  removeDelay,
  delayTypeChange,
  delayValueChange,
  delayUnitChange,
} from "../../../../lib/timestamps";

interface TimestampEditorProps {
  headerId: number;
  timestamp: MapOf<OrgTimestampPart>;
  timestampId: number;
  planningItemIndex: number;
  onClose: Function;
  onChange: Function;
}



const TimestampEditor = (props: TimestampEditorProps) => {
  const {
    onChange,
    timestamp,
    headerId,
    activePopupType,
    onClose,
    selectedHeaderId,
    header,
    timestampId,
    planningItemIndex,
  } = props;

  const handleActiveToggle = (_: MouseEvent<HTMLDivElement>): void => {
    onChange(activeToggle(timestamp));
  };

  const handleDateChange = (
    event,
    planningItemIndex: number,
    timestampId: number,
  ): void => {
    if (isEmpty(event.target.value)) {
      // It's a planning item and the parser knows which one.
      if (isNumber(planningItemIndex)) {
        props.org.removePlanningItem(headerId, planningItemIndex);
      } else if (isNumber(timestampId)) {
        props.org.removeTimestamp(headerId, timestampId);
      }
      if (
        props.activePopupType !== "scheduled-editor" &&
        props.activePopupType !== "deadline-editor"
      ) {
        // for scheduled timestamp and deadline the modal can be open when no timestamp exists
        onClose();
      }
    } else {
      const [newYear, newMonth, newDay, newDayName] = format(
        parseISO(event.target.value),
        "yyyy MM dd eee",
      ).split(" ");
      onChange(
        timestamp
          .set("year", newYear)
          .set("month", newMonth)
          .set("day", newDay)
          .set("dayName", newDayName),
      );
    }
  };
  const handleAddTime = (startOrEnd: StartOrEnd) => {
    return (_: MouseEvent): void => {
      onChange(addTime(startOrEnd, timestamp));
    }
  };
  const handleRemoveTime = (startOrEnd: StartOrEnd) => {
    return (_: MouseEvent): void => {
      onChange(removeTime(startOrEnd, timestamp));
    }
  };
  const handleTimeChange = (startOrEnd: StartOrEnd) => {
    return (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(timeChange(startOrEnd, timestamp, event.target.value));
    }
  };
  const handleAddRepeater = (_: MouseEvent): void => {
    onChange(addRepeater(timestamp));
  };
  const handleRemoveRepeater = (_: MouseEvent): void => {
    onChange(removeRepeater(timestamp));
  };
  const handleRepeaterTypeChange = (newRepeaterType: RepeaterType): void => {
    onChange(repeaterTypeChange(newRepeaterType, timestamp));
  };
  const handleRepeaterValueChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(repeaterValueChange(event.target.value, timestamp));
  };
  const handleRepeaterUnitChange = (newRepeaterUnit: RepeaterUnit): void => {
    onChange(repeaterUnitChange(newRepeaterUnit, timestamp));
  };
  const handleAddDelay = (_: MouseEvent): void => {
    onChange(addDelay(timestamp));
  };
  const handleRemoveDelay = (_: MouseEvent): void => {
    onChange(removeDelay(timestamp));
  };
  const handleDelayTypeChange = (newDelayType: DelayType): void => {
    onChange(delayTypeChange(newDelayType, timestamp));
  };
  const handleDelayValueChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(delayValueChange(event.target.value, timestamp));
  };
  const handleDelayUnitChange = (newDelayUnit: DelayUnit): void => {
    onChange(delayUnitChange(newDelayUnit, timestamp));
  };
  const renderTimeField = (
    label: string,
    timeKey: StartOrEnd,
    hour: string | null,
    minute: string | null,
    showRemoveButton: boolean = true,
  ) => {
    return (
      <div className="timestamp-editor__field-container timestamp-editor__field-container--inline">
        <div className="timestamp-editor__field-title">{label}</div>
        <div className="timestamp-editor__field">
          {!!hour ? (
            <Fragment>
              <input
                type="time"
                className="timestamp-editor__time-input"
                data-testid="change-time"
                value={`${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`}
                onChange={handleTimeChange(timeKey)}
              />
              {showRemoveButton && (
                <div
                  className="timestamp-editor__icon timestamp-editor__icon--remove"
                  data-testid="remove-time"
                  onClick={handleRemoveTime(timeKey)}
                >
                  {getIcon("times")}
                </div>
              )}
            </Fragment>
          ) : (
            <div
              className="timestamp-editor__icon timestamp-editor__icon--add"
              data-testid="add-time"
              onClick={handleAddTime(timeKey)}
            >
              {getIcon("plus")}
            </div>
          )}
        </div>
      </div>
    );
  };
  const renderRepeater = () => {
    const { repeaterType, repeaterValue, repeaterUnit } =
      props.timestamp.toJS();
    return (
      <div className="timestamp-editor__field-container">
        <div className="timestamp-editor__field-title">Repeater</div>
        <div className="timestamp-editor__field timestamp-editor__field--delay-repeater">
          {!!repeaterType ? (
            <Fragment>
              <div className="timestamp-editor__delay-repeater-type">
                <TabButtons
                  buttons={["+", "++", ".+"]}
                  titles={[
                    "Shift exactly the amount of time in the repeater (i.e. one month for +1m).",
                    "Shift the date by as many intervals of the amount of time in the repeater (i.e. one or many months for for ++1m) as it takes to get this date into the future.",
                    "Shift the date exactly the amount of time of the repeater relative to the time of the state change.",
                  ]}
                  selectedButton={repeaterType || "+"}
                  onSelect={handleRepeaterTypeChange}
                />
              </div>
              <input
                type="number"
                min="1"
                className="textfield delay-repeater-value-input"
                value={repeaterValue || 1}
                onChange={handleRepeaterValueChange}
              />
              <div>
                <TabButtons
                  buttons={["h", "d", "w", "m", "y"]}
                  titles={["hours", "days", "weeks", "months", "years"]}
                  selectedButton={repeaterUnit || "h"}
                  onSelect={handleRepeaterUnitChange}
                />
              </div>
              <div
                className="timestamp-editor__icon timestamp-editor__icon--remove"
                onClick={handleRemoveRepeater}
              >
                {getIcon("times")}
              </div>
            </Fragment>
          ) : (
            <div
              className="timestamp-editor__icon timestamp-editor__icon--add"
              onClick={handleAddRepeater}
            >
              {getIcon("plus")}
            </div>
          )}
        </div>
      </div>
    );
  };
  const renderDelay = (): Element => {
    const { delayType, delayValue, delayUnit } = props.timestamp.toJS();
    return (
      <div className="timestamp-editor__field-container">
        <div className="timestamp-editor__field-title">Delay</div>
        <div className="timestamp-editor__field">
          {!!delayType ? (
            <Fragment>
              <div className="timestamp-editor__delay-repeater-type">
                <TabButtons
                  buttons={["-", "--"]}
                  titles={[
                    "Set a different lead time before the entry is put into the agenda.",
                    "In case the task contains a repeater, the delay is considered to affect all occurrences; if you want the delay to only affect the first scheduled occurrence of the task, use '--' instead.",
                  ]}
                  selectedButton={delayType || "-"}
                  onSelect={handleDelayTypeChange}
                />
              </div>
              <input
                type="number"
                min="1"
                className="textfield delay-repeater-value-input"
                value={delayValue || 1}
                onChange={handleDelayValueChange}
              />
              <div>
                <TabButtons
                  buttons={["h", "d", "w", "m", "y"]}
                  titles={["hours", "days", "weeks", "months", "years"]}
                  selectedButton={delayUnit || "h"}
                  onSelect={handleDelayUnitChange}
                />
              </div>
              <div
                className="timestamp-editor__icon timestamp-editor__icon--remove"
                onClick={handleRemoveDelay}
              >
                {getIcon("times")}
              </div>
            </Fragment>
          ) : (
            <div
              className="timestamp-editor__icon timestamp-editor__icon--add"
              onClick={handleAddDelay}
            >
              {getIcon("plus")}
            </div>
          )}
        </div>
      </div>
    );
  };
  const createPlanningItem = (): void => {
    const planningType: PlanningType = {
      "deadline-editor": "DEADLINE",
      "scheduled-editor": "SCHEDULED",
    }[activePopupType];
    props.org.addNewPlanningItem(selectedHeaderId, planningType);
    props.base.activatePopup(activePopupType, {
      headerId: selectedHeaderId,
      planningItemIndex: header.get("planningItems").size,
    });
  };
  if (!timestamp) {
    // for scheduled timestamp and deadline the modal can be opened when no timestamp exists
    return (
      <>
        <div className="timestamp-editor__field-title">Add Timestamp</div>
        <div className="timestamp-editor__field">
          <div
            className="fas fa-plus timestamp-editor__icon timestamp-editor__icon--add"
            onClick={createPlanningItem}
          ></div>
          {getIcon("plus")}
        </div>
      </>
    );
  }

  const {
    isActive: isActive,
    year: year,
    month: month,
    day: day,
    startHour: startHour,
    startMinute: startMinute,
    endHour: endHour,
    endMinute: endMinute,
  } = timestamp.toJS();

  return (
    <div>
      <div className="timestamp-editor__render">{renderAsText(timestamp)}</div>

      <div className="timestamp-editor__date-time-fields-container">
        <div className="timestamp-editor__field-container timestamp-editor__field-container--inline">
          <div className="timestamp-editor__field-title">Active</div>
          <div className="timestamp-editor__field">
            <Switch
              isEnabled={isActive}
              onToggle={handleActiveToggle}
              testId={"active-switch"}
            />
          </div>
        </div>

        <div className="timestamp-editor__field-container timestamp-editor__field-container--inline">
          <div className="timestamp-editor__field-title">Date</div>
          <div className="timestamp-editor__field">
            <input
              data-testid="timestamp-selector"
              type="date"
              className="timestamp-editor__date-input"
              onChange={(
                event: ChangeEvent<HTMLInputElement, HTMLInputElement>,
              ): void =>
                handleDateChange(event, planningItemIndex, timestampId)
              }
              // Needed for iOS due to React bug
              // https://github.com/facebook/react/issues/8938#issuecomment-519074141
              onFocus={(event: FocusEvent<HTMLInputElement>): string =>
                (event.nativeEvent.target.defaultValue = "")
              }
              value={`${year}-${month}-${day}`}
            />
          </div>
        </div>

        {renderTimeField(
          "Start time",
          "start",
          startHour,
          startMinute,
          !endHour,
        )}
        {!!startHour && renderTimeField("End time", "end", endHour, endMinute)}
      </div>

      {renderRepeater()}
      {renderDelay()}
    </div>
  );
};

const mapStateToProps = (state) => {
  const path: string = state.org.present.get("path");
  const file: MapOf<OrgFile> = state.org.present.getIn(["files", path], Map());
  const activePopup: MapOf<Popup> = state.base.get("activePopup");
  return {
    selectedHeaderId: file.get("selectedHeaderId"),
    header: getSelectedHeader(state),
    activePopupType: !!activePopup ? activePopup.get("type") : null,
    activePopupData: !!activePopup ? activePopup.get("data") : null,
  };
};
const mapDispatchToProps = (dispatch) => ({
  org: bindActionCreators(orgActions, dispatch),
  base: bindActionCreators(baseActions, dispatch),
});
export default connect(mapStateToProps, mapDispatchToProps)(TimestampEditor);
