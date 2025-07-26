// Timestamp, OrgTimestampStrings, JSDateObjects
import {
  format,
  isBefore,
  getHours,
  setHours,
  getMinutes,
  setMinutes,
  getYear,
  getDay,
  getDate,
  getMonth,
  differenceInMinutes,
  minutesToHours,
  hoursToMinutes,
  add as addDateUnits
} from 'date-fns/fp';
import {
  curry,
  map,
  property,
  over,
  merge,
  pipe,
  toString,
  identity,
  subtract,
  join,
  head,
  padCharsStart,
  trimChars,
  tail,
  spread
} from "lodash/fp";
import { type Timestamp, type DefaultTimestampOptions } from "./types"
import { TIMESTAMPFIELDS } from "./constants"


export const DATEZERO: Date = new Date(0)

export const toDateString = Function.prototype.call.bind(Date.prototype.toDateString);
// new Date(year, monthIndex, day, hours, minutes, seconds)
export const newDate = (args: [number, number, number, number, number]) => new Date(...args)
export const convertDatePartsIntoStringDate = pipe([newDate, toDateString])



export const convertJSDateObjectIntoTimestampStringWithAngleBrackets = curry((formatter: (date: Date) => string, date: Date): string => {
  return `<${formatter(date)}>`
})

export const convertDateIntoTimestampStringWithSquareBrackets = curry((formatter: (date: Date) => string, date: Date): string => {
  return `[${formatter(date)}]`
})

export const hourStringDateFormat = format('HH') // '02'
export const minuteStringDateFormat = format('mm') // '01'
export const monthNumberStringDateFormat = format('MM') // '06'
export const dayNameStringDateFormat = format("eee") // 'Mon'
export const dayOfWeekStringDateFormat = format("dd") // '16'
export const yearNumberStringDateFormat = format("yyyy") // '2025'
export const orgTimestampFormat = format('yyyy-MM-dd eee') // '2025-06-16 Mon'
export const orgTimestampFormatWithStartTime = format('yyyy-MM-dd HH:mm') // '2025-06-16 02:03'
export const orgTimestampFormatWithDayNameAndStartTime  = format('yyyy-MM-dd eee HH:mm') // '2025-06-16 Mon 02:03'



export const [convertJSDateObjectIntoActiveOrgTimestampString,
  convertJSDateObjectIntoExtendedActiveOrgTimestampString] = map<(date: Date) => string, (date: Date) => string>(convertJSDateObjectIntoTimestampStringWithAngleBrackets)([orgTimestampFormat, orgTimestampFormatWithDayNameAndStartTime])
export const [convertJSDateObjectIntoInactiveOrgTimestampString,
  convertJSDateObjectIntoExtendedInactiveOrgTimestampString] = map<(date: Date) => string, (date: Date) => string>(convertDateIntoTimestampStringWithSquareBrackets)([orgTimestampFormat, orgTimestampFormatWithDayNameAndStartTime])


export const getYearMonthDayAndDayNumberFromJSDateObject = over([
  getYear,
  getMonth,
  getDate,
  getDay
])

export const  getYearMonthDayDayNumberHoursAndMinutesFromJSDateObject = over([
  getYear,
  getMonth,
  getDate,
  getDay,
  getHours,  
  getMinutes])

export const [
  timestampIsActive,
  getTimestampObjectYear,
  getTimestampObjectMonth,
  getTimestampObjectDay,
  getTimestampObjectDayName,
  getTimestampObjectStartHour,
  getTimestampObjectStartMinute,  
] = map(property)(TIMESTAMPFIELDS)


export const getYearMonthDayAndDayNameFromTimestampObject = over([
  getTimestampObjectYear,
  getTimestampObjectMonth,
  getTimestampObjectDay,
  getTimestampObjectDayName
])

export const getStartHourAndMinuteFromTimestampObject = over([
  getTimestampObjectStartHour,
  getTimestampObjectStartMinute,  
])

export const getYearMonthDayDayNameAndStartTimeFromTimestampObject = over([
  getTimestampObjectYear,
  getTimestampObjectMonth,
  getTimestampObjectDay,
  getTimestampObjectDayName,
  getTimestampObjectStartHour,
  getTimestampObjectStartMinute,  
])


export const convertJSDateObjectIntoTimestampObject = curry(({ isActive = true, withStartTime = false }: DefaultTimestampOptions, date: Date): Timestamp => {
  const [year, month, day, dayOfWeek] = getYearMonthDayAndDayNumberFromJSDateObject(date)
  
  const timestamp: Timestamp = {
    isActive,
    year,
    month,
    day, 
    dayOfWeek
  };

  if (withStartTime) {
    return merge(timestamp, {
      startHour: getHours(date),
      startMinute: getMinutes(date),
    })
  }
  
  return timestamp;
});

export const convertArrayOfJSDateObjectsIntoArrayOfTimestampObjects = map(convertJSDateObjectIntoTimestampObject({}))

