import { test, fc } from "@fast-check/vitest";
import { describe, expect, assert } from "vitest";
import {
  startsWith,
  endsWith,
  over,
  reverse,
  toString,
  map,
  split,
  pipe,
  spread
} from "lodash/fp";
import { addMilliseconds, add } from "date-fns/fp"
import { 
  assertStartsWith,
  assertEndsWith,
  assertNumbers,
  zipWithAssertEqual
} from "../../test_helpers/Asserters"
import {
  fastCheckGenerateValidJSDateObject,
  fastCheckActiveTimestampObjectGenerator,
  fastCheckInactiveTimestampObjectGenerator,
  fastCheckActiveTimestampWithStartTimeObjectGenerator,
  fastCheckInactiveTimestampWithStartTimeObjectGenerator,
  fastCheckGenerateValidJSDateObjectStringWithDateParts,
  fastCheckJSDateObjectsRangeGenerator,
  fastCheckTimestampObjectRangeGenerator
} from "../../test_helpers/TestDataGenerators"
import { type Timestamp } from "../types"
import {
  convertJSDateObjectIntoTimestampStringWithAngleBrackets,
  convertDateIntoTimestampStringWithSquareBrackets,
  toDateString,
  orgTimestampFormat,
  orgTimestampFormatWithStartTime,
  orgTimestampFormatWithDayNameAndStartTime,
  convertJSDateObjectIntoTimestampObject,
  getTimestampObjectStartHour,
  getTimestampObjectStartMinute,
  timestampIsActive,
  getTimestampObjectYear,
  getCurrentDateAsTimestampObject,
  convertTimestampObjectIntoOrgTimestampString,
  convertTimestampObjectIntoJSDateString,
  convertDatePartsIntoStringDate,
  convertRangeOfJSDateObjectsIntoDurationString,
  convertRangeOfTimestampObjectsIntoDurationString,
  getYearMonthDayAndDayNumberFromJSDateObject,
  getYearMonthDayDayNumberHoursAndMinutesFromJSDateObject,
  convertTimestampObjectIntoJSDateObject,
  DATEZERO,
  DATEUNITSMAPPING,
  millisDuration,
  addTimestampUnitToDate,
  subtractTimestampUnitFromDate,
} from '../timestamps';


