import {
  pipe,
  over,
  identity,
  uniq,
  zipAll,
  map,
  constant
} from "lodash/fp";
import { test, fc } from "@fast-check/vitest";
import { describe, expect, assert } from "vitest";
import { get } from "immutable";
import {
  fcGenRandomUpperAlphaChar,
  fcGenRandomLowerAlphaChar,
  fcGenRandomStringGenerator,
  fcGenRandomArrayChunkOfRandomSize,
  fcGenRandomItemFromArray,
  fcShuffledArray,
  fcGenRandomImmutableMap,
  fcGenRandomListOfObjectKeys,
  fcGenRandomListOfObjectKeyValuePairs,
} from "../../../test_helpers/TestDataGenerators";
import {
  convertArraysToSetsAndAssertStrictEqual,
} from "../../../test_helpers/Asserters";
import {
  isUpperAlphaCharacter,
  reduceReplaceAll,
  getAll,
  setAll,
  updateAllIn,
  convertToArray
} from "../transformers";

describe("transformers test suite", () => {
  describe("Strings", () => {
    describe("isUpperAlphaCharacter", () => {
      test.prop([fc.gen()])("true", (fcGen) => {
        const char = fcGenRandomUpperAlphaChar(fcGen);
        expect(isUpperAlphaCharacter(char)).toBeTruthy();
      });

      test.prop([fc.gen()])("false - lowercase", (fcGen) => {
        const char = fcGenRandomLowerAlphaChar(fcGen);
        expect(isUpperAlphaCharacter(char)).toBeFalsy();
      });

      test.prop([fc.nat({ max: 9 })])("false - not a letter", (testNum) => {
        const char = testNum.toString();
        expect(isUpperAlphaCharacter(char)).toBeFalsy();
      });
    });

    describe("reduceReplaceAll", () => {
      test.prop([fc.gen()])("true", (fcGen) => {
        const testStr: string = fcGenRandomStringGenerator(fcGen);
        const [testValuesToReplace, randomValueToReplace] = pipe([
          fcGenRandomArrayChunkOfRandomSize,
          uniq,
          over([identity, fcGenRandomItemFromArray(fcGen)]),
        ])(fcGen, testStr);

        const actualResult = reduceReplaceAll(testValuesToReplace, testStr);
        expect(actualResult).not.toContain(randomValueToReplace);
      });
    });
  });

  // describe("Arrays", () => {
  // })

  describe("for immutable", () => {
    test.prop([fc.gen()])("getAll", (fcGen) => {
      const [testMap, testObj] = fcGenRandomImmutableMap(fcGen);
      const [testKeyValuePairs, expectedValues] = pipe([
        fcGenRandomListOfObjectKeyValuePairs,
        zipAll,
      ])(fcGen, testObj);

      const actualValues = getAll(testKeyValuePairs, testMap);
      convertArraysToSetsAndAssertStrictEqual([actualValues, expectedValues]);
    });

    test.prop([fc.gen()])("setAll", (fcGen) => {
      const [testMap, testObj] = fcGenRandomImmutableMap(fcGen);
      const testSetters = pipe([
        fcGenRandomListOfObjectKeys,
        over([identity, fcShuffledArray(fcGen)]),
        zipAll,
      ])(fcGen, testObj);
      const actualUpdatedMap = setAll(testSetters, testMap);
      const [randomKey, expectedValue] = fcGenRandomItemFromArray(
        fcGen,
        testSetters,
      );
      expect(get(actualUpdatedMap, randomKey)).toBe(expectedValue);
    });

    describe("updateAllIn", () => {
      test.prop([fc.gen()])("single key", (fcGen) => {
	const [testMap, testObj] = fcGenRandomImmutableMap(fcGen);
	const testUpdaters = pipe([
          fcGenRandomListOfObjectKeys,
          over([identity, pipe([fcShuffledArray(fcGen), map(constant)])]),
          zipAll,
	])(fcGen, testObj);
	const actualUpdatedMap = updateAllIn(testUpdaters, testMap);

	const [randomKey, expectedValueFunc] = fcGenRandomItemFromArray(
          fcGen,
          testUpdaters,
	);
	expect(get(actualUpdatedMap, randomKey)).toBe(expectedValueFunc());
      });

      test.prop([fc.gen()])("array of keys", (fcGen) => {
	const [testMap, testObj] = fcGenRandomImmutableMap(fcGen);
	const testUpdaters = pipe([
          fcGenRandomListOfObjectKeys,
          over([map(convertToArray), pipe([fcShuffledArray(fcGen), map(constant)])]),
          zipAll,
	])(fcGen, testObj);
	const actualUpdatedMap = updateAllIn(testUpdaters, testMap);

	const [randomKey, expectedValueFunc] = fcGenRandomItemFromArray(
          fcGen,
          testUpdaters,
	);

	expect(get(actualUpdatedMap, randomKey[0])).toBe(expectedValueFunc());
      });
    });
  });
});
