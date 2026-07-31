import { match } from "ts-pattern";
import {
  parse,
  isBefore,
  isEqual as datesEqual,
  differenceInMinutes,
  differenceInHours,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
  getHours,
  setHours,
  getMinutes,
  setMinutes,
} from "date-fns/fp";
import {
  sortBy,
  identity,
  padCharsStart,
  property,
  map,
  over,
  merge,
  reduce,
  pipe,
  partialRight,
  isString,
  zip,
  startsWith,
} from "lodash/fp";
import { type MapOf, Map, get, setIn } from "immutable";
import type {
  TimestampUnit,
  OrgTimestampPart,
  RepeaterType,
  RepeaterUnit,
} from "../types";
import {
  REPEATERTYPESSET,
  TIMESTAMPUNITSSET,
  ORGTIMESTAMPDATEKEYNAMES,
  DELAYTYPESSET,
  DAYABBREVS,
} from "./constants";

export const padTimePart = padCharsStart("0", 2);
export const convertDayNumberIntoDayName = (
  number: number,
  abbrevs = DAYABBREVS,
): string => property(number, abbrevs);

export const getYearFromDate = (date: Date): string =>
  date.getFullYear().toString();
export const getMonthFromDate = (date: Date): string =>
  padTimePart((date.getMonth() + 1).toString());
export const getDayFromDate = (date: Date): string =>
  padTimePart(date.getDate().toString());
export const getDayNameFromDate = (date: Date): string =>
  convertDayNumberIntoDayName(date.getDay());
export const getStartHourFromDate = (date: Date): string =>
  padTimePart(date.getHours().toString());
export const getStartMinuteFromDate = (date: Date): string =>
  padTimePart(date.getMinutes().toString());
export const getTimestampPartsFromDate = over([
  getYearFromDate,
  getMonthFromDate,
  getDayFromDate,
  getDayNameFromDate,
  getStartHourFromDate,
  getStartMinuteFromDate,
]);
export const getTimestampPartsFromDateWithKeyNames = pipe([
  getTimestampPartsFromDate,
  zip(ORGTIMESTAMPDATEKEYNAMES),
]);

export const isValidRepeaterUnit = (
  value: unknown,
  repeaterUnitsSet = TIMESTAMPUNITSSET,
): value is RepeaterUnit => isString(value) && repeaterUnitsSet.has(value);
export const isValidRepeaterType = (
  value: unknown,
  repeaterTypesSet = REPEATERTYPESSET,
): value is RepeaterType => isString(value) && repeaterTypesSet.has(value);

export const isValidDelayType = (
  value: unknown,
  delayTypesSet = DELAYTYPESSET,
): value is RepeaterType => isString(value) && delayTypesSet.has(value);

const renderAsTextReducer = (
  currStr: string,
  [bool, stringToAppend]: [boolean, string],
): string => {
  if (bool) {
    return currStr + stringToAppend;
  }
  return currStr;
};

export const renderAsText = (timestamp: MapOf<OrgTimestampPart>): string => {
  const {
    isActive,
    withStartTime,
    year,
    month,
    day,
    dayName,
    startHour,
    startMinute,
    endHour,
    endMinute,
    repeaterType,
    repeaterValue,
    repeaterUnit,
    repeaterDeadlineValue,
    repeaterDeadlineUnit,
    delayType,
    delayValue,
    delayUnit,
  } = timestamp.toJS();

  const [startBracket, endBracket]: string = isActive ? "<>" : "[]";
  const boolFuncTuples: Array<[boolean, string]> = [
    [true, startBracket],
    [true, `${year}-${month}-${day} ${dayName}`],
    [withStartTime, ` ${startHour}:${startMinute}`],
    [withStartTime && !!endHour, `-${endHour}:${endMinute}`],
    [!!repeaterType, ` ${repeaterType}${repeaterValue}${repeaterUnit}`],
    [
      !!repeaterType && !!repeaterDeadlineValue,
      `/${repeaterDeadlineValue}${repeaterDeadlineUnit}`,
    ],
    [!!delayType, ` ${delayType}${delayValue}${delayUnit}`],
    [true, endBracket],
  ];

  return reduce(renderAsTextReducer, "", boolFuncTuples);
};

