import { test, fc } from "@fast-check/vitest";
import { describe, expect, assert } from "vitest";
import { split, pipe, concat, spread } from 'lodash/fp';
import { differenceInMinutes } from 'date-fns/fp'
import { convertDatePartsIntoStringDate } from "../../lib/timestamps"
import {
  assertIsSubset,
  assertIntegerInRangeInclusive,
  convertArraysToSetsAndAssertStrictEqual,
  convertArraysToSetsAndAssertIsSubset  ,
  convertToSet,
  assertYearMonthDayAndDayOfWeekTimestampObject,
  assertYearMonthDayAndDayOfWeekofArrayOfTimestampObjects,
  assertNumbers,
  assertDates  
} from "../Asserters"
import {
  TESTORGCAPTURETEMPLATESWITHCURSORSET,
  TESTORGCAPTURETEMPLATESWITHCURSOR,
  fastCheckGenerateValidJSDateObjectString,
  fastCheckGenerateValidJSDateObject,
  fastCheckGenerateCaptureTemplateString,
  fastCheckGenerateCaptureTemplateStringWithCursor,
  fastCheckRandomCharacterGenerator,
  convertCharacterIntoCharacterCode,
  fastCheckShuffledSubarray,
  fastCheckShuffledArray,
  fastCheckTestCaptureCustomVariablesObjectGenerator,
  fastCheckNLengthStringGenerator,
  fastCheckGenerateCaptureTemplateStringWithCustomVariablesAndCursor,
  fastCheckInactiveTimestampObjectGenerator,
  fastCheckActiveTimestampObjectGenerator,
  fastCheckActiveTimestampWithStartTimeObjectGenerator,
  fastCheckInactiveTimestampWithStartTimeObjectGenerator,
  fastCheckGenerateValidJSDateObjectStringWithDateParts,
  fastCheckJSDateObjectsRangeGenerator,
  fastCheckTimestampObjectRangeGenerator
} from "../TestDataGenerators.ts"

