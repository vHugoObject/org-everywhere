import { test, fc } from "@fast-check/vitest";
import { describe, expect, assert } from "vitest";
import { convertCharacterIntoCharacterCode } from "../../src/util/transformers";
import {
  assertIntegerInRangeInclusive,
  convertArraysToSetsAndAssertStrictEqual,
  convertArraysToSetsAndAssertIsSubset,
} from "../Asserters";
import {
  fcRandomIntegerInRange,
  fcGenerateValidJSDateObjectString,
  fcGenerateValidJSDateObject,
  fcRandomCharacterGenerator,
  fcShuffledSubarray,
  fcShuffledArray,
  fcNLengthUniqueStringArrayGenerator
} from "../TestDataGenerators.ts";

describe("TestDataGenerators suite", () => {
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
    ])("fcRandomCharacterGenerator", (testUTFRange, fcGen) => {
      const actualCharacter: string = fcRandomCharacterGenerator(
        testUTFRange,
        fcGen,
      );
      const actualCharacterCode: number =
        convertCharacterIntoCharacterCode(actualCharacter);
      assertIntegerInRangeInclusive(testUTFRange, actualCharacterCode);
    });
  });

  describe("Date generators", () => {
    test.prop([fc.gen()])("fcGenerateValidJSDateObject", (fcGen) => {
      const actualDateString: Date = fcGenerateValidJSDateObject(fcGen);
      assert.instanceOf(actualDateString, Date);
      assert.isNumber(actualDateString.getFullYear());
    });

    test.prop([fc.gen()])("fcGenerateValidJSDateObjectString", (fcGen) => {
      const actualDateString: string = fcGenerateValidJSDateObjectString(fcGen);
      // Jun 09 2025 = min length
      expect(actualDateString.length).toBeGreaterThan(11);
    });
  });

  describe("Array generators suite", () => {
    test.prop([fc.array(fc.string(), { minLength: 1 }), fc.gen()])(
      "fcShuffledSubarray",
      (testArray, fcGen) => {
	const testLength = fcRandomIntegerInRange(fcGen, [1, testArray.length])
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
        const actualStringArray: Array<string> = fcNLengthUniqueStringArrayGenerator(
          fcGen,
          testStringLength,
        );
        expect(actualStringArray.length).toEqual(testStringLength);
      },
    );
  });
});