export const getCurrentTimestamp = ({
  isActive = true,
  withStartTime = false,
} = {}): OrgTimestampPart =>
  timestampPartObjectForDate(new Date(), { isActive, withStartTime });

export const timestampPartObjectForDate = (
  time: Date,
  { isActive = true, withStartTime = false } = {},
): OrgTimestampPart => {
  return {
    isActive,
    withStartTime,
    year: time.getFullYear().toString(),
    month: format("MM", time),
    day: format("dd", time),
    dayName: format("eee", time),
    startHour: format("HH", time),
    startMinute: format("mm", time),
    endHour: undefined,
    endMinute: undefined,
    repeaterType: undefined,
    repeaterValue: undefined,
    repeaterUnit: undefined,
    repeaterDeadlineValue: undefined,
    repeaterDeadlineUnit: undefined,
    delayType: undefined,
    delayValue: undefined,
    delayUnit: undefined,
  };
};

export const timestampPartRecordForDate = (
  { isActive = true, withStartTime = false } = {},
  time: Date,
): MapOf<OrgTimestampPart> => {
  return Map(timestampPartObjectForDate(time, { isActive, withStartTime }));
};

export const getJSDateAsOrgTimestampString = (
  time: Date,
  { isActive = true, withStartTime = false } = {},
): string => {
  const bracketPair: string = isActive ? "<>" : "[]";
  let formatString: string = "yyyy-MM-dd eee";
  if (withStartTime) formatString += " HH:mm";
  return `${bracketPair[0]}${format(formatString, time)}${bracketPair[1]}`;
};

// To get around the heavy-weight renderAsText(fromJS(getCurrentJSDateAsOrgTimestampString()))
export const getCurrentJSDateAsOrgTimestampString = ({
  isActive = true,
  withStartTime = true,
} = {}): string =>
  getJSDateAsOrgTimestampString(new Date(), { isActive, withStartTime });

export const dateForTimestamp = (timestamp: MapOf<OrgTimestampPart>): Date => {
  // should not use toJS() here
  const { year, month, day, startHour, startMinute } = timestamp.toJS();
  let timestampString: string = `${year}-${month}-${day} ${startHour}:${startMinute}`;
  return parse(new Date(), "yyyy-MM-dd HH:mm", timestampString);
};

export const addTimestampUnitToDate = (
  timestampUnit: TimestampUnit,
  numUnits: number,
  date: Date,
): Date => {
  switch (timestampUnit) {
    case "h":
      return addHours(numUnits, date);
    case "d":
      return addDays(numUnits, date);
    case "w":
      return addWeeks(numUnits, date);
    case "m":
      return addMonths(numUnits, date);
    case "y":
      return addYears(numUnits, date);
    default:
      return date;
  }
};

export const subtractTimestampUnitFromDate = (
  timestampUnit: TimestampUnit,
  numUnits: number,
  date: Date,
): Date => {
  switch (timestampUnit) {
    case "h":
      return subHours(numUnits, date);
    case "d":
      return subDays(numUnits, date);
    case "w":
      return subWeeks(numUnits, date);
    case "m":
      return subMonths(numUnits, date);
    case "y":
      return subYears(numUnits, date);
    default:
      return date;
  }
};

export const createNextRepeatTimestampPartObject = (
  timestampWithRepeater: OrgTimestampPart,
  nextRepeatDate: Date,
): OrgTimestampPart => {
  const [year, month, day, dayName, startHour, startMinute] =
    getTimestampPartsFromDate(nextRepeatDate);
  return merge(timestampWithRepeater, {
    year,
    month,
    day,
    dayName,
    startHour,
    startMinute,
  });
};

export const createNextRepeatTimestampPartRecord = (
  previousTimestamp: OrgTimestampPart,
  nextRepeatDate: Date,
): MapOf<OrgTimestampPart> => {
  return Map(
    createNextRepeatTimestampPartObject(previousTimestamp, nextRepeatDate),
  );
};

