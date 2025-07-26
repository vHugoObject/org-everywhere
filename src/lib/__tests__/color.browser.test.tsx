// @vitest-environment jsdom
import React from "react";
import { test, fc } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { pipe } from "lodash/fp";
import { themes } from "../constants"
import { loadTheme, getThemeFromThemeObject } from "../color"
import { setup  } from "../../../test_helpers/index"
import { fastCheckRandomObjectKeyValuePair } from "../../../test_helpers/testdatagenerators"

describe("color test suite", async () => {
  const testThemes: Array<string> = Object.keys(themes)
  const testColorSchemes: Array<string> = ["Light", "Dark"]

  test("Test loadTheme", async () => {
    await fc.assert(
      fc.asyncProperty(
	fc.gen(),
	fc.constantFrom(...testThemes),
	fc.constantFrom(...testColorSchemes),
	async(fcGen, testTheme, testColorScheme) => {
	
	  const [testThemePropertyName, expectedThemePropertyValue]: [string, string] = pipe([getThemeFromThemeObject, fastCheckRandomObjectKeyValuePair(fcGen)])(testTheme, testColorScheme)

	  //await setup(<div></div>)
	  //loadTheme(testTheme, testColorScheme)

	  //const actualValue: string = document.documentElement.style.getPropertyValue(testThemePropertyName)
	  
	  //console.log(actualValue)
	  //expect(actualValue).toBe(expectedThemePropertyValue)
	
	})
      .beforeEach(async () => {
	  cleanup();
	}),
      {numRuns: 50}
    )
  })  
});