describe('timestamps test suite', () => {

  const formatters: Array<(date: Date) => string> = [
    orgTimestampFormat,
    orgTimestampFormatWithStartTime,
    orgTimestampFormatWithDayNameAndStartTime,
  ];
  
  test.prop([fc.gen()])
   ('toDateString', (fcGen) => {
     
     const testDate: Date = fastCheckGenerateValidJSDateObject(fcGen)
     const actualDateString: string = toDateString(testDate)
     expect(actualDateString).toBe(testDate.toDateString())

     
   });

  

    test.prop([fc.gen()])
   ('convertDatePartsIntoStringDate', (fcGen) => {
     
     const [expectedDate, testDateParts] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualDateString: string = convertDatePartsIntoStringDate(testDateParts)
     expect(actualDateString).toBe(expectedDate)

     
   });

  

  test.prop([fc.gen(), fc.constantFrom(...formatters)])
   ('convertJSDateObjectIntoTimestampStringWithAngleBrackets', (fcGen, testFunction) => {
     
     const [testDate, [expectedYear]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualTimestamp: string = convertJSDateObjectIntoTimestampStringWithAngleBrackets(testFunction, testDate)
     expect(startsWith("<", actualTimestamp)).toBeTruthy()
     expect(endsWith(">", actualTimestamp)).toBeTruthy()
     assert.include(actualTimestamp, expectedYear)
     
   });

  test.prop([fc.gen(), fc.constantFrom(...formatters)])
   ('convertDateIntoTimestampStringWithSquareBrackets', (fcGen, testFunction) => {

     const [testDate, [expectedYear]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualTimestamp: string = convertDateIntoTimestampStringWithSquareBrackets(testFunction, testDate) 
     expect(startsWith("[", actualTimestamp)).toBeTruthy()
     expect(endsWith("]", actualTimestamp)).toBeTruthy()
     assert.include(actualTimestamp, expectedYear)
     
   });

  describe('convertJSDateObjectIntoTimestampObject test suite', () => {

    test.prop([fc.gen()])
   ('with nothing selected', (fcGen) => {

     const [testDate, [expectedYear]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualTimestamp: Timestamp = convertJSDateObjectIntoTimestampObject({}, testDate);
     const [
       actualTimestampYear,
       actualTimestampIsActiveValue,
       actualTimestampStartHour,
       actualTimestampStartMinute 
     ] = over([getTimestampObjectYear, timestampIsActive, getTimestampObjectStartHour, getTimestampObjectStartMinute])(actualTimestamp)
     expect(actualTimestampYear).toBe(expectedYear);
     expect(actualTimestampIsActiveValue).toBeTruthy();     
     expect(actualTimestampStartHour).toBeFalsy();
     expect(actualTimestampStartMinute).toBeFalsy();
     
   });
    
    test.prop([fc.gen()])
   ('with isActive set to true', (fcGen) => {

     const [testDate, [expectedYear]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualTimestamp: Timestamp = convertJSDateObjectIntoTimestampObject({isActive: true}, testDate)
     const [
       actualTimestampYear,
       actualTimestampIsActiveValue,
       actualTimestampStartHour,
       actualTimestampStartMinute 
     ] = over([getTimestampObjectYear, timestampIsActive, getTimestampObjectStartHour, getTimestampObjectStartMinute])(actualTimestamp)
     expect(actualTimestampYear).toBe(expectedYear);
     expect(actualTimestampIsActiveValue).toBeTruthy();
     expect(actualTimestampStartHour).toBeFalsy();
     expect(actualTimestampStartMinute).toBeFalsy();
     

   });

    test.prop([fc.gen()])
   ('with isActive set to false', (fcGen) => {

     const [testDate, [expectedYear]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualTimestamp: Timestamp = convertJSDateObjectIntoTimestampObject({isActive: false}, testDate)
     const [
       actualTimestampYear,
       actualTimestampIsActiveValue,
       actualTimestampStartHour,
       actualTimestampStartMinute 
     ] = over([getTimestampObjectYear, timestampIsActive, getTimestampObjectStartHour, getTimestampObjectStartMinute])(actualTimestamp)
     expect(actualTimestampYear).toBe(expectedYear);
     expect(actualTimestampIsActiveValue).toBeFalsy();
     expect(actualTimestampStartHour).toBeFalsy();
     expect(actualTimestampStartMinute).toBeFalsy();
     

   });
    
    test.prop([fc.gen()])
   ('withStartTime set to true', (fcGen) => {

     const [testDate, [expectedYear]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualTimestamp: Timestamp = convertJSDateObjectIntoTimestampObject({withStartTime: true}, testDate)
     const [
       actualTimestampYear,
       actualTimestampIsActiveValue,
       actualTimestampStartHour,
       actualTimestampStartMinute 
     ] = over([getTimestampObjectYear, timestampIsActive, getTimestampObjectStartHour, getTimestampObjectStartMinute])(actualTimestamp)

     expect(actualTimestampYear).toBe(expectedYear);
     expect(actualTimestampIsActiveValue).toBeTruthy();
     assertNumbers([actualTimestampStartHour, actualTimestampStartMinute])

   });

    test.prop([fc.gen()])
   ('with isActive and withStartTime set to true', (fcGen) => {

     const [testDate, [expectedYear]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     const actualTimestamp: Timestamp = convertJSDateObjectIntoTimestampObject({isActive: true, withStartTime: true}, testDate)
     const [
       actualTimestampYear,
       actualTimestampIsActiveValue,
       actualTimestampStartHour,
       actualTimestampStartMinute 
     ] = over([getTimestampObjectYear, timestampIsActive, getTimestampObjectStartHour, getTimestampObjectStartMinute])(actualTimestamp)
     expect(actualTimestampYear).toBe(expectedYear);
     expect(actualTimestampIsActiveValue).toBeTruthy();
     assertNumbers([actualTimestampStartHour, actualTimestampStartMinute])
     
          
   });

    test.prop([fc.constant(new Date())])
   ('getCurrentDateAsTimestampObject', (expectedDate) => {

     const currentTimestamp: Timestamp = getCurrentDateAsTimestampObject()
     const expectedYear: number = expectedDate.getFullYear();     

     const [
       actualTimestampYear,
       actualTimestampIsActiveValue,
     ] = over([getTimestampObjectYear, timestampIsActive, getTimestampObjectStartHour, getTimestampObjectStartMinute])(currentTimestamp)
     expect(actualTimestampYear).toBe(expectedYear);
     expect(actualTimestampIsActiveValue).toBeTruthy();
     

   });
    
  });

  describe('convertTimestampObjectIntoOrgTimestampString test suite', () => {
    test.prop([fc.gen()])
   ('with BasicActiveTimestampObject', (fcGen) => {

     const [testTimestampObject, [expectedYear]] = fastCheckActiveTimestampObjectGenerator(fcGen)
     const actualOrgTimestamp: string = convertTimestampObjectIntoOrgTimestampString(testTimestampObject)
     expect(startsWith("<", actualOrgTimestamp)).toBeTruthy()
     expect(endsWith(">", actualOrgTimestamp)).toBeTruthy()
     assert.include(actualOrgTimestamp, expectedYear.toString())
     
   });

    test.prop([fc.gen()])
   ('with BasicInactiveTimestampObject', (fcGen) => {

     const [testTimestampObject, [expectedYear]] = fastCheckInactiveTimestampObjectGenerator(fcGen)
     const actualOrgTimestamp: string = convertTimestampObjectIntoOrgTimestampString(testTimestampObject)
     expect(startsWith("[", actualOrgTimestamp)).toBeTruthy()
     expect(endsWith("]", actualOrgTimestamp)).toBeTruthy()
     assert.include(actualOrgTimestamp, expectedYear.toString())
     
   });


    test.prop([fc.gen()])
   ('with BasicActiveTimestampWithStartTime', (fcGen) => {

     const [testTimestampObject, [expectedYear]] = fastCheckActiveTimestampWithStartTimeObjectGenerator(fcGen)
     const actualOrgTimestamp: string = convertTimestampObjectIntoOrgTimestampString(testTimestampObject)
     expect(startsWith("<", actualOrgTimestamp)).toBeTruthy()
     expect(endsWith(">", actualOrgTimestamp)).toBeTruthy()
     assert.include(actualOrgTimestamp, expectedYear.toString())
     
   });

    test.prop([fc.gen()])
   ('with BasicInactiveTimestampWithStart', (fcGen) => {

     const [testTimestampObject, [expectedYear]] = fastCheckInactiveTimestampWithStartTimeObjectGenerator(fcGen)
     const actualOrgTimestamp: string = convertTimestampObjectIntoOrgTimestampString(testTimestampObject)
     expect(startsWith("[", actualOrgTimestamp)).toBeTruthy()
     expect(endsWith("]", actualOrgTimestamp)).toBeTruthy()
     assert.include(actualOrgTimestamp, expectedYear.toString())
     
   });
    
  })

  describe('convertTimestampObjectIntoJSDateString test suite', () => {
    test.prop([fc.gen()])
   ('with start hour and start minute', (fcGen) => {

     const [testTimestampObject, ,testDate] = fastCheckActiveTimestampWithStartTimeObjectGenerator(fcGen)
     const actualOrgTimestamp: string = convertTimestampObjectIntoJSDateString(testTimestampObject)
     const expectedOrgTimestamp: string = toDateString(testDate)
     expect(actualOrgTimestamp).toBe(expectedOrgTimestamp)
     
   });

    test.prop([fc.gen()])
   ('without start hour and start minute', (fcGen) => {

     const [testTimestampObject, ,testDate] = fastCheckActiveTimestampObjectGenerator(fcGen)
     const actualOrgTimestamp: string = convertTimestampObjectIntoJSDateString(testTimestampObject)
     const expectedOrgTimestamp: string = toDateString(testDate)
     assert.include(actualOrgTimestamp, expectedOrgTimestamp)
     
   });
    
  })

  describe('convertTimestampObjectIntoJSDateObject', () => {

    test.prop([fc.gen()])
   ('without startTime', (fcGen) => {

     const [testTimestamp, [expectedYear, expectedMonth, expectedDay, expectedDayNumber]] = fastCheckActiveTimestampObjectGenerator(fcGen)
     const actualDate: Date = convertTimestampObjectIntoJSDateObject(testTimestamp)
     const actualDateParts: Array<number> = getYearMonthDayAndDayNumberFromJSDateObject(actualDate)
     zipWithAssertEqual(actualDateParts, [expectedYear, expectedMonth, expectedDay, expectedDayNumber])
     
   });

    test.prop([fc.gen()])
   ('with startTime', (fcGen) => {
     const [testTimestamp, expectedDateParts] = fastCheckActiveTimestampWithStartTimeObjectGenerator(fcGen)
     
     
     const actualDate: Date = convertTimestampObjectIntoJSDateObject(testTimestamp)
     const actualDateParts: Array<number> = getYearMonthDayDayNumberHoursAndMinutesFromJSDateObject(actualDate)
     zipWithAssertEqual(actualDateParts, expectedDateParts)

     
   });

  });

  describe('convertRangeOfJSDateObjectsIntoDurationString', () => {
    test.prop([fc.gen()])
   ('with positive difference', (fcGen) => {
     const [[testStart, testEnd], [expectedHours, expectedMinutes]] = fastCheckJSDateObjectsRangeGenerator(fcGen)
     const actualDurationString: string = convertRangeOfJSDateObjectsIntoDurationString(testStart, testEnd)
     assert.include(actualDurationString, ":")
     assertStartsWith(toString(expectedHours), actualDurationString)
     assertEndsWith(toString(expectedMinutes), actualDurationString)
          
   });

    test.prop([fc.gen()])
   ('with negative difference', (fcGen) => {
     
     const [[testStart, testEnd], [expectedHours, expectedMinutes]] = fastCheckJSDateObjectsRangeGenerator(fcGen)
     const actualDurationString: string = convertRangeOfJSDateObjectsIntoDurationString(testEnd, testStart)
     assert.include(actualDurationString, ":")
     assert.notInclude(actualDurationString, ":-")
     assertStartsWith(`-${expectedHours}`, actualDurationString)
     assertEndsWith(toString(expectedMinutes), actualDurationString)
     
     
   });
    


    
  })


  describe('convertRangeOfTimestampObjectsIntoDurationString', () => {

    test.prop([fc.gen()])
   ('with positive difference', (fcGen) => {
     const [testTimestamps, [[expectedHours, expectedMinutes]]] = fastCheckTimestampObjectRangeGenerator(fcGen)
     const actualDurationString: string = convertRangeOfTimestampObjectsIntoDurationString(testTimestamps)


     assert.include(actualDurationString, ":")
     assertStartsWith(toString(expectedHours), actualDurationString)
     assertEndsWith(toString(expectedMinutes), actualDurationString)
          
   });

    test.prop([fc.gen()])
   ('with negative difference', (fcGen) => {
     
     const [testTimestamps, [[expectedHours, expectedMinutes]]] = fastCheckTimestampObjectRangeGenerator(fcGen)
     const actualDurationString: string = convertRangeOfTimestampObjectsIntoDurationString(reverse(testTimestamps))
     assert.include(actualDurationString, ":")
     assert.notInclude(actualDurationString, ":-")
     assertStartsWith(`-${expectedHours}`, actualDurationString)
     assertEndsWith(toString(expectedMinutes), actualDurationString)
     
     
   });

    
  })

  describe('date arithmetic', () => {

      test.prop([fc.nat()])
   ('millisDuration', (testMilliseconds) => {
     
     const expectedEndDate: Date = addMilliseconds(testMilliseconds, new Date(0))
     const actualDurationString: string = millisDuration(testMilliseconds)
     const [actualHours, actualMinutes] = pipe([split(":"), map(parseInt)])(actualDurationString)
     const actualEndDate: Date = add({hours: actualHours, minutes: actualMinutes}, DATEZERO)
     
     pipe([map(getYearMonthDayDayNumberHoursAndMinutesFromJSDateObject),
       spread(zipWithAssertEqual)])([actualEndDate, expectedEndDate])


   });

    test.prop([fc.nat()])
   ('convertTimeUnitsIntoDurationObject', (testMilliseconds) => {

     

   });

  })
  

})

