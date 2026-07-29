import React from "react";
import thunk from "redux-thunk";
import { describe, expect, afterEach } from "vitest";
import { test } from "@fast-check/vitest";
import { add } from "lodash/fp";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { type RenderResult, cleanup } from 'vitest-browser-react'
import type { UserEvent } from "vitest/browser"
import { type MapOf, List } from "immutable"
import { clampAddFromZero, clampSubtractFromZero } from "../../../../../../util/transformers";
import type { OrgTable, OrgTableRow, OrgTableCell } from "../../../../../../types";
import {
  randomArrayIndex,
} from "../../../../../../../test_helpers/TestDataGenerators";
import multipleTables from "../../../../../../../test_helpers/fixtures/multiple_tables.org?raw";
import {
  TESTBASESTATE,
  TESTFILEPATH
} from "../../../../../../../test_helpers/Constants";
import { setup } from "../../../../../../../test_helpers/index";
import HeaderBar from "../../../../../HeaderBar";
import rootReducer from "../../../../../../reducers/";
import {
  setPath,
  parseFile,
  selectHeader,
  selectHeaderIndex,
  setSelectedDescriptionItemIndex,
  setSelectedTableId,
  setSelectedTableCellId,
} from "../../../../../../actions/org";
import {
  getSelectedTable,
  getTableTotalColumnsCount,
  getContentsOfTableColumn,
  getContentsOfTableRow,
  getTableTotalRowsCount
} from "../../../../../../lib/org_utils";
import TableActionButtons from "./index";

const addOne = add(1);
const minusOne = add(-1);
const testTableActionsRenderer = async(): Promise<[{user: UserEvent, screen: RenderResult}, any, [number, number], [number, number]]> => {
  const testHeaderIndex = 5;
  const testDescriptionItemIndex = 2;


  const testStore = createStore(rootReducer, TESTBASESTATE, applyMiddleware(thunk));

  testStore.dispatch(parseFile(TESTFILEPATH, multipleTables));
  testStore.dispatch(setPath(TESTFILEPATH));

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
  testStore.dispatch(
    setSelectedDescriptionItemIndex(testDescriptionItemIndex),
  );

  const testTable = getSelectedTable(testStore.getState());

  const testTableContents = testTable.get("contents");
  const testTableTotalRows = getTableTotalRowsCount(testTable);
  const testTableTotalColumns = getTableTotalColumnsCount(testTable);

  const testRandomRowIndex = randomArrayIndex(testTableTotalRows);

  const testRandomColumnIndex = randomArrayIndex(testTableTotalColumns);
  const testCell = testTableContents.getIn([
    testRandomRowIndex,
    "contents",
    testRandomColumnIndex,
  ]);

  testStore.dispatch(setSelectedTableCellId(testCell.get("id")));

  const testSetupObj = await setup(
    <MemoryRouter
      keyLength={0}
      initialEntries={["/file/dir1/dir2/fixtureTestFile.org"]}
    >
      <Provider store={testStore}>
        <HeaderBar />
        <TableActionButtons filePath={TESTFILEPATH} />
      </Provider>
    </MemoryRouter>,
  );

  return [
    testSetupObj,
    testStore,
    [
      testTableTotalRows,
      testTableTotalColumns
    ],
    [
      testRandomRowIndex,
      testRandomColumnIndex
    ],
  ];
}

