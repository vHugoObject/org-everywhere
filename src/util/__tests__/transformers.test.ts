import { pipe, over, identity, partial, uniq } from "lodash/fp";
import { test, fc } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import {
  fcRandomUpperAlphaChar,
  fcRandomLowerAlphaChar,
  fcRandomStringGenerator,
  fcRandomArrayChunkOfRandomSize,
  fcRandomItemFromArray,
} from "../../../test_helpers/TestDataGenerators";
import { isUpperAlphaCharacter, reduceReplaceAll } from "../transformers";

describe("transformers test suite", () => {
  describe("isUpperAlphaCharacter", () => {
    test.prop([fc.gen()])("true", (fcGen) => {
      const char = fcRandomUpperAlphaChar(fcGen);
      expect(isUpperAlphaCharacter(char)).toBeTruthy();
    });

    test.prop([fc.gen()])("false - lowercase", (fcGen) => {
      const char = fcRandomLowerAlphaChar(fcGen);
      expect(isUpperAlphaCharacter(char)).toBeFalsy();
    });

    test.prop([fc.nat({ max: 9 })])("false - not a letter", (testNum) => {
      const char = testNum.toString();
      expect(isUpperAlphaCharacter(char)).toBeFalsy();
    });
  });

  describe("reduceReplaceAll", () => {
    test.prop([fc.gen()])("true", (fcGen) => {
      const testStr: string = fcRandomStringGenerator(fcGen);
      const [testValuesToReplace, randomValueToReplace] = pipe([
        fcRandomArrayChunkOfRandomSize,
        uniq,
        over([identity, fcRandomItemFromArray(fcGen)]),
      ])(fcGen, testStr);

      const actualResult = reduceReplaceAll(testValuesToReplace, testStr);
      expect(actualResult).not.toContain(randomValueToReplace);
    });
  });
});