describe('TestDataGenerators suite', () => {

  describe('String generators suite', () => {
  test.prop([fc.string({ minLength: 1, maxLength: 1 })])(
    "convertCharacterIntoCharacterCode",
    (testChar) => {
      const actualCharCode: number =
            convertCharacterIntoCharacterCode(testChar);
    
      assert.isNumber(actualCharCode);
    },
  );

    test.prop([
    fc.tuple(
      fc.integer({ min: 1, max: 49 }),
      fc.integer({ min: 50, max: 100 }),
    ),
    fc.gen(),
  ])("fastCheckRandomCharacterGenerator", (testUTFRange, fcGen) => {
    const actualCharacter: string = fastCheckRandomCharacterGenerator(
      testUTFRange,
      fcGen,
    );
    const actualCharacterCode: number =
      convertCharacterIntoCharacterCode(actualCharacter);
    assertIntegerInRangeInclusive(
      testUTFRange,
      actualCharacterCode,
    );
    
  })
  });
  
  describe('Date generators', () => {
  test.prop([fc.gen()])
   ('fastCheckGenerateValidJSDateObject', (fcGen) => {
     const actualDateString: Date = fastCheckGenerateValidJSDateObject(fcGen)
     assert.instanceOf(actualDateString, Date)
     assert.isNumber(actualDateString.getFullYear())
     
   });
  
  test.prop([fc.gen()])
   ('fastCheckGenerateValidJSDateObjectString', (fcGen) => {
     const actualDateString: string = fastCheckGenerateValidJSDateObjectString(fcGen)
     // Jun 09 2025 = min length
     expect(actualDateString.length).toBeGreaterThan(11)
     
   });

    test.prop([fc.gen()])
   ('fastCheckGenerateValidJSDateObjectStringWithIntegerDateParts', (fcGen) => {
     const [actualDateString, actualDateParts]: [string, [number, number, number, number, number]] = fastCheckGenerateValidJSDateObjectStringWithDateParts(fcGen)
     assert.isString(actualDateString)
     assertNumbers(actualDateParts)
     expect(convertDatePartsIntoStringDate(actualDateParts)).toBe(actualDateString)
     
     
   });

    test.prop([fc.gen()])
   ('fastCheckJSDateObjectsRangeGenerator', (fcGen) => {
     const [actualDates, actualHoursAndMinutes]: [Array<Date>, Array<number>] = fastCheckJSDateObjectsRangeGenerator(fcGen)     
     assertDates(actualDates)
     assertNumbers(actualHoursAndMinutes)
     expect(spread(differenceInMinutes)(actualDates)).toBeGreaterThan(0)          
   });
    
  })
  describe('fastCheckTimestampObjectGenerator', () => {

    test.prop([fc.gen()])
   ('fastCheckInactiveTimestampObjectGenerator', (fcGen) => {
     const [actualTimestampObject] = fastCheckInactiveTimestampObjectGenerator(fcGen)
     expect(actualTimestampObject.isActive).toBeFalsy()
     assertYearMonthDayAndDayOfWeekTimestampObject(actualTimestampObject)
     
          
     
   });
    test.prop([fc.gen()])
   ('fastCheckActiveTimestampObjectGenerator', (fcGen) => {
     const [actualTimestampObject] = fastCheckActiveTimestampObjectGenerator(fcGen)
     expect(actualTimestampObject.isActive).toBeTruthy()
     assertYearMonthDayAndDayOfWeekTimestampObject(actualTimestampObject)
          
     
   });

    test.prop([fc.gen()])
   ('fastCheckTimestampWithStartTimeObjectGenerator', (fcGen) => {
     const [actualTimestampObject] = fastCheckActiveTimestampWithStartTimeObjectGenerator(fcGen)
     expect(actualTimestampObject.isActive).toBeTruthy()
     assertYearMonthDayAndDayOfWeekTimestampObject(actualTimestampObject)
     
          
     
   });
    test.prop([fc.gen()])
   ('fastCheckInactiveTimestampWithStartTimeObjectGenerator', (fcGen) => {
     const [actualTimestampObject] = fastCheckInactiveTimestampWithStartTimeObjectGenerator(fcGen)
     expect(actualTimestampObject.isActive).toBeFalsy()
     assertYearMonthDayAndDayOfWeekTimestampObject(actualTimestampObject)
          
     
   });

    test.prop([fc.gen()])
   ('fastCheckTimestampObjectRangeGenerator', (fcGen) => {
     const [actualTimestampObjects]: [Array<Date>, Array<number>] = fastCheckTimestampObjectRangeGenerator(fcGen)
     assertYearMonthDayAndDayOfWeekofArrayOfTimestampObjects(actualTimestampObjects)
     
   });

    
  });
    

  describe('Array generators suite', () => {

  test.prop([fc.array(fc.string(), { minLength: 1 }), fc.gen()])(
    "fastCheckShuffledSubarray",
    (testArray, fcGen) => {
      const actualShuffledSubarray: Array<string> = fastCheckShuffledSubarray(testArray, fcGen)
      convertArraysToSetsAndAssertIsSubset([actualShuffledSubarray, testArray])
      
    },
  );

  test.prop([fc.array(fc.string(), { minLength: 1 }), fc.gen()])(
    "fastCheckShuffledArray",
    (testArray, fcGen) => {
      const actualShuffledArray: Array<string> = fastCheckShuffledArray(fcGen, testArray)
      convertArraysToSetsAndAssertStrictEqual([actualShuffledArray, testArray])
    },
  );

    test.prop([fc.integer({ min: 1, max: 100 }), fc.gen()])(
    "fastCheckNLengthStringArrayGenerator",
    (testStringLength, fcGen) => {
      const actualStringArray: Array<string> =
            fastCheckNLengthStringGenerator(fcGen, testStringLength);
      expect(actualStringArray.length).toEqual(testStringLength)
      
    },
    );

  });
  describe('Capture template generators suite', () => {
    test.prop([fc.gen()])
   ('fastCheckGenerateCaptureTemplateString', (fcGen) => {
     const actualCaptureTemplateString: string = fastCheckGenerateCaptureTemplateString(fcGen)
     const actualExpandedStringParts: Set<string> = new Set(split(" ", actualCaptureTemplateString))
     assertIsSubset(actualExpandedStringParts, TESTORGCAPTURETEMPLATESWITHCURSORSET)                  
     
   });

  test.prop([fc.gen()])
   ('fastCheckGenerateCaptureTemplateStringWithCursor', (fcGen) => {
     
     const actualCaptureTemplateString: string = fastCheckGenerateCaptureTemplateStringWithCursor(fcGen)     
     const actualExpandedStringPartsSet: Set<string> = new Set(split(" ", actualCaptureTemplateString))
     
     assertIsSubset(actualExpandedStringPartsSet, TESTORGCAPTURETEMPLATESWITHCURSORSET)                  
     
   });

  test.prop([    
    fc.gen(),
    fc.integer({min: 2, max: 100})
  ])("fastCheckTestCaptureCustomVariablesObjectGenerator", (fcGen, testKeysCount) => {
    const testCustomVariablesObject: Record<string, string> = fastCheckTestCaptureCustomVariablesObjectGenerator(fcGen, testKeysCount)
    expect(Object.keys(testCustomVariablesObject).length).toEqual(testKeysCount)
    expect(Object.values(testCustomVariablesObject).length).toEqual(testKeysCount)
  })

  test.prop([fc.gen(),
    fc.integer({min: 2, max: 100})
  ])
   ('fastCheckGenerateCaptureTemplateStringWithCustomVariablesAndCursor', (fcGen, testKeysCount) => {
     
     const [actualCaptureTemplateString, testCustomVariablesObject] = fastCheckGenerateCaptureTemplateStringWithCustomVariablesAndCursor(fcGen, testKeysCount)

     const actualExpandedStringPartsSet: Set<string> = new Set(split(" ", actualCaptureTemplateString))
     
     const expectedSuperset = pipe([Object.keys, concat(TESTORGCAPTURETEMPLATESWITHCURSOR), convertToSet])(testCustomVariablesObject)

     assertIsSubset(actualExpandedStringPartsSet, expectedSuperset)
     
     
   });
  });

  
  
});
