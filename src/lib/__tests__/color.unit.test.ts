import { test, fc } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { over } from "lodash/fp";
import type {ColorObject} from 'color';
import { fastCheck2RandomRGBAs, fastCheckRandomFloatBetweenZeroAndOne } from "../../../test_helpers/testdatagenerators"
import { interpolateColors } from "../color"

describe("color unit tests", () => {
  
  test.prop([fc.gen()])(
    "interpolateColors",
    (fcGen) => {
      const [[testColorA, testColorB], testInterpolationFactor] = over<Array<ColorObject>|number>([fastCheck2RandomRGBAs, fastCheckRandomFloatBetweenZeroAndOne])(fcGen) as [[ColorObject, ColorObject], number]
      const actualRGBA: ColorObject = interpolateColors(testColorA, testColorB, testInterpolationFactor)

      
      expect(actualRGBA).toEqual({r: expect.betweenZeroAnd255(), g: expect.betweenZeroAnd255(), b: expect.betweenZeroAnd255(), a: expect.betweenZeroAndOne()})
      
    },
  );

});
