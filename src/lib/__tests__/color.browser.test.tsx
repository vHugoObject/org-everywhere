// @vitest-environment jsdom
import React from "react";
import { test, fc } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { pipe } from "lodash/fp";
import { themes } from "../constants"
import { loadTheme, getThemeFromThemeObject } from "../color"
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

	  render(<div></div>)
	  loadTheme(testTheme, testColorScheme)

	  const actualThemePropertyValue: string = document.documentElement.style.getPropertyValue(testThemePropertyName)
	  console.log(actualThemePropertyValue, expectedThemePropertyValue)
	  expect(actualThemePropertyValue).toBe(expectedThemePropertyValue)
	
	})
      .afterEach(() => {
	cleanup();
      })
    )
  })  
});
