import { test, fc } from "@fast-check/vitest";
import { describe, expect, assert } from "vitest";
import { over } from "lodash/fp";
import type {ColorObject} from 'color';
import { fastCheck2RandomRGBAs, fastCheckRandomFloatBetweenZeroAndOne, fastCheckRandomRGBA } from "../../../test_helpers/testdatagenerators"
import {
  createColorObject,
  convertRGBAIntoCSS,
  interpolateColors,
  interpolateColorsAndReturnCSS
} from "../color"

describe("color unit tests", () => {

    test.prop([fc.gen()])(
    "createColorObject",
      (fcGen) => {
	const {r: testR, g: testG, b: testB, alpha: testAlpha} = fastCheckRandomRGBA(fcGen)
	const actualColorObject = createColorObject(testR, testG, testB, testAlpha)

	expect(actualColorObject).toEqual({r: expect.betweenZeroAnd255(), g: expect.betweenZeroAnd255(), b: expect.betweenZeroAnd255(), alpha: expect.betweenZeroAndOne()})
    },
    );

  test.prop([fc.gen()])(
    "convertRGBAIntoCSS",
      (fcGen) => {
	const {r: testR, g: testG, b: testB, alpha: testAlpha} = fastCheckRandomRGBA(fcGen)
	const actualCSS = convertRGBAIntoCSS([testR, testG, testB, testAlpha])

	expect(actualCSS.startsWith("rgba")).toBeTruthy()
    },
  );
  
  test.prop([fc.gen()])(
    "interpolateColors",
    (fcGen) => {
      const [[testColorA, testColorB], testInterpolationFactor] = over<Array<ColorObject>|number>([fastCheck2RandomRGBAs, fastCheckRandomFloatBetweenZeroAndOne])(fcGen) as [[ColorObject, ColorObject], number]
      const actualColorObject: ColorObject = interpolateColors(testColorA, testColorB, testInterpolationFactor)
      
      expect(actualColorObject).toEqual({r: expect.betweenZeroAnd255(), g: expect.betweenZeroAnd255(), b: expect.betweenZeroAnd255(), alpha: expect.betweenZeroAndOne()})
      
    },
  );

  test.prop([fc.gen()])(
    "interpolateColorsAndReturnCSS",
    (fcGen) => {
      const [[testColorA, testColorB], testInterpolationFactor] = over<Array<ColorObject>|number>([fastCheck2RandomRGBAs, fastCheckRandomFloatBetweenZeroAndOne])(fcGen) as [[ColorObject, ColorObject], number]
      const actualCSS: string = interpolateColorsAndReturnCSS(testColorA, testColorB, testInterpolationFactor)
      assert.isString(actualCSS)
    },
  );

});
