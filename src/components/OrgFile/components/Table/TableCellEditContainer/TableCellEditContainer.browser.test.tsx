import React from "react";
import thunk from "redux-thunk";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { trim } from "lodash/fp";
import { describe, expect, afterEach, test, assert } from "vitest";
import { type RenderResult, cleanup } from "vitest-browser-react";
import type { UserEvent } from "vitest/browser";
import type { MapOf } from "immutable";
import type { OrgTableCell } from "../../../../../types";
import { randomArrayIndex } from "../../../../../../test_helpers/TestDataGenerators";
import rootReducer from "../../../../../reducers/";
import { getCurrentJSDateAsOrgTimestampString } from "../../../../../lib/timestamps";
import {
  setPath,
  parseFile,
  setSelectedTableCellId,
  enterEditMode,
  setSelectedTableId,
  selectHeader,
  selectHeaderIndex,
  setSelectedDescriptionItemIndex,
} from "../../../../../actions/org";
import {
  getSelectedTable,
  getTableTotalColumnsCount,
  getTableTotalRowsCount,
} from "../../../../../lib/org_utils";
import multipleTables from "../../../../../../test_helpers/fixtures/multiple_tables.org?raw";
import { setup, sleep } from "../../../../../../test_helpers/index";
import {
  TESTBASESTATE,
  TESTFILEPATH,
} from "../../../../../../test_helpers/Constants";
import TableCellEditContainer from "./index";

const EDITCELLCONTAINERID = "edit-cell-container";

const testSetupFunction = (): [
  (
    testText: string,
    testId: number,
  ) => Promise<{ user: UserEvent; screen: RenderResult }>,
  any,
  MapOf<OrgTableCell>,
  MapOf<OrgTableCell>,
  [number, number, number, number],
] => {
  const testHeaderIndex: number = 0;
  const testDescriptionItemIndex: number = 0;

  const testStore = createStore(
    rootReducer,
    TESTBASESTATE,
    applyMiddleware(thunk),
  );

  testStore.dispatch(parseFile(TESTFILEPATH, multipleTables));
  testStore.dispatch(setPath(TESTFILEPATH));
  testStore.dispatch(enterEditMode("table"));

  const testState = testStore.getState();
  const testHeaderId = testState.org.present.getIn([
    "files",
    TESTFILEPATH,
    "headers",
    testHeaderIndex,
    "id",
  ]);
  const testTableId = testState.org.present.getIn([
    "files",
    TESTFILEPATH,
    "headers",
    testHeaderIndex,
    "description",
    testDescriptionItemIndex,
    "id",
  ]);

  testStore.dispatch(setSelectedTableId(testTableId));
  testStore.dispatch(selectHeader(testHeaderId));
  testStore.dispatch(selectHeaderIndex(testHeaderIndex));
  testStore.dispatch(setSelectedDescriptionItemIndex(testDescriptionItemIndex));

  const testTable = getSelectedTable(testStore.getState());
  const testTableContents = testTable.get("contents");
  const testTableTotalRows = getTableTotalRowsCount(testTable);
  const testTableTotalColumns = getTableTotalColumnsCount(testTable);

  const testIndexOfEmptyRow = testTableTotalRows - 1;
  const testRandomIndexOfRowWithText = randomArrayIndex(testIndexOfEmptyRow);
  const testRandomColumnIndex = randomArrayIndex(testTableTotalColumns);

  const testEmptyCell = testTableContents.getIn([
    testIndexOfEmptyRow,
    "contents",
    testRandomColumnIndex,
  ]);

  const testCellWithText = testTableContents.getIn([
    testRandomIndexOfRowWithText,
    "contents",
    testRandomColumnIndex,
  ]);

  const cellEditContainerRenderer =
    (testStore) =>
    async (
      testText: string,
      testId: number,
    ): Promise<{ user: UserEvent; screen: RenderResult }> => {
      return await setup(
        <MemoryRouter
          keyLength={0}
          initialEntries={["/file/dir1/dir2/fixtureTestFile.org"]}
        >
          <Provider store={testStore}>
            <TableCellEditContainer
              filePath={TESTFILEPATH}
              cellValue={testText}
              cellId={testId}
            />
          </Provider>
        </MemoryRouter>,
      );
    };

  return [
    cellEditContainerRenderer(testStore),
    testStore,
    testEmptyCell,
    testCellWithText,
    [
      testHeaderIndex,
      testDescriptionItemIndex,
      testRandomIndexOfRowWithText,
      testRandomColumnIndex,
    ],
  ];
};

