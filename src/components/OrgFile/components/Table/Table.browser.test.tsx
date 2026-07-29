import React from "react";
import { test, fc } from "@fast-check/vitest";
import { describe, expect, afterEach } from "vitest";
import thunk from "redux-thunk";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { trim } from "lodash/fp";
import { type RenderResult, cleanup } from 'vitest-browser-react'
import type { UserEvent } from "vitest/browser"
import type { MapOf } from "immutable"
import type { OrgTable, OrgTableRow, OrgTableCell } from "../../../../types";
import { randomArrayIndex, threeRandomArrayIndices } from "../../../../../test_helpers/TestDataGenerators";
import multipleTables from "../../../../../test_helpers/fixtures/multiple_tables.org?raw";
import { TESTBASESTATE, TESTFILEPATH } from "../../../../../test_helpers/Constants";
import { setup } from "../../../../../test_helpers/index";
import rootReducer from "../../../../reducers/";
import {
  setPath,
  parseFile,
  selectHeader,
  selectHeaderIndex,
  setSelectedDescriptionItemIndex,
  setSelectedTableId,
  enterEditMode,
} from "../../../../actions/org";
import { getCurrentJSDateAsOrgTimestampString } from "../../../../lib/timestamps";
import {
  getSelectedTable,
  getTableTotalColumnsCount,
  getTableTotalRowsCount
} from "../../../../lib/org_utils";
import Table from "./index";


const EDITCELLCONTAINERID = "edit-cell-container";

const testTableRenderer = async(): Promise<[{user: UserEvent, screen: RenderResult}, MapOf<OrgTable>, any, [string, string, string]]> => {
  const testHeaderIndex = 2;
  const testDescriptionItemIndex = 1;


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

  const [
    testFirstRandomColumnIndex,
    testSecondRandomColumnIndex,
    testThirdRandomColumnIndex,
  ] = threeRandomArrayIndices(testTableTotalColumns);

  const testFirstCell = testTableContents.getIn([
    testRandomRowIndex,
    "contents",
    testFirstRandomColumnIndex,
  ]);
  const testSecondCell = testTableContents.getIn([
    testRandomRowIndex,
    "contents",
    testSecondRandomColumnIndex,
  ]);
  const testThirdCell = testTableContents.getIn([
    testRandomRowIndex,
    "contents",
    testThirdRandomColumnIndex,
  ]);

  const testTextOfFirstCell = trim(testFirstCell.get("rawContents"));
  const testTextOfSecondCell = trim(testSecondCell.get("rawContents"));
  const testTextOfThirdCell = trim(testThirdCell.get("rawContents"));

  const testProps = {
    filePath: TESTFILEPATH,
    table: testTable,
    headerIndex: testHeaderIndex,
    descriptionItemIndex: testDescriptionItemIndex,
  };

  const setupObj = await setup(
      <MemoryRouter
        keyLength={0}
        initialEntries={["/file/dir1/dir2/fixtureTestFile.org"]}
      >
        <Provider store={testStore}>
          <Table props={testProps} />
        </Provider>
      </MemoryRouter>,
  );

  return [setupObj, testTable, testStore, [testTextOfFirstCell, testTextOfSecondCell, testTextOfThirdCell]]

}



describe("Table tests", async() => {
  afterEach(cleanup)

  test("Render table", async() => {
    const [{screen}, testTable] = await testTableRenderer()
    testTable.get("contents").forEach((row: MapOf<OrgTableRow>) => {
      row.get("contents").forEach((cell: MapOf<OrgTableCell>) => {
        const expectedText = trim(cell.get("rawContents"));
        expect(screen.getByText(expectedText)).toBeTruthy();
      });
    });
  });

  test("Render table cells, change text, then click on another cell", async() => {

    const [{user, screen}, _, testStore, [testTextOfFirstCell, testTextOfSecondCell, testTextOfThirdCell]] = await testTableRenderer()

    await user.click(screen.getByText(testTextOfFirstCell))

    await user.click(screen.getByText(testTextOfSecondCell))
    testStore.dispatch(enterEditMode("table"));

    const newValue: string = "new";
    await user.click(screen.getByTestId(EDITCELLCONTAINERID))
    await user.type(screen.getByTestId(EDITCELLCONTAINERID), (newValue))

    expect(screen.getByText(newValue)).toBeTruthy();

    await user.click(screen.getByText(testTextOfThirdCell))
    expect(screen.getByText(testTextOfFirstCell)).toBeTruthy();


  });

  test("Render table cells, add timestamp, then click on another cell", async() => {
    const [{user, screen}, _, __, [testTextOfFirstCell, testTextOfSecondCell, testTextOfThirdCell]] = await testTableRenderer()
    await user.click(screen.getByText(testTextOfFirstCell))
    await user.dblClick(screen.getByText(testTextOfSecondCell))
    await user.click(screen.getByTestId(EDITCELLCONTAINERID))

    const expectedTimestamp = getCurrentJSDateAsOrgTimestampString();
    await user.click(screen.getByText(testTextOfThirdCell))

    // timestamp will be placed in a seperate AttributedString Element
    expect(screen.getByText(expectedTimestamp)).toBeTruthy();
    expect(screen.getByText(testTextOfSecondCell)).toBeTruthy();

    expect(screen.getByText(testTextOfFirstCell)).toBeTruthy();


  });
});
