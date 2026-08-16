import { describe, expect, assert } from "vitest";
import { test, fc } from "@fast-check/vitest";
import { type MapOf } from "immutable";
import {
  addHours,
  addMinutes,
  hoursToMilliseconds,
  minutesToMilliseconds,
  differenceInHours,
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
} from "date-fns/fp";
import {
  pipe,
  padCharsStart,
  zipAll,
  difference,
  startsWith,
  endsWith,
  forEach,
} from "lodash/fp";
import type {
  TimestampUnit,
  OrgTimestampPart,
  RepeaterType,
} from "../../types";
import { TIMESTAMPUNITS, HOURSINADAY, DAYABBREVS } from "../constants";
import {
  RENDERASTEXTESTCASES,
  APPLYREPEATERTESTCASES,
} from "./test_constants.ts";
import {
  fcGenRandomRepeaterType,
  fcGenValidJSDateObject,
  fcGenRandomItemFromArray,
  fcGenOrgTimestampPartRecord,
  fcGenOrgTimestampPartRecordWithRepeater,
  fcGenOrgTimestampPartObjectWithRepeaterTypeX,
} from "../../../test_helpers/TestDataGenerators";
import { parseIntAndAssertIntegerInRangeInclusive } from "../../../test_helpers/Asserters";
import {
  addTimestampUnitToDate,
  subtractTimestampUnitFromDate,
  millisDuration,
  dateDuration,
  timestampPartObjectForDate,
  timestampPartRecordForDate,
  getCurrentTimestamp,
  dateForTimestamp,
  convertDayNumberIntoDayName,
  timestampDuration,
  getJSDateAsOrgTimestampString,
  getCurrentJSDateAsOrgTimestampString,
  renderAsText,
  applyRepeater,
  getYearFromDate,
  getMonthFromDate,
  getDayFromDate,
  getDayNameFromDate,
  getStartHourFromDate,
  getStartMinuteFromDate,
  createNextRepeatTimestampPartRecord,
} from "../timestamps";
import { unfold } from "../../util/transformers";

