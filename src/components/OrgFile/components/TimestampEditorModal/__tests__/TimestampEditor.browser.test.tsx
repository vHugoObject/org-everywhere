import React from "react";
import { describe, expect, afterEach, test, vi, type Mock } from "vitest";
import { type RenderResult, cleanup } from "vitest-browser-react";
import type { UserEvent } from "vitest/browser";
import thunk from "redux-thunk";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { pipe, curry, over, stubTrue } from "lodash/fp";
import { type MapOf, Map, getIn, get } from "immutable";
import {
  TESTBASESTATE,
  TESTFILEPATH,
} from "../../../../../../test_helpers/Constants";
import {
  setup,
  sleep,
} from "../../../../../../test_helpers/BrowserTestingHelpers";
import {
  randomHourPart,
  randomMinutePart,
} from "../../../../../../test_helpers/TestDataGenerators";
import rootReducer from "../../../../../reducers/";
import { parseFile, setPath } from "../../../../../actions/org";
import {
  getCurrentTimestamp,
  renderAsText,
  getHourPartFromDate,
  getMinutePartFromDate,
} from "../../../../../lib/timestamps";
import { getAll } from "../../../../../util/transformers";
import TimestampEditor from "../TimestampEditor";
import type { OrgTimestampPart } from "../../../../../types";

const ACTIVESWITCH = "active-switch";
const ADDTIME = "add-time";
const REMOVETIME = "remove-time";
const CHANGETIME = "change-time";

const createFileWithHeadlineAndTimestampInDescription = (timestampArgs: {
  isActive: boolean;
  withStartTime: boolean;
}): [string, MapOf<OrgTimestampPart>, string, string] => {
  const testTimestamp = Map(getCurrentTimestamp(timestampArgs));
  const testTimestampAsText = renderAsText(testTimestamp);
  const headline: string = `* TODO Plain\n${testTimestampAsText}\n`;
  return [headline, testTimestamp, testTimestampAsText, "description"];
};

const testRenderer = async (
  onChangeFunc: (actualTimestampPart: MapOf<OrgTimestampPart>) => boolean,
  onCloseFunc: (actualTimestampPart: MapOf<OrgTimestampPart>) => boolean,
  timestampArgs: { isActive: boolean; withStartTime: boolean },
): Promise<
  [
    { user: UserEvent; screen: RenderResult },
    MapOf<OrgTimestampPart>,
    string,
    Mock<(arg: MapOf<OrgTimestampPart>) => boolean>,
    Mock<(arg: MapOf<OrgTimestampPart>) => boolean>,
  ]
> => {
  const testStore = createStore(
    rootReducer,
    TESTBASESTATE,
    applyMiddleware(thunk),
  );

  const [testFileContents, testTimestamp, testTimestampAsText, key] =
    createFileWithHeadlineAndTimestampInDescription(timestampArgs);
  testStore.dispatch(parseFile(TESTFILEPATH, testFileContents));
  testStore.dispatch(setPath(TESTFILEPATH));

  const testState = testStore.getState();

  const testHeader = getIn(testState, [
    "org",
    "present",
    "files",
    "org-everywhere_internal_fixtureTestFile.org",
    "headers",
    0,
  ]);

  const timestampLocation = get(testHeader, key);
  const timestamp = get(timestampLocation, "0");
  const onClose = vi.fn(onCloseFunc);
  const onChange = vi.fn(onChangeFunc);

  const testProps = {
    headerId: get(testHeader, "id"),
    timestamp: get(timestamp, "firstTimestamp"),
    timestampId: get(timestamp, "id"),
    planningItemIndex: 0,
    onClose,
    onChange,
  };
  const setupObj = await setup(
    <MemoryRouter
      keyLength={0}
      initialEntries={["/file/dir1/dir2/fixtureTestFile.org"]}
    >
      <Provider store={testStore}>
        <TimestampEditor {...testProps} />
      </Provider>
    </MemoryRouter>,
  );

  return [setupObj, testTimestamp, testTimestampAsText, onChange, onClose];
};