describe("TableCell tests", async() => {
  afterEach(cleanup);

  test("Test edit-cell-button", async() => {
    const [{screen, user}, testStore] = await testTableActionsRenderer();
    await user.click(screen.getByTestId("edit-cell-button"));

    const actualEditModeAfterOneClick =
      testStore
        .getState()
        .org.present.getIn(["files", TESTFILEPATH, "editMode"])

    expect(actualEditModeAfterOneClick).toBe("table");

    await user.click(screen.getByTestId("edit-cell-button"));

    const actualEditModeAfterTwoClicks =
      testStore
        .getState()
        .org.present.getIn(["files", TESTFILEPATH, "editMode"])

    expect(actualEditModeAfterTwoClicks).toBe(null);

  });

  describe("Column Tests", async() => {
    test("Test add-column-button", async() => {
      const [{screen, user}, testStore, [,testTableTotalColumns]] = await testTableActionsRenderer();
      await user.click(screen.getByTestId("add-column-button"));
      const actualTable = getSelectedTable(testStore.getState());
      const actualColumnsCount = getTableTotalColumnsCount(actualTable);
      expect(actualColumnsCount).toEqual(addOne(testTableTotalColumns));
    });

    test("Test delete-column-button", async() => {
      const [{screen, user}, testStore, [,testTableTotalColumns]] = await testTableActionsRenderer();
      await user.click(screen.getByTestId("delete-column-button"));
      const actualTable = getSelectedTable(testStore.getState());
      const actualColumnsCount = getTableTotalColumnsCount(actualTable);
      expect(actualColumnsCount).toEqual(minusOne(testTableTotalColumns));
    });
  });

  describe("Row Tests", async() => {
    test("Test add-row-button", async() => {
      const [{screen, user}, testStore, [testTableTotalRows]] = await testTableActionsRenderer();
      await user.click(screen.getByTestId("add-row-button"));
      const actualTable = getSelectedTable(testStore.getState());
      const actualRowsCount = getTableTotalRowsCount(actualTable);
      expect(actualRowsCount).toEqual(addOne(testTableTotalRows));
    });

    test("Test delete-row-button", async() => {
      const [{screen, user}, testStore, [testTableTotalRows]] = await testTableActionsRenderer();
      await user.click(screen.getByTestId("delete-row-button"));
      const actualTable = getSelectedTable(testStore.getState());
      const actualRowsCount = getTableTotalRowsCount(actualTable);
      expect(actualRowsCount).toEqual(minusOne(testTableTotalRows));
    });
  });
  describe("Movement Tests", async() => {
    test("Test up-button", async() => {
      const [{screen, user}, testStore, [testTableTotalRows], [testRandomRowIndex]] = await testTableActionsRenderer();

      const actualTableBeforeMove: MapOf<OrgTable> = getSelectedTable(testStore.getState());
      const actualRowBeforeMove: List<MapOf<OrgTableCell>> = getContentsOfTableRow(testRandomRowIndex, actualTableBeforeMove,)
      const expectedRowIndexAfterMove: number = clampSubtractFromZero(testTableTotalRows, testRandomRowIndex, 1)
      await user.click(screen.getByTestId("up-button"));

      const actualTable = getSelectedTable(testStore.getState());
      const actualRowAfterMove: List<MapOf<OrgTableCell>> = getContentsOfTableRow(
	expectedRowIndexAfterMove,
        actualTable,
      );

      expect(actualRowAfterMove.equals(actualRowBeforeMove)).toBeTruthy();
    });

    test("Test left-button", async() => {
      const [{screen, user}, testStore, [,testTableTotalColumns], [,testRandomColumnIndex]] = await testTableActionsRenderer();

      const actualTableBeforeMove = getSelectedTable(testStore.getState());
      const actualColumnBeforeMove = getContentsOfTableColumn(testRandomColumnIndex, actualTableBeforeMove)

      const expectedColumnIndexAfterMove = clampSubtractFromZero(testTableTotalColumns, testRandomColumnIndex, 1)

      await user.click(screen.getByTestId("left-button"));

      const actualTable = getSelectedTable(testStore.getState());
      const actualColumnAfterMove = getContentsOfTableColumn(
        expectedColumnIndexAfterMove,
        actualTable,
      );

      expect(actualColumnAfterMove.equals(actualColumnBeforeMove)).toBeTruthy();
    });

    test("Test right-button", async() => {

      const [{screen, user}, testStore, [,testTableTotalColumns], [,testRandomColumnIndex]] = await testTableActionsRenderer();

      const actualTableBeforeMove = getSelectedTable(testStore.getState());
      const actualColumnBeforeMove = getContentsOfTableColumn(testRandomColumnIndex, actualTableBeforeMove)

      const expectedColumnIndexAfterMove = clampAddFromZero(testTableTotalColumns, testRandomColumnIndex, 1)

      await user.click(screen.getByTestId("right-button"));

      const actualTable = getSelectedTable(testStore.getState());
      const actualColumnAfterMove = getContentsOfTableColumn(
        expectedColumnIndexAfterMove,
        actualTable,
      );

      expect(actualColumnAfterMove.equals(actualColumnBeforeMove)).toBeTruthy();

    });

    test("Test down-button", async() => {

      const [{screen, user}, testStore, [testTableTotalRows], [testRandomRowIndex]] = await testTableActionsRenderer();

      const actualTableBeforeMove = getSelectedTable(testStore.getState());
      const actualRowBeforeMove = getContentsOfTableRow(testRandomRowIndex, actualTableBeforeMove)

      const expectedRowIndexAfterMove = clampAddFromZero(testTableTotalRows, testRandomRowIndex, 1)

      await user.click(screen.getByTestId("down-button"));

      const actualTable = getSelectedTable(testStore.getState());
      const actualRowAfterMove = getContentsOfTableRow(
        expectedRowIndexAfterMove,
        actualTable,
      );

      expect(actualRowAfterMove.equals(actualRowBeforeMove)).toBeTruthy();
    });
  });
});