export const getNextRepeatDate = (
  {
    repeaterType,
    repeaterValue,
    repeaterUnit,
  }: {
    repeaterType: RepeaterType;
    repeaterValue: number;
    repeaterUnit: RepeaterUnit;
  },
  timestampAsDate: Date,
  currentDate: Date,
): Date => {
  return match(repeaterType)
    .with(
      "+",
      (): Date =>
        addTimestampUnitToDate(repeaterUnit, repeaterValue, timestampAsDate),
    )
    .with("++", (): Date => {
      const newDate: Date = addTimestampUnitToDate(
        repeaterUnit,
        repeaterValue,
        timestampAsDate,
      );
      if (isBefore(currentDate, newDate) || datesEqual(currentDate, newDate)) {
        return getNextRepeatDate(
          { repeaterType, repeaterValue, repeaterUnit },
          newDate,
          currentDate,
        );
      }
      return newDate;
    })
    .with(".+", (): Date => {
      const newDate = addTimestampUnitToDate(
        repeaterUnit,
        repeaterValue,
        currentDate,
      );
      if (repeaterUnit == "h") {
        return newDate;
      }

      const [newHours, newMinutes] = over([getHours, getMinutes])(currentDate);
      return pipe([setHours(newHours), setMinutes(newMinutes)])(newDate);
    })
    .exhaustive();
};

const applyRepeaterReducer = (
  currTimestamp: MapOf<OrgTimestampPart>,
  [key, value]: [string, string],
): MapOf<OrgTimestampPart> => {
  return setIn(currTimestamp, [key], value);
};

export const applyRepeater = (
  timestamp: MapOf<OrgTimestampPart>,
  currentDate: Date,
): MapOf<OrgTimestampPart> => {
  const [repeaterType, repeaterValue, repeaterUnit] = over([
    partialRight(get, ["repeaterType"]),
    pipe([partialRight(get, ["repeaterValue"]), parseInt]),
    partialRight(get, ["repeaterUnit"]),
  ])(timestamp);

  if (!repeaterType || !repeaterValue || !repeaterUnit) {
    return timestamp;
  }

  if (!isValidRepeaterType(repeaterType)) {
    console.error(`Unrecognized timestamp repeater type: ${repeaterType}`);
    return timestamp;
  }

  if (!isValidRepeaterUnit(repeaterUnit)) {
    console.error(`Unrecognized timestamp repeater unit: ${repeaterUnit}`);
    return timestamp;
  }

  const timestampAsDate = dateForTimestamp(timestamp);
  const nextRepeatDate = getNextRepeatDate(
    { repeaterType, repeaterValue, repeaterUnit },
    timestampAsDate,
    currentDate,
  );

  const timestampPartsFromDate =
    getTimestampPartsFromDateWithKeyNames(nextRepeatDate);
  return reduce(applyRepeaterReducer, timestamp, timestampPartsFromDate);
};

export const dateDuration = (
  intervalStart: Date,
  intervalEnd: Date,
): string => {
  const [start, end] = sortBy(identity, [intervalStart, intervalEnd]);
  const hoursDiff: number = differenceInHours(start, end);
  const minDiff: number = differenceInMinutes(addHours(hoursDiff, start), end);
  const durationString = `${hoursDiff.toString()}:${padTimePart(minDiff.toString())}`;
  return intervalStart > intervalEnd ? `-${durationString}` : durationString;
};

export const dateDurationForClockString = pipe([
  dateDuration,
  padCharsStart(" ", 5),
]);

export const createTimestampDuration =
  (func: (intervalStart: Date, intervalEnd: Date) => string) =>
  (
    startTimestamp: MapOf<OrgTimestampPart>,
    endTimestamp: MapOf<OrgTimestampPart>,
  ): string => {
    let [start, end] = map(dateForTimestamp)([startTimestamp, endTimestamp]);
    return func(start, end);
  };

export const timestampDuration = createTimestampDuration(dateDuration);
export const timestampDurationForClockString = createTimestampDuration(
  dateDurationForClockString,
);

export const millisDuration = (millis: number | undefined): string => {
  if (millis === undefined) {
    return "";
  }
  return dateDuration(new Date(0), new Date(millis));
};