afterEach(cleanup);
describe("TimestampEditor suite", async () => {
  describe("test toggle active", async () => {
    // change, just return the value
    const assertExpectedTimestampAfterActiveToggle =
      (expected: boolean) =>
      (timestampPart: MapOf<OrgTimestampPart>): boolean => {
        return get(timestampPart, "isActive") === expected;
      };
    test("active -> inactive, withStartTime", async () => {
      const [{ user, screen }, _, testTimestampAsText, onChange] =
        await testRenderer(
          assertExpectedTimestampAfterActiveToggle(false),
          stubTrue,
          { isActive: true, withStartTime: true },
        );
      expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
      await user.click(screen.getByTestId(ACTIVESWITCH));
      expect(onChange).toHaveReturnedWith(true);
    });

    test("inactive -> active, withStartTime", async () => {
      const [{ user, screen }, _, testTimestampAsText, onChange] =
        await testRenderer(
          assertExpectedTimestampAfterActiveToggle(true),
          stubTrue,
          { isActive: false, withStartTime: true },
        );
      expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
      await user.click(screen.getByTestId(ACTIVESWITCH));
      expect(onChange).toHaveReturnedWith(true);
    });

    test("active -> inactive, withoutStartTime", async () => {
      const [{ user, screen }, _, testTimestampAsText, onChange] =
        await testRenderer(
          assertExpectedTimestampAfterActiveToggle(false),
          stubTrue,
          { isActive: true, withStartTime: false },
        );
      expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
      await user.click(screen.getByTestId(ACTIVESWITCH));
      expect(onChange).toHaveReturnedWith(true);
    });

    test("inactive -> active, withoutStartTime", async () => {
      const [{ user, screen }, _, testTimestampAsText, onChange] =
        await testRenderer(
          assertExpectedTimestampAfterActiveToggle(true),
          stubTrue,
          { isActive: false, withStartTime: false },
        );
      expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
      await user.click(screen.getByTestId(ACTIVESWITCH));
      expect(onChange).toHaveReturnedWith(true);
    });
  });

  describe("start time changes", async () => {
    const assertExpectedTimestampAfterStartTimeAdded = (
      timestamp: MapOf<OrgTimestampPart>,
    ): boolean => {
      const [newHour, newMinute] = over([
        getHourPartFromDate,
        getMinutePartFromDate,
      ])(new Date());
      const [withStartTime, startHour, startMinute] = getAll(
        ["withStartTime", "startHour", "startMinute"],
        timestamp,
      );
      console.log(withStartTime, startHour, startMinute, newHour, newMinute);
      return (
        withStartTime === true &&
        startHour === newHour &&
        startMinute === newMinute
      );
    };

    const assertExpectedTimestampAfterStartTimeRemoved = (
      timestamp: MapOf<OrgTimestampPart>,
    ): boolean => {
      const newHour = "00";
      const newMinute = "00";
      const [withStartTime, startHour, startMinute] = getAll(
        ["withStartTime", "startHour", "startMinute"],
        timestamp,
      );
      return (
        withStartTime === true &&
        startHour === newHour &&
        startMinute === newMinute
      );
    };

    const assertExpectedTimestampAfterStartTimeChange =
      ([newHour, newMinute]: [string, string]) =>
      (timestamp: MapOf<OrgTimestampPart>): boolean => {
        const [withStartTime, startHour, startMinute] = getAll(
          ["withStartTime", "startHour", "startMinute"],
          timestamp,
        );
        return (
          withStartTime === true &&
          startHour === newHour &&
          startMinute === newMinute
        );
      };

    describe("add start time", async () => {
      test("active", async () => {
        const [{ user, screen }, _, testTimestampAsText, onChange] =
          await testRenderer(
            assertExpectedTimestampAfterStartTimeAdded,
            stubTrue,
            { isActive: true, withStartTime: false },
          );
        expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
        await user.click(screen.getByTestId(ADDTIME));
        expect(onChange).toHaveReturnedWith(true);
      });

      test.skip("inactive", async () => {
        const [{ user, screen }, _, testTimestampAsText, onChange] =
          await testRenderer(
            assertExpectedTimestampAfterStartTimeAdded,
            stubTrue,
            { isActive: false, withStartTime: false },
          );
        expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
        await user.click(screen.getByTestId(ADDTIME));
        expect(onChange).toHaveReturnedWith(true);
      });
    });

    describe("remove start time", async () => {
      test.skip("active", async () => {
        const [{ user, screen }, _, testTimestampAsText, onChange] =
          await testRenderer(
            assertExpectedTimestampAfterStartTimeRemoved,
            stubTrue,
            { isActive: true, withStartTime: true },
          );
        expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
        await user.click(screen.getByTestId(REMOVETIME));
        expect(onChange).toHaveReturnedWith(true);
      });

      test.skip("inactive", async () => {
        const [{ user, screen }, _, testTimestampAsText, onChange] =
          await testRenderer(
            assertExpectedTimestampAfterStartTimeRemoved,
            stubTrue,
            { isActive: false, withStartTime: true },
          );
        expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
        await user.click(screen.getByTestId(REMOVETIME));
        expect(onChange).toHaveReturnedWith(true);
      });
    });

    describe("change start time", async () => {
      test.skip("active", async () => {
        const testNewHour = randomHourPart();
        const testNewMinute = randomMinutePart();
        const [{ user, screen }, _, testTimestampAsText, onChange] =
          await testRenderer(
            assertExpectedTimestampAfterStartTimeChange([
              testNewHour,
              testNewMinute,
            ]),
            stubTrue,
            { isActive: true, withStartTime: true },
          );
        expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
        await user.click(screen.getByTestId(CHANGETIME));
        expect(onChange).toHaveReturnedWith(true);
      });

      test.skip("inactive", async () => {
        const testNewHour = randomHourPart();
        const testNewMinute = randomMinutePart();
        const [{ user, screen }, _, testTimestampAsText, onChange] =
          await testRenderer(
            assertExpectedTimestampAfterStartTimeChange([
              testNewHour,
              testNewMinute,
            ]),
            stubTrue,
            { isActive: false, withStartTime: true },
          );
        expect(screen.getByText(testTimestampAsText).query()).toBeTruthy();
        await user.click(screen.getByTestId(CHANGETIME));
        expect(onChange).toHaveReturnedWith(true);
      });
    });
  });
});