describe("timestamp unit tests", () => {
  describe("JS Date Object functions", () => {
    describe("date arithmetic", () => {
      const DIFFFUNCTIONS = [
        differenceInHours,
        differenceInDays,
        differenceInWeeks,
        differenceInMonths,
        differenceInYears,
      ];

      const UNITSDIFF = zipAll([TIMESTAMPUNITS, DIFFFUNCTIONS]);

      const INVALIDUNITS = difference(
        unfold((x: number) => String.fromCharCode(x + 65), 26),
        TIMESTAMPUNITS,
      );

      describe("addTimestampUnitToDate", () => {
        test.prop([fc.nat({ max: 10000 }), fc.gen()])(
          "valid unit",
          (testNumUnits, fcGen) => {
            const [testTimestampUnit, diffFunction]: [TimestampUnit, Function] =
              fcGenRandomItemFromArray(fcGen, UNITSDIFF);
            const testDate: Date = fcGenValidJSDateObject(fcGen);
            const actualNewDate: Date = addTimestampUnitToDate(
              testTimestampUnit,
              testNumUnits,
              testDate,
            );
            // issues with precision
            assert.closeTo(
              diffFunction(testDate, actualNewDate),
              testNumUnits,
              1,
            );
          },
        );

        test.prop([fc.nat({ max: 10000 }), fc.gen()])(
          "invalid unit",
          (testNumUnits, fcGen) => {
            const testTimestampUnit = fcGenRandomItemFromArray(
              fcGen,
              INVALIDUNITS,
            );
            const testDate: Date = fcGenValidJSDateObject(fcGen);
            const actualNewDate: Date = addTimestampUnitToDate(
              testTimestampUnit,
              testNumUnits,
              testDate,
            );
            expect(actualNewDate).toBe(testDate);
          },
        );
      });

      describe("subtractTimestampUnitFromDate", () => {
        test.prop([fc.nat({ max: 10000 }), fc.gen()])(
          "valid unit",
          (testNumUnits, fcGen) => {
            const [testTimestampUnit, diffFunction]: [TimestampUnit, Function] =
              fcGenRandomItemFromArray(fcGen, UNITSDIFF);
            const testDate: Date = fcGenValidJSDateObject(fcGen);
            const actualNewDate: Date = subtractTimestampUnitFromDate(
              testTimestampUnit,
              testNumUnits,
              testDate,
            );
            expect(diffFunction(actualNewDate, testDate)).toBe(testNumUnits);
          },
        );

        test.prop([fc.nat({ max: 10000 }), fc.gen()])(
          "invalid unit",
          (testNumUnits, fcGen) => {
            const testTimestampUnit = fcGenRandomItemFromArray(
              fcGen,
              INVALIDUNITS,
            );
            const testDate: Date = fcGenValidJSDateObject(fcGen);
            const actualNewDate: Date = subtractTimestampUnitFromDate(
              testTimestampUnit,
              testNumUnits,
              testDate,
            );

            expect(actualNewDate).toBe(testDate);
          },
        );
      });
    });

    describe("getters", () => {
      test.prop([fc.gen()])("getYearFromDate", (fcGen) => {
        const testDate: Date = fcGenValidJSDateObject(fcGen);
        const actualYear = getYearFromDate(testDate);
        parseIntAndAssertIntegerInRangeInclusive([2000, 3000], actualYear);
      });
      test.prop([fc.gen()])("getMonthFromDate", (fcGen) => {
        const testDate: Date = fcGenValidJSDateObject(fcGen);
        const actualMonth = getMonthFromDate(testDate);
        parseIntAndAssertIntegerInRangeInclusive([1, 12], actualMonth);
      });
      test.prop([fc.gen()])("getDayFromDate", (fcGen) => {
        const testDate: Date = fcGenValidJSDateObject(fcGen);
        const actualDay = getDayFromDate(testDate);
        parseIntAndAssertIntegerInRangeInclusive([1, 31], actualDay);
      });
      test.prop([fc.gen()])("getDayNameFromDate", (fcGen) => {
        const testDate: Date = fcGenValidJSDateObject(fcGen);
        const actualDayName = getDayNameFromDate(testDate);
        assert.include(DAYABBREVS, actualDayName);
      });
      test.prop([fc.gen()])("getStartHourFromDate", (fcGen) => {
        const testDate: Date = fcGenValidJSDateObject(fcGen);
        const actualStartHour = getStartHourFromDate(testDate);
        parseIntAndAssertIntegerInRangeInclusive([0, 23], actualStartHour);
      });
      test.prop([fc.gen()])("getStartMinuteFromDate", (fcGen) => {
        const testDate: Date = fcGenValidJSDateObject(fcGen);
        const actualStartMinute = getStartMinuteFromDate(testDate);
        parseIntAndAssertIntegerInRangeInclusive([0, 59], actualStartMinute);
      });
    });

    describe("dateDuration tests", () => {
      test.prop([
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 59 }),
        fc.gen(),
      ])("positive duration", (randomHours, randomMinutes, fcGen) => {
        const testStartDate: Date = fcGenValidJSDateObject(fcGen);
        const testEndDate: Date = pipe([
          addHours(randomHours),
          addMinutes(randomMinutes),
        ])(testStartDate);
        const actualDuration = dateDuration(testStartDate, testEndDate);
        const expectedDuration = `${randomHours.toString()}:${padCharsStart("0", 2, randomMinutes.toString())}`;
        expect(actualDuration).toBe(expectedDuration);
      });

      test.prop([
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 59 }),
        fc.gen(),
      ])("negative duration", (randomHours, randomMinutes, fcGen) => {
        const testEndDate: Date = fcGenValidJSDateObject(fcGen);
        const testStartDate: Date = pipe([
          addHours(randomHours),
          addMinutes(randomMinutes),
        ])(testEndDate);
        const actualDuration = dateDuration(testStartDate, testEndDate);
        const expectedDuration = `-${randomHours.toString()}:${padCharsStart("0", 2, randomMinutes.toString())}`;
        expect(actualDuration).toBe(expectedDuration);
      });
    });

    describe("getJSDateAsOrgTimestampString", () => {
      describe("withStartTime", () => {
        test.prop([fc.gen()])("active", (fcGen) => {
          const testDate = fcGenValidJSDateObject(fcGen, true);
          const expectedYear: string = testDate.getFullYear().toString();
          const expectedMonth: string = padCharsStart(
            "0",
            2,
            (testDate.getMonth() + 1).toString(),
          );
          const expectedDay: string = padCharsStart(
            "0",
            2,
            testDate.getDate().toString(),
          );
          const expectedDayName: string = convertDayNumberIntoDayName(
            testDate.getDay(),
          );
          const startHour: string = padCharsStart(
            "0",
            2,
            testDate.getHours().toString(),
          );
          const startMinute: string = padCharsStart(
            "0",
            2,
            testDate.getMinutes().toString(),
          );
          const expectedText: string = `<${expectedYear}-${expectedMonth}-${expectedDay} ${expectedDayName} ${startHour}:${startMinute}>`;
          const actualText = getJSDateAsOrgTimestampString(testDate, {
            isActive: true,
            withStartTime: true,
          });
          expect(actualText).toBe(expectedText);
        });

        test.prop([fc.gen()])("inactive", (fcGen) => {
          const testDate = fcGenValidJSDateObject(fcGen, true);
          const expectedYear: string = testDate.getFullYear().toString();
          const expectedMonth: string = padCharsStart(
            "0",
            2,
            (testDate.getMonth() + 1).toString(),
          );
          const expectedDay: string = padCharsStart(
            "0",
            2,
            testDate.getDate().toString(),
          );
          const expectedDayName: string = convertDayNumberIntoDayName(
            testDate.getDay(),
          );
          const startHour: string = padCharsStart(
            "0",
            2,
            testDate.getHours().toString(),
          );
          const startMinute: string = padCharsStart(
            "0",
            2,
            testDate.getMinutes().toString(),
          );
          const expectedText: string = `[${expectedYear}-${expectedMonth}-${expectedDay} ${expectedDayName} ${startHour}:${startMinute}]`;
          const actualText = getJSDateAsOrgTimestampString(testDate, {
            isActive: false,
            withStartTime: true,
          });
          expect(actualText).toBe(expectedText);
        });

        describe("withoutStartTime", () => {
          test.prop([fc.gen()])("active", (fcGen) => {
            const testDate = fcGenValidJSDateObject(fcGen, false);
            const expectedYear: string = testDate.getFullYear().toString();
            const expectedMonth: string = padCharsStart(
              "0",
              2,
              (testDate.getMonth() + 1).toString(),
            );
            const expectedDay: string = padCharsStart(
              "0",
              2,
              testDate.getDate().toString(),
            );
            const expectedDayName: string = convertDayNumberIntoDayName(
              testDate.getDay(),
            );
            const expectedText: string = `<${expectedYear}-${expectedMonth}-${expectedDay} ${expectedDayName}>`;
            const actualText = getJSDateAsOrgTimestampString(testDate, {
              isActive: true,
              withStartTime: false,
            });
            expect(actualText).toBe(expectedText);
          });

          test.prop([fc.gen()])("inactive", (fcGen) => {
            const testDate = fcGenValidJSDateObject(fcGen, false);
            const expectedYear: string = testDate.getFullYear().toString();
            const expectedMonth: string = padCharsStart(
              "0",
              2,
              (testDate.getMonth() + 1).toString(),
            );
            const expectedDay: string = padCharsStart(
              "0",
              2,
              testDate.getDate().toString(),
            );
            const expectedDayName: string = convertDayNumberIntoDayName(
              testDate.getDay(),
            );
            const expectedText: string = `[${expectedYear}-${expectedMonth}-${expectedDay} ${expectedDayName}]`;
            const actualText = getJSDateAsOrgTimestampString(testDate, {
              isActive: false,
              withStartTime: false,
            });
            expect(actualText).toBe(expectedText);
          });
        });
      });
    });

    describe("getCurrentJSDateAsOrgTimestampString", () => {
      describe("withStartTime", () => {
        test.prop([fc.gen()])("active", (_) => {
          const actualText = getCurrentJSDateAsOrgTimestampString({
            isActive: true,
            withStartTime: true,
          });
          expect(startsWith("<", actualText));
          expect(endsWith(">", actualText));
          // <2026-07-21 Tue 20:15> = min length = 22 characters
          assert.lengthOf(actualText, 22);
        });

        test.prop([fc.gen()])("inactive", (_) => {
          const actualText = getCurrentJSDateAsOrgTimestampString({
            isActive: false,
            withStartTime: true,
          });
          expect(startsWith("[", actualText));
          expect(endsWith("]", actualText));
          // [2026-07-21 Tue 20:15] = min length = 22 characters
          assert.lengthOf(actualText, 22);
        });

        describe("withoutStartTime", () => {
          test.prop([fc.gen()])("active", (_) => {
            const actualText = getCurrentJSDateAsOrgTimestampString({
              isActive: true,
              withStartTime: false,
            });
            expect(startsWith("<", actualText));
            expect(endsWith(">", actualText));
            // <2026-07-21 Tue> = min length = 18 characters
            assert.lengthOf(actualText, 16);
          });

          test.prop([fc.gen()])("inactive", (_) => {
            const actualText = getCurrentJSDateAsOrgTimestampString({
              isActive: false,
              withStartTime: false,
            });
            expect(startsWith("[", actualText));
            expect(endsWith("]", actualText));
            // [2026-07-21 Tue] = min length = 18 characters
            assert.lengthOf(actualText, 16);
          });
        });
      });
    });
  });

  describe("millisDuration tests", () => {
    test.prop([
      fc.integer({ min: 1, max: 10000 }),
      fc.integer({ min: 1, max: 59 }),
      fc.gen(),
    ])("defined", (randomHours, randomMinutes, fcGen) => {
      const expectedDuration: string = `${randomHours.toString()}:${padCharsStart("0", 2, randomMinutes.toString())}`;
      const testMillis: number =
        hoursToMilliseconds(randomHours) + minutesToMilliseconds(randomMinutes);
      const actualDuration: string = millisDuration(testMillis);
      expect(actualDuration).toBe(expectedDuration);
    });
    test.prop([fc.gen()])("undefined", () => {
      expect(millisDuration(undefined)).toBe("");
    });
  });

  describe("timestamp element", () => {
    test.prop([fc.boolean(), fc.boolean(), fc.gen()])(
      "timestampPartObjectForDate",
      (isActive, withStartTime, fcGen) => {
        const testDate: Date = fcGenValidJSDateObject(fcGen, withStartTime);
        const actualTimestamp = timestampPartObjectForDate(testDate, {
          isActive,
          withStartTime,
        });
        // skip year as it is simple
        expect(actualTimestamp).toMatchObject({
          isActive,
          withStartTime,
          month: padCharsStart("0", 2, (testDate.getMonth() + 1).toString()),
          day: padCharsStart("0", 2, testDate.getDate().toString()),
          dayName: convertDayNumberIntoDayName(testDate.getDay()),
          startHour: padCharsStart("0", 2, testDate.getHours().toString()),
          startMinute: padCharsStart("0", 2, testDate.getMinutes().toString()),
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
        });
      },
    );

    test.prop([fc.boolean(), fc.boolean()])(
      "getCurrentTimestamp",
      (isActive, withStartTime) => {
        const actualTimestamp = getCurrentTimestamp({
          isActive,
          withStartTime,
        });

        expect(actualTimestamp).toMatchObject({
          isActive,
          withStartTime,
          startHour: expect.any(String),
          startMinute: expect.any(String),
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
        });
      },
    );

    test.prop([fc.boolean(), fc.boolean(), fc.gen()])(
      "dateForTimestamp",
      (isActive, withStartTime, fcGen) => {
        const [testTimestamp, expectedDate] = fcGenOrgTimestampPartRecord(
          { isActive, withStartTime },
          fcGen,
        );
        const actualDate = dateForTimestamp(testTimestamp);
        expect(actualDate).toStrictEqual(expectedDate);
      },
    );

    describe("timestampDuration", () => {
      describe("positive duration", () => {
        test.prop([fc.boolean(), fc.integer({ min: 1, max: 10000 }), fc.gen()])(
          "withoutStartTime",
          (isActive, randomDays, fcGen) => {
            const testStartDate: Date = fcGenValidJSDateObject(fcGen, false);
            // no minutes since there is no start date
            const randomHours = HOURSINADAY * randomDays;
            const testEndDate: Date = pipe([addHours(randomHours)])(
              testStartDate,
            );

            const testStartTimestamp = timestampPartRecordForDate(
              { isActive, withStartTime: false },
              testStartDate,
            );
            const testEndTimestamp = timestampPartRecordForDate(
              { isActive, withStartTime: false },
              testEndDate,
            );

            const expectedDuration = `${randomHours.toString()}:00`;

            const actualDuration = timestampDuration(
              testStartTimestamp,
              testEndTimestamp,
            );
            expect(actualDuration).toBe(expectedDuration);
          },
        );

        test.prop([
          fc.boolean(),
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 0, max: 59 }),
          fc.gen(),
        ])("withStartTime", (isActive, randomHours, randomMinutes, fcGen) => {
          const testStartDate: Date = fcGenValidJSDateObject(fcGen, true);
          const testEndDate: Date = pipe([
            addHours(randomHours),
            addMinutes(randomMinutes),
          ])(testStartDate);
          const testStartTimestamp = timestampPartRecordForDate(
            { isActive, withStartTime: true },
            testStartDate,
          );
          const testEndTimestamp = timestampPartRecordForDate(
            { isActive, withStartTime: true },
            testEndDate,
          );

          const expectedDuration = `${randomHours.toString()}:${padCharsStart("0", 2, randomMinutes.toString())}`;

          const actualDuration = timestampDuration(
            testStartTimestamp,
            testEndTimestamp,
          );
          expect(actualDuration).toBe(expectedDuration);
        });
      });

      describe("negative duration", () => {
        test.prop([fc.boolean(), fc.integer({ min: 1, max: 10000 }), fc.gen()])(
          "withoutStartTime",
          (isActive, randomDays, fcGen) => {
            const testStartDate: Date = fcGenValidJSDateObject(fcGen, false);
            // no minutes since there is no start date
            const randomHours = HOURSINADAY * randomDays;
            const testEndDate: Date = pipe([addHours(randomHours)])(
              testStartDate,
            );

            const testEndTimestamp = timestampPartRecordForDate(
              { isActive, withStartTime: false },
              testEndDate,
            );
            const testStartTimestamp = timestampPartRecordForDate(
              { isActive, withStartTime: false },
              testStartDate,
            );

            const expectedDuration = `${randomHours.toString()}:00`;

            const actualDuration = timestampDuration(
              testStartTimestamp,
              testEndTimestamp,
            );
            expect(actualDuration).toBe(expectedDuration);
          },
        );

        test.prop([
          fc.boolean(),
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 0, max: 59 }),
          fc.gen(),
        ])("withStartTime", (isActive, randomHours, randomMinutes, fcGen) => {
          const testEndDate: Date = fcGenValidJSDateObject(fcGen, true);
          const testStartDate: Date = pipe([
            addHours(randomHours),
            addMinutes(randomMinutes),
          ])(testEndDate);
          const testEndTimestamp = timestampPartRecordForDate(
            { isActive, withStartTime: true },
            testEndDate,
          );
          const testStartTimestamp = timestampPartRecordForDate(
            { isActive, withStartTime: true },
            testStartDate,
          );

          const expectedDuration = `-${randomHours.toString()}:${padCharsStart("0", 2, randomMinutes.toString())}`;

          const actualDuration = timestampDuration(
            testStartTimestamp,
            testEndTimestamp,
          );
          expect(actualDuration).toBe(expectedDuration);
        });
      });
    });

    test.prop([fc.boolean(), fc.boolean(), fc.gen()])(
      "createNextRepeatTimestampPartRecord",
      (withStartTime, withDeadline, fcGen) => {
        const repeaterType: RepeaterType = fcGenRandomRepeaterType(fcGen);
        const [testPreviousTimestamp, _, repeaterUnit, repeaterValue] =
          fcGenOrgTimestampPartObjectWithRepeaterTypeX(
            { repeaterType, withStartTime, withDeadline },
            fcGen,
          );
        const testDate = fcGenValidJSDateObject(fcGen);
        const actualTimestampPartRecord = createNextRepeatTimestampPartRecord(
          testPreviousTimestamp,
          testDate,
        );
        expect(actualTimestampPartRecord.toJS()).toMatchObject({
          year: expect.any(String),
          month: expect.any(String),
          day: expect.any(String),
          dayName: expect.any(String),
          startHour: expect.any(String),
          startMinute: expect.any(String),
          repeaterUnit,
          repeaterType,
          repeaterValue,
        });
      },
    );

    describe("renderAsText", () => {
      const testRunner =
        (fcGen: fc.GeneratorValue) =>
        (timestampArgs: Record<string, boolean>) => {
          const [testTimestampPartObject, _, expectedText] =
            fcGenOrgTimestampPartRecord(timestampArgs, fcGen);
          const actualText: string = renderAsText(testTimestampPartObject);
          expect(actualText).toBe(expectedText);
        };
      test.prop([fc.gen()])("runner", (fcGen) => {
        forEach(testRunner(fcGen))(RENDERASTEXTESTCASES);
      });
    });

    describe("applyRepeater", () => {
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
          const actualTimestamp: MapOf<OrgTimestampPart> = applyRepeater(
            testTimestampPartRecord,
            testCurrentDate,
          );

          expect(actualTimestamp.toJS()).toStrictEqual(
            expectedNextRepeatTimestampPartObject,
          );
        };
      test.prop([fc.gen()])("runner", (fcGen) => {
        forEach(testRunner(fcGen))(APPLYREPEATERTESTCASES);
      });
    });
  });
});
