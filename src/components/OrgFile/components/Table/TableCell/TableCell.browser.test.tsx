import React from "react";
import thunk from "redux-thunk";
import { describe, expect, afterEach } from "vitest";
import { type RenderResult, cleanup } from 'vitest-browser-react'
import type { UserEvent } from "vitest/browser"
import { test } from "@fast-check/vitest";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { trim, property, pipe } from "lodash/fp";
import type { MapOf } from "immutable"
import type { OrgTableCell, State } from "../../../../../types";
import multipleTables from "../../../../../../test_helpers/fixtures/multiple_tables.org?raw";
import { setup } from "../../../../../../test_helpers/index";
import { TESTBASESTATE, TESTFILEPATH } from "../../../../../../test_helpers/Constants";
import { randomArrayIndex, threeRandomArrayIndices } from "../../../../../../test_helpers/TestDataGenerators";
import rootReducer from "../../../../../reducers/";
import {
  setPath,
  parseFile,
  selectHeader,
  selectHeaderIndex,
  setSelectedDescriptionItemIndex,
  setSelectedTableId,
} from "../../../../../actions/org";
import {
  getSelectedTable,
  getTableTotalColumnsCount,
  getTableTotalRowsCount
} from "../../../../../lib/org_utils";
import TableCell from "./index";

const testCellRenderer = async(): Promise<[{user: UserEvent, screen: RenderResult},
string,
any,
[MapOf<OrgTableCell>, MapOf<OrgTableCell>, MapOf<OrgTableCell>],
[string, string, string]]> => {
  const testHeaderIndex: number = 2;
  const testDescriptionItemIndex: number = 1;

  const testStore = createStore(rootReducer, TESTBASESTATE, applyMiddleware(thunk));

  testStore.dispatch(parseFile(TESTFILEPATH, multipleTables));
  testStore.dispatch(setPath(TESTFILEPATH));

  const testState: State = testStore.getState();
  const testHeaderId: number = testState.org.present.getIn([
    "files",
    TESTFILEPATH,
    "headers",
    testHeaderIndex,
    "id",
  ]);
  const testTableId: number = testState.org.present.getIn([
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
  const testTableRowContents = testTableContents.get(testRandomRowIndex);
  const testListOfTableCellArguments = testTableRowContents
    .get("contents")
    .map((testCell, index) => {
    return {
      filePath: TESTFILEPATH,
      headerIndex: testHeaderIndex,
      descriptionItemIndex: testDescriptionItemIndex,
      cellId: testCell.get("id"),
      row: testRandomRowIndex,
      column: index,
    };
  });

  const [testFirstRandomColumnIndex, testSecondRandomColumnIndex,
    testThirdRandomColumnIndex] =
    threeRandomArrayIndices(testTableTotalColumns);

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

  const setupObj = await setup(
    <MemoryRouter
      keyLength={0}
      initialEntries={["/file/dir1/dir2/fixtureTestFile.org"]}
    >
      <Provider store={testStore}>
        <table>
          <tbody>
            <tr>
              {testListOfTableCellArguments.map(
                (testArgumentsObject, index) => (
                  <TableCell key={index} props={testArgumentsObject} />
                ),
              )}
            </tr>
          </tbody>
        </table>
      </Provider>
    </MemoryRouter>,
  );
  return [setupObj, TESTFILEPATH, testStore, [testFirstCell, testSecondCell, testTextOfThirdCell], [testTextOfFirstCell, testTextOfSecondCell, testTextOfThirdCell]]
};



describe("TableCell tests", async() => {
  afterEach(cleanup);

  test("Render table cell then select two cells", async() => {

    const [{user, screen}, TESTFILEPATH, testStore, [testFirstCell, testSecondCell],[testTextOfFirstCell, testTextOfSecondCell]] = await testCellRenderer()

    const actualFirstCell = screen.getByText(testTextOfFirstCell)
    await user.click(actualFirstCell);


    expect(
      screen.container.querySelector(".table-part__cell.table-part__cell--selected"),
    ).toBeTruthy();
    const actualTextOfFirstCell = trim(
      screen.container.querySelector(".table-part__cell.table-part__cell--selected")
        ?.textContent ?? ""
    );

    expect(actualTextOfFirstCell).toBe(testTextOfFirstCell);


    const expectedFirstSelectedTableCellId = testFirstCell.get("id");
    const actualFirstSelectedTableCellId = testStore
      .getState()
      .org.present.getIn(["files", TESTFILEPATH, "selectedTableCellId"]);

    expect(actualFirstSelectedTableCellId).toBe(
      expectedFirstSelectedTableCellId,
    );

    const actualEditModeAfterOneClick =
      testStore
        .getState()
        .org.present.getIn(["files", TESTFILEPATH, "editMode"])

    expect(actualEditModeAfterOneClick).toBeFalsy();


    await user.click(screen.getByText(testTextOfSecondCell));

    expect(
      screen.container.querySelector(".table-part__cell.table-part__cell--selected"),
    ).toBeTruthy();
    const actualTextOfSecondCell = trim(
      screen.container.querySelector(".table-part__cell.table-part__cell--selected")
        ?.textContent ?? ""
    )


    expect(actualTextOfSecondCell).toBe(testTextOfSecondCell);

    const expectedSecondSelectedTableCellId = testSecondCell.get("id");
    const actualSecondSelectedTableCellId = testStore
      .getState()
      .org.present.getIn(["files", TESTFILEPATH, "selectedTableCellId"]);

    expect(actualSecondSelectedTableCellId).toBe(
      expectedSecondSelectedTableCellId,
    );

    const actualEditModeAfterTwoClicks =
      testStore
        .getState()
        .org.present.getIn(["files", TESTFILEPATH, "editMode"])

    expect(actualEditModeAfterTwoClicks).toBeFalsy();

  });

  test("Double clicking on a cell opens editMode", async() => {

    const [{user, screen}, TESTFILEPATH, testStore, ___,[testTextOfFirstCell, testTextOfSecondCell]] = await testCellRenderer()

    const actualFirstCell = screen.getByText(testTextOfFirstCell)
    await user.dblClick(actualFirstCell);
    expect(screen.getByText("Insert timestamp").element()).toBeTruthy()


    const actualTextOfFirstCellEditContainer = trim(screen.getByTestId("edit-cell-container").element().textContent)

    expect(actualTextOfFirstCellEditContainer).toBe(testTextOfFirstCell)

    const actualEditModeAfterOneClick =
      testStore
        .getState()
        .org.present.getIn(["files", TESTFILEPATH, "editMode"])

    expect(actualEditModeAfterOneClick).toBe("table");


    const actualSecondCell = screen.getByText(testTextOfSecondCell)
    await user.click(actualSecondCell);
    expect(screen.getByText("Insert timestamp").element()).toBeTruthy()

    const actualTextOfSecondCellEditContainer = trim(screen.getByTestId("edit-cell-container").element().textContent)

    expect(actualTextOfSecondCellEditContainer).toBe(testTextOfSecondCell)

    const actualEditModeAfterTwoClicks =
      testStore
        .getState()
        .org.present.getIn(["files", TESTFILEPATH, "editMode"])

    expect(actualEditModeAfterTwoClicks).toBe("table");

  });
});
