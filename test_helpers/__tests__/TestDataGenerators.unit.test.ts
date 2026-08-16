import { test, fc } from "@fast-check/vitest";
import { describe, expect, assert } from "vitest";
import { isMap } from "immutable";
import {
  forEach,
  over,
  overSome,
  pipe,
  map,
  spread,
  isDate,
  isObject,
  isEmpty,
  split
} from "lodash/fp";
import {
  isWithinInterval,
  isBefore,
  differenceInDays,
  differenceInHours,
} from "date-fns/fp";
import {
  REGULARTIMESTAMPTESTCASES,
  TIMESTAMPSWITHREPEATERTESTCASES,
  TESTREPEATERTYPESSET,
  TESTREPEATERUNITSSET,
  TESTDEADLINEUNITSSET,
  TESTDELAYTYPESSET,
  TESTDELAYUNITSSET,
} from "../Constants";
import type { OrgTimestampPart, RepeaterType } from "../../src/types";
import { convertCharacterIntoCharacterCode } from "../../src/util/transformers";
import {
  getHourPartFromDate,
  getMinutePartFromDate,
} from "../../src/lib/timestamps";
import {
  assertIntegerInRangeInclusive,
  convertArraysToSetsAndAssertStrictEqual,
  convertArraysToSetsAndAssertIsSubset,
  assertArrayOfIntegersInRangeInclusive,
  assertIntegerInRangeExclusive,
  assertStrings,
  parseIntAndAssertIntegerInRangeInclusive,
} from "../Asserters";
import {
  fcGenRandomItemFromArray,
  fcGenRandomIntegerInRange,
  fcGenValidJSDateObjectString,
  fcGenValidJSDateObject,
  fcGenRandomCharacterGenerator,
  fcShuffledSubarray,
  fcShuffledArray,
  fcNLengthUniqueStringArrayGenerator,
  fcGenRandomColorObject,
  fcGenRandomObjectKeyValuePair,
  fcGenTimeRangeParts,
  fcGenOrgTimestampPartRecord,
  fcGenRandomOrgTimestampPartRecord,
  fcGenOrgTimestampPartRecordWithCumulateRepeater,
  fcGenOrgTimestampPartRecordWithCatchupRepeater,
  fcGenOrgTimestampPartRecordWithRestartRepeater,
  fcGenOrgTimestampPartRecordWithRepeater,
  fcGenRandomOrgTimestampPartRecordWithRepeater,
  fcGenValidJSDateObjectRange,
  fcGenValidJSDateObjectInRange,
  randomHourPart,
  randomMinutePart,
  fcGenRandomImmutableMap,
  fcGenObject,
  fcGenRandomObject,
  fcGenListOfNObjectKeys,
  fcGenRandomListOfObjectKeys,
  fcGenListOfNObjectKeyValuePairs,
  fcGenRandomListOfObjectKeyValuePairs,
  fcGenRandomRepeaterValue,
  fcGenRandomTimeString
} from "../TestDataGenerators.ts";

const isRepeaterType = (
  actualVal: any,
  repeaterTypesSet = TESTREPEATERTYPESSET,
): boolean => repeaterTypesSet.has(actualVal);
const isRepeaterUnit = (
  withStartTime: boolean,
  actualVal: any,
  repeaterUnitsSet = TESTREPEATERUNITSSET,
): boolean => {
  if (withStartTime) {
    return repeaterUnitsSet.has(actualVal);
  }
  return repeaterUnitsSet.has(actualVal) && actualVal !== "h";
};

const isDeadlineUnit = (
  withStartTime: boolean,
  actualVal: any,
  deadlineUnitsSet = TESTDEADLINEUNITSSET,
): boolean => {
  if (withStartTime) {
    return deadlineUnitsSet.has(actualVal);
  }
  return deadlineUnitsSet.has(actualVal) && actualVal !== "h";
};

const isDelayType = (
  actualVal: any,
  delayTypesSet = TESTDELAYTYPESSET,
): boolean => delayTypesSet.has(actualVal);

const isDelayUnit = (
  withStartTime: boolean,
  actualVal: any,
  delayUnitsSet = TESTDELAYUNITSSET,
): boolean => {
  if (withStartTime) {
    return delayUnitsSet.has(actualVal);
  }
  return delayUnitsSet.has(actualVal) && actualVal !== "h";
};

