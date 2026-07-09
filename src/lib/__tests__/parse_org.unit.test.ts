/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectNewSetFromLine", "expectType"] }] */
import { describe, expect } from "vitest";
import { test, fc } from "@fast-check/vitest";
import readFixture from "../../../test_helpers/index";
import {
  fcRandomStringGenerator,
  fcNLengthUniqueStringArrayGenerator,
  fcGenerateOrgHeadingAsString,
  fcRandomInBufferSetting,
  fcRandomAlphaString,
  fcGenerateRandomOrgHeadingAsString,
} from "../../../test_helpers/TestDataGenerators";
import { createHeadingStars } from "../org_utils";
import {
  parseOrg,
  parseTodoKeywordConfig,
  parseRawText,
  _parsePlanningItems,
  _parseLogNotes,
  parseMarkupAndCookies,
  computeNestingLevel,
} from "../parse_org";

const expectType = (result) => expect(result.map((x) => x.type));
const parseFirstHeaderFromOrg = (x) => parseOrg(x).toJS().headers[0];

function testTimestamp(actual, expected) {
  if (expected == null) expect(actual).toBeNull();
  else {
    // Every key in expected should be present in actual and the values should match
    Object.keys(expected).forEach((key) =>
      expect(actual[key]).toEqual(expected[key]),
    );
    // Keys in actual that are not in expected must map to undefined
    Object.keys(actual).forEach(
      (key) =>
        Object.prototype.hasOwnProperty.call(expected, key) ||
        expect(actual[key]).toBeUndefined(),
    );
  }
}
function testTimestampText(
  text,
  expectedFirstTimestamp,
  expectedSecondTimestamp,
) {
  // eslint-disable-next-line jest/expect-expect
  test(`Parse ${text}`, () => {
    const [{ firstTimestamp, secondTimestamp }] = parseRawText(text).toJS();
    testTimestamp(firstTimestamp, expectedFirstTimestamp);
    testTimestamp(secondTimestamp, expectedSecondTimestamp);
  });
}