export const convertArrayOfJSDateObjectsIntoArrayOfTimestampObjectsWithStartTimes = map(convertJSDateObjectIntoTimestampObject({withStartTime: true}))


export const getCurrentDateAsTimestampObject = ({ isActive = true, withStartTime = false } = {}) =>
  convertJSDateObjectIntoTimestampObject({ isActive, withStartTime }, new Date());



export const convertTimestampObjectIntoOrgTimestampString = (timestamp: Timestamp): string => {
  const {
    isActive,
    year,
    month,
    day,
    dayOfWeek,
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
  } = timestamp

  let timestampText = '';
  timestampText += isActive ? '<' : '[';
  timestampText += `${year}-${month}-${day}`;
  timestampText += !!dayOfWeek ? ` ${dayOfWeek}` : '';
  timestampText += !!startHour ? ` ${startHour}:${startMinute}` : '';
  timestampText += !!endHour ? `-${endHour}:${endMinute}` : '';
  timestampText += !!repeaterType ? ` ${repeaterType}${repeaterValue}${repeaterUnit}` : '';
  timestampText +=
    !!repeaterType && !!repeaterDeadlineValue
      ? `/${repeaterDeadlineValue}${repeaterDeadlineUnit}`
      : '';
  timestampText += !!delayType ? ` ${delayType}${delayValue}${delayUnit}` : '';
  timestampText += isActive ? '>' : ']';

  return timestampText;
};


export const convertTimestampObjectIntoJSDateObject = (timestamp: Timestamp): Date => {
  const { year, month, day, startHour = 0, startMinute = 0 } = timestamp
  return newDate([year, month, day, startHour, startMinute])
};


export const convertArrayOfTimestampObjectsIntoArrayOFJSDateObjects = map(convertTimestampObjectIntoJSDateObject)

export const convertTimestampObjectIntoJSDateString = (timestamp: Timestamp): string => {
  const { year, month, day, startHour = 0, startMinute = 0 } = timestamp
  return convertDatePartsIntoStringDate([year, month, day, startHour, startMinute])
};


export const DATEUNITSMAPPING: Record<string, string> = {
  "h": "hours",
  "d": "days",
  "w": "weeks",
  "m": "months",
  "y": "years"
}



export const applyRepeater = (timestamp, currentDate) => {
  if (!timestamp.get('repeaterType')) {
    return timestamp;
  }

  let newDate = null;
  switch (timestamp.get('repeaterType')) {
    case '+':
      newDate = addTimestampUnitToDate(
        dateForTimestamp(timestamp),
        timestamp.get('repeaterValue'),
        timestamp.get('repeaterUnit')
      );
      break;
    case '++':
      newDate = addTimestampUnitToDate(
        dateForTimestamp(timestamp),
        timestamp.get('repeaterValue'),
        timestamp.get('repeaterUnit')
      );
      while (isBefore(newDate, currentDate)) {
        newDate = addTimestampUnitToDate(
          newDate,
          timestamp.get('repeaterValue'),
          timestamp.get('repeaterUnit')
        );
      }
      break;
    case '.+':
      newDate = addTimestampUnitToDate(
        currentDate,
        timestamp.get('repeaterValue'),
        timestamp.get('repeaterUnit')
      );
      if (timestamp.get('repeaterUnit') !== 'h') {
        let timestampDate = dateForTimestamp(timestamp);
        newDate = setHours(newDate, getHours(timestampDate));
        newDate = setMinutes(newDate, getMinutes(timestampDate));
      }
      break;
    default:
      console.error(`Unrecognized timestamp repeater type: ${timestamp.get('repeaterType')}`);
      return timestamp;
  }

  timestamp = timestamp
    .set('day', format(newDate, 'dd'))
    .set('dayOfWeek', format(newDate, 'eee'))
    .set('month', format(newDate, 'MM'))
    .set('year', format(newDate, 'yyyy'));

  if (timestamp.get('startHour') !== undefined && timestamp.get('startHour') !== null) {
    timestamp = timestamp
      .set('startHour', format(newDate, 'HH'))
      .set('startMinute', format(newDate, 'mm'));
  }

  return timestamp;
};


export const convertRangeOfJSDateObjectsIntoDurationString = curry((start: Date, end: Date): string => {
  const minutes = differenceInMinutes(start, end)
  return pipe([
    minutesToHours,
    over([identity, pipe([hoursToMinutes, subtract(minutes)])]),
    over([pipe([head, toString]), pipe([tail, trimChars("-"), padCharsStart("0", 2)])]),
    join(":")
  ])(minutes)
});

export const convertRangeOfTimestampObjectsIntoDurationString = pipe([
  convertArrayOfTimestampObjectsIntoArrayOFJSDateObjects,
  spread(convertRangeOfJSDateObjectsIntoDurationString)
])



export const millisDuration = (millis: number): string => {
  return convertRangeOfJSDateObjectsIntoDurationString(DATEZERO, new Date(millis));
};