const isValidDateWithStartTime = (actualDate: Date): void => {
  expect([actualDate.getSeconds(), actualDate.getMilliseconds()]).toStrictEqual(
    [0, 0],
  );
};

const isValidNoStartTimeDate = (actualDate: Date): void => {
  expect([
    actualDate.getHours(),
    actualDate.getMinutes(),
    actualDate.getSeconds(),
    actualDate.getMilliseconds(),
  ]).toStrictEqual([0, 0, 0, 0]);
};

describe("TestDataGenerators test suite", () => {
  describe("non-fast-check generators", () => {
    describe("time", () => {
      test.prop([fc.gen()])("randomHourPart", (_) => {
        const actualHour: string = randomHourPart();
        assert.isString(actualHour);
        assert.lengthOf(actualHour, 2);
        parseIntAndAssertIntegerInRangeInclusive([0, 24], actualHour);
      });

      test.prop([fc.gen()])("randomMinutePart", (_) => {
        const actualMinute: string = randomMinutePart();
        assert.isString(actualMinute);
        assert.lengthOf(actualMinute, 2);
        parseIntAndAssertIntegerInRangeInclusive([0, 60], actualMinute);
      });
    });
  });
  describe("for fast-check", () => {
    describe("String generators suite", () => {
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
      ])("fcGenRandomCharacterGenerator", (testUTFRange, fcGen) => {
        const actualCharacter: string = fcGenRandomCharacterGenerator(
          testUTFRange,
          fcGen,
        );
        const actualCharacterCode: number =
          convertCharacterIntoCharacterCode(actualCharacter);
        assertIntegerInRangeInclusive(testUTFRange, actualCharacterCode);
      });
    });

    describe("Date generators", () => {
      describe("fcGenValidJSDateObject", () => {
        test.prop([fc.gen()])("withStartTime", (fcGen) => {
          const actualDate: Date = fcGenValidJSDateObject(fcGen);
          assert.instanceOf(actualDate, Date);
          assert.isNumber(actualDate.getFullYear());
          isValidDateWithStartTime(actualDate);
        });

        test.prop([fc.gen()])("withoutStartTime", (fcGen) => {
          const actualDate: Date = fcGenValidJSDateObject(fcGen, false);
          assert.instanceOf(actualDate, Date);
          assert.isNumber(actualDate.getFullYear());
          isValidNoStartTimeDate(actualDate);
        });
      });

      test.prop([fc.boolean(), fc.gen()])(
        "fcGenValidJSDateObject",
        (withStartTime, fcGen) => {
          const actualDateString: string = fcGenValidJSDateObjectString(
            fcGen,
            withStartTime,
          );
          // Jun 09 2025 = min length
          expect(actualDateString.length).toBeGreaterThan(11);
        },
      );

      describe("fcGenValidJSDateObjectRange", () => {
        test.prop([fc.gen()])("withStartTime", (fcGen) => {
          const [actualStart, actualEnd] = fcGenValidJSDateObjectRange(
            true,
            fcGen,
          );
          expect(isBefore(actualEnd, actualStart)).toBeTruthy();
          // At least two hour difference is needed for repeater tests
          expect(differenceInHours(actualStart, actualEnd)).toBeGreaterThan(1);
          forEach(isValidDateWithStartTime)([actualStart, actualEnd]);
        });

        test.prop([fc.gen()])("withoutStartTime", (fcGen) => {
          const [actualStart, actualEnd] = fcGenValidJSDateObjectRange(
            false,
            fcGen,
          );
          expect(isBefore(actualEnd, actualStart)).toBeTruthy();
          // At least two day difference is needed for repeater tests
          expect(differenceInDays(actualStart, actualEnd)).toBeGreaterThan(1);
          forEach(isValidNoStartTimeDate)([actualStart, actualEnd]);
        });
      });

      describe("fcGenValidJSDateObjectInRange", () => {
        test.prop([fc.gen()])("withStartTime", (fcGen) => {
          const [start, end] = fcGenValidJSDateObjectRange(true, fcGen);
          const actualDate = fcGenValidJSDateObjectInRange(
            true,
            start,
            end,
            fcGen,
          );
          expect(isWithinInterval({ start, end }, actualDate)).toBeTruthy();
          isValidDateWithStartTime(actualDate);
        });

        test.prop([fc.gen()])("withoutStartTime", (fcGen) => {
          const [start, end] = fcGenValidJSDateObjectRange(false, fcGen);
          const actualDate = fcGenValidJSDateObjectInRange(
            false,
            start,
            end,
            fcGen,
          );
          expect(isWithinInterval({ start, end }, actualDate)).toBeTruthy();
          isValidNoStartTimeDate(actualDate);
        });
      });
    });

    describe("Array generators suite", () => {
      test.prop([fc.array(fc.string(), { minLength: 1 }), fc.gen()])(
        "fcShuffledSubarray",
        (testArray, fcGen) => {
          const testLength = fcGenRandomIntegerInRange(fcGen, [
            1,
            testArray.length,
          ]);
          const actualShuffledSubarray: Array<string> = fcShuffledSubarray(
            testLength,
            fcGen,
            testArray,
          );
          convertArraysToSetsAndAssertIsSubset([
            actualShuffledSubarray,
            testArray,
          ]);
        },
      );

      test.prop([fc.array(fc.string(), { minLength: 1 }), fc.gen()])(
        "fcShuffledArray",
        (testArray, fcGen) => {
          const actualShuffledArray: Array<string> = fcShuffledArray(
            fcGen,
            testArray,
          );
          convertArraysToSetsAndAssertStrictEqual([
            actualShuffledArray,
            testArray,
          ]);
        },
      );

      test.prop([fc.integer({ min: 1, max: 100 }), fc.gen()])(
        "fcNLengthUniqueStringArrayGenerator",
        (testStringLength, fcGen) => {
          const actualStringArray: Array<string> =
            fcNLengthUniqueStringArrayGenerator(fcGen, testStringLength);
          expect(actualStringArray.length).toEqual(testStringLength);
        },
      );
    });

    describe("Object generators suite", () => {
      test.prop([fc.gen(), fc.integer({ min: 1, max: 25 })])(
        "fcGenObject",
        (fcGen, testKeysCount) => {
          const actualObj = fcGenObject(testKeysCount, fcGen);
          expect(isObject(actualObj)).toBeTruthy();
          assert.lengthOf(Object.keys(actualObj), testKeysCount);
          expect(fcGenRandomItemFromArray(Object.values(actualObj))).toBeDefined();
        },
      );
      test.prop([fc.gen()])("fcGenRandomObject", (fcGen) => {
        const actualObj = fcGenRandomObject(fcGen);
        expect(isObject(actualObj)).toBeTruthy();
        expect(Object.keys(actualObj).length).toBeGreaterThan(0);
      });

      test.prop([fc.map(fc.string(), fc.anything(), { minKeys: 1 }), fc.gen()])(
        "fcGenRandomObjectKeyValuePair",
        (testMap, fcGen) => {
          const testObj: Record<string, any> = Object.fromEntries(testMap);
          const [actualKey, actualValue] = fcGenRandomObjectKeyValuePair(
            fcGen,
            testObj,
          );
          expect(testObj[actualKey]).toBe(actualValue);
        },
      );

      test.prop([fc.gen(), fc.integer({ min: 1, max: 25 })])(
        "fcGenListOfNObjectKeys",
        (fcGen, testKeysCount) => {
          const testObj = fcGenObject(testKeysCount, fcGen);
          const testCount: number = fcGenRandomIntegerInRange(fcGen, [
            1,
            testKeysCount,
          ]);
          const actualKeys = fcGenListOfNObjectKeys(testCount, fcGen, testObj);
          const actualKey = fcGenRandomItemFromArray(fcGen, actualKeys);

          assert.lengthOf(actualKeys, testCount);
          expect(testObj.hasOwnProperty(actualKey)).toBeTruthy();
        },
      );

      test.prop([fc.gen()])("fcGenRandomListOfObjectKeys", (fcGen) => {
        const testObj = fcGenRandomObject(fcGen);
        const actualKeys = fcGenRandomListOfObjectKeys(fcGen, testObj);

        const actualRandomKey = fcGenRandomItemFromArray(fcGen, actualKeys);
        expect(testObj.hasOwnProperty(actualRandomKey)).toBeTruthy();
      });

      test.prop([fc.gen(), fc.integer({ min: 1, max: 25 })])(
        "fcGenListOfNObjectKeyValuePairs",
        (fcGen, testKeysCount) => {
          const testObj = fcGenObject(testKeysCount, fcGen);
          const testCount: number = fcGenRandomIntegerInRange(fcGen, [
            1,
            testKeysCount,
          ]);
          const actualPairs = fcGenListOfNObjectKeyValuePairs(
            testCount,
            fcGen,
            testObj,
          );
          const [actualKey, actualValue] = fcGenRandomItemFromArray(
            fcGen,
            actualPairs,
          );

          assert.lengthOf(actualPairs, testCount);
          expect(testObj[actualKey]).toBe(actualValue);
        },
      );

      test.prop([fc.gen()])("fcGenRandomListOfObjectKeyValuePairs", (fcGen) => {
        const testObj = fcGenRandomObject(fcGen);
        const actualPairs = fcGenRandomListOfObjectKeyValuePairs(
          fcGen,
          testObj,
        );

        const [actualKey, actualValue] = fcGenRandomItemFromArray(
          fcGen,
          actualPairs,
        );

        expect(testObj[actualKey]).toBe(actualValue);
      });
    });

    describe("Immutable Object generators suite", () => {
      test.prop([fc.gen()])("fcGenRandomImmutableMap", (fcGen) => {
        const [actualMap, actualObj] = fcGenRandomImmutableMap(fcGen);
        expect(isMap(actualMap)).toBeTruthy();
        expect(actualMap.isEmpty()).toBe(false);
        expect(isObject(actualObj)).toBeTruthy();
        expect(isEmpty(actualObj)).toBe(false);
      });
    });

    describe("Color generators suite", () => {
      test.prop([fc.gen()])("fcGenRandomColorObject", (fcGen) => {
        const {
          r: actualR,
          g: actualG,
          b: actualB,
          alpha: actualAlpha,
        } = fcGenRandomColorObject(fcGen);
        assertArrayOfIntegersInRangeInclusive(
          [0, 255],
          [actualR, actualG, actualB],
        );
        assertIntegerInRangeExclusive([0, 1], actualAlpha);
      });
    });

    describe("Timestamp generators suite", () => {
      test.prop([fc.gen()])("fcGenTimeRangeParts", (fcGen) => {
        const testDate = fcGenValidJSDateObject(fcGen);
        const testTimeRangeStartParts: Array<string> = over([
          getHourPartFromDate,
          getMinutePartFromDate,
        ])(testDate);
        const actualTimeRangeParts = fcGenTimeRangeParts(
          testTimeRangeStartParts,
          fcGen,
        );
        const testAsserters: Array<
          (
            startHour: number,
            startMinute: number,
            endHour: number,
            endMinute: number,
          ) => boolean
        > = [
          (
            startHour: number,
            _startMinute: number,
            endHour: number,
            _endMinute: number,
          ): boolean => endHour > startHour,
          (
            startHour: number,
            startMinute: number,
            endHour: number,
            endMinute: number,
          ): boolean => endHour === startHour && endMinute > startMinute,
        ];
        const asserter = pipe([
          map(parseInt),
          overSome(map(spread)(testAsserters)),
        ]);

        expect(asserter(actualTimeRangeParts)).toBeTruthy();
      });

      test.prop([fc.gen()])("fcGenRandomTimeString", (fcGen) => {
	const actualTime = fcGenRandomTimeString(fcGen)
	const [actualHour, actualMinute] = split(":",actualTime)
	parseIntAndAssertIntegerInRangeInclusive([0, 23], actualHour);
	parseIntAndAssertIntegerInRangeInclusive([0, 59], actualMinute);

      });

      test.prop([fc.boolean(), fc.gen()])("fcGenRandomRepeaterValue", (withStartTime, fcGen) => {
	const actualRepeaterValue = fcGenRandomRepeaterValue(withStartTime, fcGen)
	assert.isNumber(actualRepeaterValue)
      });


      describe("Individual repeater types suite", () => {
        describe("fcGenOrgTimestampPartRecordWithCumulateRepeater", () => {
          test.prop([fc.boolean(), fc.gen()])(
            "withDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithCumulateRepeater(
                { withStartTime, withDeadline: true },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: "+",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: expect.any(Number),
                  repeaterDeadlineUnit: expect.any(String),
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
                expect(
                  isDeadlineUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterDeadlineUnit,
                  ),
                ).toBeTruthy();
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );

          test.prop([fc.boolean(), fc.gen()])(
            "withoutDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithCumulateRepeater(
                { withStartTime, withDeadline: false },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: "+",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: null,
                  repeaterDeadlineUnit: null,
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );
        });

        describe("fcGenOrgTimestampPartRecordWithCatchupRepeater", () => {
          test.prop([fc.boolean(), fc.gen()])(
            "withDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithCatchupRepeater(
                { withStartTime, withDeadline: true },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: "++",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: expect.any(Number),
                  repeaterDeadlineUnit: expect.any(String),
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
                expect(
                  isDeadlineUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterDeadlineUnit,
                  ),
                ).toBeTruthy();
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );

          test.prop([fc.boolean(), fc.gen()])(
            "withoutDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithCatchupRepeater(
                { withStartTime, withDeadline: false },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: "++",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: null,
                  repeaterDeadlineUnit: null,
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
                assert.isNumber(actualTimestampPartObject.repeaterValue);
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );
        });
        describe("fcGenOrgTimestampPartRecordWithCatchupRepeater", () => {
          test.prop([fc.boolean(), fc.gen()])(
            "withDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithCatchupRepeater(
                { withStartTime, withDeadline: true },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: "++",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: expect.any(Number),
                  repeaterDeadlineUnit: expect.any(String),
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
                expect(
                  isDeadlineUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterDeadlineUnit,
                  ),
                ).toBeTruthy();
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );

          test.prop([fc.boolean(), fc.gen()])(
            "withoutDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithCatchupRepeater(
                { withStartTime, withDeadline: false },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: "++",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: null,
                  repeaterDeadlineUnit: null,
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
                assert.isNumber(actualTimestampPartObject.repeaterValue);
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );
        });

        describe("fcGenOrgTimestampPartRecordWithRestartRepeater", () => {
          test.prop([fc.boolean(), fc.gen()])(
            "withDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithRestartRepeater(
                { withStartTime, withDeadline: true },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: ".+",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: expect.any(Number),
                  repeaterDeadlineUnit: expect.any(String),
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
                expect(
                  isDeadlineUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterDeadlineUnit,
                  ),
                ).toBeTruthy();
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );

          test.prop([fc.boolean(), fc.gen()])(
            "withoutDeadline",
            (withStartTime, fcGen) => {
              const [
                testTimestampPartRecord,
                testCurrentDate,
                expectedNextRepeatTimestampPartObject,
              ] = fcGenOrgTimestampPartRecordWithRestartRepeater(
                { withStartTime, withDeadline: false },
                fcGen,
              );

              forEach((actualTimestampPartObject: OrgTimestampPart) => {
                expect(actualTimestampPartObject).toMatchObject({
                  isActive: true,
                  withStartTime,
                  year: expect.any(String),
                  month: expect.any(String),
                  day: expect.any(String),
                  dayName: expect.any(String),
                  endHour: null,
                  endMinute: null,
                  repeaterType: ".+",
                  repeaterValue: expect.any(Number),
                  repeaterUnit: expect.any(String),
                  repeaterDeadlineValue: null,
                  repeaterDeadlineUnit: null,
                });

                expect(
                  isRepeaterUnit(
                    withStartTime,
                    actualTimestampPartObject.repeaterUnit,
                  ),
                ).toBeTruthy();
                assert.isNumber(actualTimestampPartObject.repeaterValue);
              })([
                testTimestampPartRecord.toJS(),
                expectedNextRepeatTimestampPartObject,
              ]);

              expect(testCurrentDate).toEqual(expect.any(Date));
            },
          );
        });
      });

      describe("fcGenOrgTimestampPartRecord", () => {
        const testRunner =
          (fcGen: fc.GeneratorValue) =>
          (timestampArgs: Record<string, boolean>) => {
            const [actualTimestamp, actualDate, actualText] =
              fcGenOrgTimestampPartRecord(timestampArgs, fcGen);

            const {
              isActive = false,
              withStartTime = false,
              withEndTime = false,
              withRepeater = false,
              withDeadline = false,
              withDelay = false,
            } = timestampArgs;

            expect(actualDate).toEqual(expect.any(Date));
            assert.isString(actualText);
            const actualTimestampObject = actualTimestamp.toJS();

            expect(actualTimestampObject).toMatchObject({
              isActive,
              withStartTime,
              year: expect.any(String),
              month: expect.any(String),
              day: expect.any(String),
              dayName: expect.any(String),
              startHour: expect.any(String),
              startMinute: expect.any(String),
            });

            if (withRepeater) {
              expect(
                isRepeaterType(actualTimestampObject.repeaterType),
              ).toBeTruthy();
              expect(
                isRepeaterUnit(
                  withStartTime,
                  actualTimestampObject.repeaterUnit,
                ),
              ).toBeTruthy();
              assert.isNumber(actualTimestampObject.repeaterValue);
            }

            if (withDeadline) {
              expect(
                isDeadlineUnit(
                  withStartTime,
                  actualTimestampObject.repeaterDeadlineUnit,
                ),
              ).toBeTruthy();
              assert.isNumber(actualTimestampObject.repeaterDeadlineValue);
            }

            if (withDelay) {
              expect(isDelayType(actualTimestampObject.delayType)).toBeTruthy();
              expect(
                isDelayUnit(withStartTime, actualTimestampObject.delayUnit),
              ).toBeTruthy();
              assert.isNumber(actualTimestampObject.delayValue);
            }

            if (withEndTime) {
              assertStrings([
                actualTimestampObject.endHour,
                actualTimestampObject.endMinute,
              ]);
            }
          };

        test.prop([fc.gen()])("runner", (fcGen) => {
          forEach(testRunner(fcGen))(REGULARTIMESTAMPTESTCASES);
        });
      });

      test.prop([fc.gen()])("fcGenRandomOrgTimestampPartRecord", (fcGen) => {
        const [actualTimestamp, actualDate, actualText] =
          fcGenRandomOrgTimestampPartRecord(fcGen);
        expect(actualDate).toEqual(expect.any(Date));
        assert.isString(actualText);

        expect(actualTimestamp.toJS()).toMatchObject({
          isActive: expect.any(Boolean),
          withStartTime: expect.any(Boolean),
          year: expect.any(String),
          month: expect.any(String),
          day: expect.any(String),
          dayName: expect.any(String),
        });
      });

      describe("fcGenOrgTimestampPartRecordWithRepeater", () => {
        const testRunner =
          (fcGen: fc.GeneratorValue) =>
          (timestampArgs: {
            repeaterType: RepeaterType;
            withStartTime: boolean;
            withDeadline: boolean;
          }) => {
            const [
              testTimestampPartRecord,
              testCurrentDate,
              expectedNextRepeatTimestampPartObject,
            ] = fcGenOrgTimestampPartRecordWithRepeater(timestampArgs, fcGen);

            const { repeaterType, withStartTime, withDeadline } = timestampArgs;

            forEach((actualTimestampPartObject: OrgTimestampPart) => {
              expect(actualTimestampPartObject).toMatchObject({
                isActive: expect.any(Boolean),
                withStartTime,
                year: expect.any(String),
                month: expect.any(String),
                day: expect.any(String),
                dayName: expect.any(String),
                endHour: null,
                endMinute: null,
                repeaterType,
                repeaterValue: expect.any(Number),
                repeaterUnit: expect.any(String),
                delayType: null,
                delayValue: null,
                delayUnit: null,
              });
              if (withDeadline) {
                expect(actualTimestampPartObject).toMatchObject({
                  repeaterDeadlineValue: expect.any(Number),
                  repeaterDeadlineUnit: expect.any(String),
                });
              }
            })([
              testTimestampPartRecord.toJS(),
              expectedNextRepeatTimestampPartObject,
            ]);

            expect(isDate(testCurrentDate)).toBeTruthy();
          };

        test.prop([fc.gen()])("runner", (fcGen) => {
          forEach(testRunner(fcGen))(TIMESTAMPSWITHREPEATERTESTCASES);
        });
      });

      test.prop([fc.gen()])(
        "fcGenRandomOrgTimestampPartWithRepeater",
        (fcGen) => {
          const [
            testTimestampPartRecord,
            testCurrentDate,
            expectedNextRepeatTimestampPartObject,
          ] = fcGenRandomOrgTimestampPartRecordWithRepeater(fcGen);

          forEach((actualTimestampPartObject: OrgTimestampPart) => {
            expect(actualTimestampPartObject).toMatchObject({
              isActive: expect.any(Boolean),
              withStartTime: expect.any(Boolean),
              year: expect.any(String),
              month: expect.any(String),
              day: expect.any(String),
              dayName: expect.any(String),
              endHour: null,
              endMinute: null,
              repeaterType: expect.any(String),
              repeaterValue: expect.any(Number),
              repeaterUnit: expect.any(String),
            });
          })([
            testTimestampPartRecord.toJS(),
            expectedNextRepeatTimestampPartObject,
          ]);

          expect(testCurrentDate).toEqual(expect.any(Date));
        },
      );
    });
  });
});