describe("Test the parser", () => {
  describe("computeNestingLevel", () => {
    test.prop([fc.integer({ min: 1, max: 15 }), fc.gen()])(
      "test with normal headline",
      (expectedNestingLevel, fcGen) => {
        const [testHeadline] = fcGenerateOrgHeadingAsString(
          expectedNestingLevel,
          fcGen,
        );
        expect(computeNestingLevel(testHeadline)).toEqual(expectedNestingLevel);
      },
    );

    test.prop([fc.integer({ min: 1, max: 15 })])(
      "test with stars only",
      (expectedNestingLevel) => {
        const testHeadline = createHeadingStars(expectedNestingLevel);
        expect(computeNestingLevel(testHeadline)).toEqual(expectedNestingLevel);
      },
    );
  });

  describe("Parsing inline-markup", () => {
    test.prop([fc.gen()])(
      "Parses inline-markup where closing delim is followed by ;",
      (fcGen) => {
        const testString: string = fcRandomAlphaString(fcGen);
        const testMarkup = ` *${testString}*;`;
        const result = parseMarkupAndCookies(testMarkup);
        expectType(result).toEqual(["text", "inline-markup", "text"]);
      },
    );
  });

  describe("Parse an header with empty description", () => {
    test.prop([fc.gen()])(
      "Parse headline without trailing newline",
      (fcGen) => {
        const testString: string = fcRandomStringGenerator(fcGen);
        const testHeadline: string = `* ${testString}`;
        const result = parseFirstHeaderFromOrg(testHeadline);
        expect(result.description).toEqual([]);
        expect(result.rawDescription).toEqual("");
      },
    );
    test.prop([fc.gen()])(
      "Parse headline with trailing newline but no description",
      (fcGen) => {
        const testHeadline: string = `${fcGenerateRandomOrgHeadingAsString(fcGen)}\n`;
        const result = parseFirstHeaderFromOrg(testHeadline);
        expect(result.description).toEqual([]);
        expect(result.rawDescription).toEqual("");
      },
    );
    test.prop([fc.gen()])(
      "Parse headline with an empty line of description",
      (fcGen) => {
        const testHeadline: string = `${fcGenerateRandomOrgHeadingAsString(fcGen)}\n\n`;
        const result = parseFirstHeaderFromOrg(testHeadline);
        expect(result.description.length).toEqual(1);
        expect(result.rawDescription).toEqual("\n");
      },
    );
    test.prop([fc.gen()])(
      "Parse headline directly followed by next headline",
      (fcGen) => {
        const [testHeadlineOne, testHeadlineTwo]: Array<string> =
          fcNLengthUniqueStringArrayGenerator(fcGen, 2);
        const testHeadlines: string = `* ${testHeadlineOne}\n* ${testHeadlineTwo} 2`;
        const result = parseFirstHeaderFromOrg(testHeadlines);
        expect(result.description).toEqual([]);
        expect(result.rawDescription).toEqual("");
      },
    );
  });

  describe("Test parsing of log notes", () => {
    test("Parses notes when followed by logbook", () => {
      const result = _parseLogNotes("- a note\n  two lines\n:LOGBOOK:\n...");
      expect(result.rawLogNotes).toEqual("- a note\n  two lines");
      expect(result.strippedDescription).toEqual(":LOGBOOK:\n...");
    });
    test("Does not parse notes when no logbook exists (they will go into description)", () => {
      const text = "- a note\n  two lines\n\nrest";
      const result = _parseLogNotes(text);
      expect(result.rawLogNotes).toEqual("");
      expect(result.strippedDescription).toEqual(text);
    });
  });

  describe("Parse raw text", () => {
    test("Parses empty string", () => {
      expect(parseRawText("").toJS()).toEqual([]);
    });

    test.prop([fc.gen()])("Parses simple line", (fcGen) => {
      const testString: string = fcRandomAlphaString(fcGen);
      expect(parseRawText(testString).toJS()).toEqual([
        { type: "text", contents: testString },
      ]);
    });
  });

  describe("Parse in-buffer TODO keyword settings", () => {
    test.prop([fc.gen(), fc.integer({ min: 1, max: 15 })])(
      "Normal headline",
      (fcGen, testStarCount) => {
        const [testHeadline] = fcGenerateOrgHeadingAsString(
          testStarCount,
          fcGen,
        );
        const result = parseTodoKeywordConfig(testHeadline);
        expect(result).toBeNull();
      },
    );

    test.prop([fc.gen()])("Normal text line", (fcGen) => {
      const testString = fcRandomStringGenerator(fcGen);
      const result = parseTodoKeywordConfig(testString);
      expect(result).toBeNull();
    });

    test.prop([fc.gen()])("Other InBuffer Settings", (fcGen) => {
      const testInBufferSetting: string = fcRandomInBufferSetting(fcGen);
      const result = parseTodoKeywordConfig(
        `#+STARTUP: ${testInBufferSetting}`,
      );
      expect(result).toBeNull();
    });
  });

  // Transition to fast-check later
  describe("Parse headline with planning items and active timestamps", () => {
    test("Planning items should contain active timestamps from title and description as well", () => {
      const testOrgFile = readFixture("schedule_and_timestamps");
      const parsedFile = parseOrg(testOrgFile);
      const headers = parsedFile.get("headers").toJS();
      const header = headers[0];
      expect(header.planningItems.length).toEqual(3);
    });

    describe("Parse various timestamps", () => {
      testTimestampText("<2021-05-16>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
      });
      testTimestampText("[2021-05-16]", {
        isActive: false,
        year: "2021",
        month: "05",
        day: "16",
      });
      testTimestampText("<2021-05-16 Sun>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
      });
      testTimestampText("<2021-05-16 Sun 12:45>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
        startHour: "12",
        startMinute: "45",
      });
      testTimestampText("<2021-05-16 Sun 12:45-13:15>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
        startHour: "12",
        startMinute: "45",
        endHour: "13",
        endMinute: "15",
      });
      testTimestampText("<2021-05-16 Sun +1w>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
        repeaterType: "+",
        repeaterValue: "1",
        repeaterUnit: "w",
      });
      testTimestampText("<2021-05-16 Sun .+1w>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
        repeaterType: ".+",
        repeaterValue: "1",
        repeaterUnit: "w",
      });
      testTimestampText("<2021-05-16 Sun .+2d/4d>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
        repeaterType: ".+",
        repeaterValue: "2",
        repeaterUnit: "d",
        repeaterDeadlineValue: "4",
        repeaterDeadlineUnit: "d",
      });
      testTimestampText("<2021-05-16 Sun .+1w -2d>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
        repeaterType: ".+",
        repeaterValue: "1",
        repeaterUnit: "w",
        delayType: "-",
        delayValue: "2",
        delayUnit: "d",
      });
      testTimestampText("<2021-05-16 Sun -2d .+1w>", {
        isActive: true,
        year: "2021",
        month: "05",
        day: "16",
        dayName: "Sun",
        repeaterType: ".+",
        repeaterValue: "1",
        repeaterUnit: "w",
        delayType: "-",
        delayValue: "2",
        delayUnit: "d",
      });
      testTimestampText(
        "<2021-05-16>--<2021-05-23>",
        { isActive: true, year: "2021", month: "05", day: "16" },
        { isActive: true, year: "2021", month: "05", day: "23" },
      );
    });
  });

  ["#+TODO", "#+TYP_TODO"].forEach((t) => {
    describe(t, () => {
      const expectNewSetFromLine = (line: string) => {
        const result = parseTodoKeywordConfig(line);
        const expectedNewSet = {
          completedKeywords: ["FINISHED"],
          configLine: line,
          default: false,
          keywords: ["START", "INPROGRESS", "STALLED", "FINISHED"],
        };
        expect(result.toJS()).toEqual(expectedNewSet);
      };

      test("no parentheses", () => {
        const line = `${t}: START INPROGRESS STALLED | FINISHED`;
        expectNewSetFromLine(line);
      });

      test("some (x) keyboard shortcuts", () => {
        const line = `${t}: START INPROGRESS(i) STALLED(.) | FINISHED(f)`;
        expectNewSetFromLine(line);
      });

      test("recording timestamp / note on entry", () => {
        const line = `${t}: START INPROGRESS(!) STALLED | FINISHED(@)`;
        expectNewSetFromLine(line);
      });

      test("shortcut plus recording timestamp / note on entry", () => {
        const line = `${t}: START(s) INPROGRESS(i!) STALLED(.) | FINISHED(f@)`;
        expectNewSetFromLine(line);
      });

      test("recording timestamp / note on exit", () => {
        const line = `${t}: START(s) INPROGRESS(/!) STALLED | FINISHED(/@)`;
        expectNewSetFromLine(line);
      });

      test("shortcut plus recording timestamp / note on exit", () => {
        const line = `${t}: START(s) INPROGRESS(i/!) STALLED(.) | FINISHED(f/@)`;
        expectNewSetFromLine(line);
      });

      test("recording timestamp / note on entry and exit", () => {
        const line = `${t}: START(s) INPROGRESS(/!) STALLED | FINISHED(/@)`;
        expectNewSetFromLine(line);
      });

      test("shortcut plus recording timestamp / note on entry and exit", () => {
        const line = `${t}: START(s@/@) INPROGRESS(i!/!) STALLED(.@/!) | FINISHED(f!/@)`;
        expectNewSetFromLine(line);
      });
    });
  });

  test("TODO keywords at EOF parsed correctly", () => {
    const testOrgFile = readFixture("todo_keywords_interspersed");
    const parsedFile = parseOrg(testOrgFile);
    const headers = parsedFile.get("headers").toJS();
    expect(headers.length).toEqual(15);
    expect(headers[7].titleLine.rawTitle).toEqual(
      "orgmode settings in middle of file",
    );
    expect(headers[14].titleLine.rawTitle).toEqual(
      "orgmode settings at end of file",
    );
    const todoKeywordSets = parsedFile.get("todoKeywordSets").toJS();
    expect(todoKeywordSets.length).toEqual(3);
    expect(todoKeywordSets[0].keywords).toEqual(["NEXT", "DONE"]);
    expect(todoKeywordSets[0].completedKeywords).toEqual(["DONE"]);
    expect(todoKeywordSets[1].keywords).toEqual(["START", "FINISHED"]);
    expect(todoKeywordSets[1].completedKeywords).toEqual(["FINISHED"]);
    expect(todoKeywordSets[2].keywords).toEqual(["PROJECT", "PROJDONE"]);
    expect(todoKeywordSets[2].completedKeywords).toEqual(["PROJDONE"]);
  });
});