describe("TableCellEditContainer tests", async () => {
  afterEach(cleanup);

  test("Enter text into empty cell", async () => {
    const [testCellEditContainerRenderer, testStore, testEmptyCell] =
      testSetupFunction();
    const testCellId = testEmptyCell.get("id");
    const testCellText = testEmptyCell.get("rawContents");

    testStore.dispatch(setSelectedTableCellId(testCellId));

    const { user, screen } = await testCellEditContainerRenderer(
      testCellText,
      testCellId,
    );
    expect(screen.getByTestId(EDITCELLCONTAINERID)).toBeTruthy();
    const newValue = "200";
    await user.type(screen.getByTestId(EDITCELLCONTAINERID), newValue);
    expect(screen.getByText(newValue)).toBeTruthy();
  });

  test("Enter text into a full cell", async () => {
    const [testCellEditContainerRenderer, testStore, , testCellWithText] =
      testSetupFunction();
    const testCellId = testCellWithText.get("id");
    const testCellText = testCellWithText.get("rawContents");
    testStore.dispatch(setSelectedTableCellId(testCellId));

    const { user, screen } = await testCellEditContainerRenderer(
      testCellText,
      testCellId,
    );

    expect(screen.getByText(trim(testCellText))).toBeTruthy();
    const newValue = "Motz";
    await user.type(screen.getByTestId(EDITCELLCONTAINERID), newValue);
    expect(screen.getByText(newValue)).toBeTruthy();
  });

  test("Insert timestamp into a empty cell", async () => {
    const [testCellEditContainerRenderer, testStore, testEmptyCell] =
      testSetupFunction();
    const testCellId = testEmptyCell.get("id");
    const testCellText = testEmptyCell.get("rawContents");
    testStore.dispatch(setSelectedTableCellId(testCellId));

    const { user, screen } = await testCellEditContainerRenderer(
      testCellText,
      testCellId,
    );
    expect(screen.getByTestId(EDITCELLCONTAINERID)).toBeTruthy();
    const expectedTimestamp = getCurrentJSDateAsOrgTimestampString();
    await user.click(screen.getByTestId("edit-cell-container"));
    expect(screen.getByText(expectedTimestamp)).toBeTruthy();
  });

  test("Insert timestamp into a full cell", async () => {
    const [testCellEditContainerRenderer, testStore, , testCellWithText] =
      testSetupFunction();
    const testCellId = testCellWithText.get("id");
    const testCellText = testCellWithText.get("rawContents");
    testStore.dispatch(setSelectedTableCellId(testCellId));

    const { user, screen } = await testCellEditContainerRenderer(
      testCellText,
      testCellId,
    );

    expect(screen.getByTestId(EDITCELLCONTAINERID)).toBeTruthy();
    const expectedTimestamp = getCurrentJSDateAsOrgTimestampString();
    const expectedValue = `${expectedTimestamp}${testCellText}`;
    await user.click(screen.getByTestId("edit-cell-container"));
    expect(screen.getByText(expectedValue)).toBeTruthy();
  });

  test("Confirm cell edit is dispatched when cell is no longer selected", async () => {
    const [
      testCellEditContainerRenderer,
      testStore,
      _,
      testCellWithText,
      [
        testHeaderIndex,
        testDescriptionItemIndex,
        testRandomIndexOfRowWithText,
        testRandomColumnIndex,
      ],
    ] = testSetupFunction();
    const testCellId = testCellWithText.get("id");
    const testCellText = testCellWithText.get("rawContents");
    testStore.dispatch(setSelectedTableCellId(testCellId));

    const { user, screen } = await testCellEditContainerRenderer(
      testCellText,
      testCellId,
    );
    const newValue = "Seymour";

    await user.type(screen.getByTestId(EDITCELLCONTAINERID), newValue);
    testStore.dispatch(setSelectedTableCellId(null));
    await sleep(0);

    const actualUpdatedCellValue = testStore
      .getState()
      .org.present.getIn([
        "files",
        TESTFILEPATH,
        "headers",
        testHeaderIndex,
        "description",
        testDescriptionItemIndex,
        "contents",
        testRandomIndexOfRowWithText,
        "contents",
        testRandomColumnIndex,
        "rawContents",
      ]);

    assert.include(actualUpdatedCellValue, newValue);
  });
});
