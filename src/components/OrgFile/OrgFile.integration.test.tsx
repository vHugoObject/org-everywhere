import React from "react";
import { afterEach, beforeEach, describe, test, expect, vi } from "vitest";
import thunk from "redux-thunk";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import { format } from "date-fns/fp";
import OrgFile from "./";
import HeaderBar from "../HeaderBar";
import readFixture from "../../../test_helpers/NodeTestingHelpers";
import rootReducer from "../../reducers/";
import { setPath, parseFile } from "../../actions/org";
import { setShouldLogIntoDrawer } from "../../actions/base";
import { getCurrentJSDateAsOrgTimestampString } from "../../lib/timestamps";
import { convertToSet } from "../../util/transformers";
import { Map, Set, fromJS, List } from "immutable";
import { formatDistanceToNow } from "date-fns";
import { property, pipe, map, over, curry, times } from "lodash/fp";
import {
  render,
  fireEvent,
  cleanup,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STATIC_FILE_PREFIX } from "../../lib/org_utils";

afterEach(cleanup);

const testSetup = () => {
  const testOrgFile = readFixture("main_test_file");

  let store = createStore(
    rootReducer,
    {
      org: {
        past: [],
        present: Map({
          files: Map(),
          fileSettings: [],
          search: Map({
            searchFilter: "",
            searchFilterExpr: [],
          }),
          bookmarks: Map({
            search: List(),
            "task-list": List(),
            refile: List(),
          }),
        }),
        future: [],
      },
      syncBackend: Map({
        isAuthenticated: true,
      }),
      capture: Map({ captureTemplates: [] }),
      base: fromJS({
        customKeybindings: {},
        shouldTapTodoToAdvance: true,
        isLoading: Set(),
        finderTab: "Search",
        agendaTimeframe: "Week",
        preferEditRawValues: false,
      }),
    },
    applyMiddleware(thunk),
  );

  store.dispatch(
    parseFile(STATIC_FILE_PREFIX + "fixtureTestFile.org", testOrgFile),
  );

  store.dispatch(setPath(STATIC_FILE_PREFIX + "fixtureTestFile.org"));

  return render(
    <MemoryRouter
      keyLength={0}
      initialEntries={["/file/dir1/dir2/fixtureTestFile.org"]}
    >
      <Provider store={store}>
        <HeaderBar />
        <OrgFile path={STATIC_FILE_PREFIX + "fixtureTestFile.org"} />
      </Provider>
    </MemoryRouter>,
  );
};

describe("Render all views", async () => {
  const testOrgFile = readFixture("main_test_file");

  let store;

  beforeEach(() => {
    // Set global variable which can also be read from application code
    window.testRunner = true;

    let capture = Map();
    capture = capture.set("captureTemplates", []);
    store = createStore(
      rootReducer,
      {
        org: {
          past: [],
          present: Map({
            files: Map(),
            fileSettings: [],
            search: Map({
              searchFilter: "",
              searchFilterExpr: [],
            }),
            bookmarks: Map({
              search: List(),
              "task-list": List(),
              refile: List(),
            }),
          }),
          future: [],
        },
        syncBackend: Map({
          isAuthenticated: true,
        }),
        capture,
        base: new fromJS({
          customKeybindings: {},
          shouldTapTodoToAdvance: true,
          isLoading: Set(),
          finderTab: "Search",
          agendaTimeframe: "Week",
          preferEditRawValues: false,
        }),
      },
      applyMiddleware(thunk),
    );
    store.dispatch(
      parseFile(STATIC_FILE_PREFIX + "fixtureTestFile.org", testOrgFile),
    );
    store.dispatch(setPath(STATIC_FILE_PREFIX + "fixtureTestFile.org"));
  });

  describe("Org Functionality", async () => {
    let container;

    beforeEach(() => {
      let res = render(
        <MemoryRouter
          keyLength={0}
          initialEntries={["/file/dir1/dir2/fixtureTestFile.org"]}
        >
          <Provider store={store}>
            <HeaderBar />
            <OrgFile path={STATIC_FILE_PREFIX + "fixtureTestFile.org"} />
          </Provider>
        </MemoryRouter>,
      );

      container = res.container;
    });

    describe("Works with Org files without headlines", async () => {
      test("Works with a completely empty files", async () => {
        store.dispatch(
          parseFile(
            STATIC_FILE_PREFIX + "fixtureTestFile.org",
            readFixture("empty_file"),
          ),
        );
        expect(screen.queryByText("This file has no headlines")).toBeTruthy();
        expect(
          screen.queryAllByText("Yes, your file has content.").length,
        ).toEqual(0);
        // Sanity check, ensure that not the regular test file is loaded.
        expect(screen.queryByText("Top level header")).toBeFalsy();
      });
    });

    describe("Actions within an Org file", async () => {
      test("Can select a header in an org file", async () => {
        expect(
          container.querySelector("[data-testid='org-clock-in']"),
        ).toBeFalsy();

        fireEvent.click(screen.getByText("Top level header"));

        expect(
          container.querySelector("[data-testid='org-clock-in']"),
        ).toBeTruthy();
      });

      // Org Mode has keywords as workflow states and can cycle through
      // them: https://orgmode.org/manual/Workflow-states.html
      // In org-everywhere, we can cycle through them by swiping or by clicking
      // (if enabled). This test checks for the latter.
      test("Can advance todo state for selected header in an org file", async () => {
        // In the very beginning, the TODO is hidden, because the file
        // starts folded down to the top level
        expect(screen.queryByText("TODO")).toBeFalsy();

        // Cycle the top header (which will make the next headers
        // [including the TODO] visible
        fireEvent.click(screen.queryByText("Top level header"));

        // In the beginning, the TODO is not DONE
        expect(screen.queryByText("TODO")).toBeTruthy();
        expect(screen.queryByText("DONE")).toBeFalsy();

        // Toggle the TODO
        fireEvent.click(screen.queryByText("TODO"));

        // Then the TODO is DONE
        expect(screen.queryByText("TODO")).toBeFalsy();
        expect(screen.queryByText("DONE")).toBeTruthy();
      });

      // Same behaviour has `S-C-RET` in Emacs Org mode.
      test("Can create a new header with an inherited todoKeyword", async () => {
        fireEvent.click(screen.queryByText("Top level header"));
        // Click 'plus' on the first header which is _not_ a todoKeyword header
        fireEvent.click(
          container.querySelectorAll("[data-testid='header-action-plus']")[0],
        );
        // "edit title" view has buttons to choose TODO or DONE
        let drawerElem = screen.getByTestId("draggable-drawer");
        expect(drawerElem).toHaveTextContent("DONE");
        // switch to "edit full title", which has no such buttons
        fireEvent.click(screen.getByTitle("Edit title"));
        drawerElem = screen.getByTestId("draggable-drawer");
        expect(drawerElem).not.toHaveTextContent("DONE");
        expect(screen.getByTestId("titleLineInput").value).toEqual("");

        // switch back to "edit title"
        // TODO: Find out why resetting "editRawValues" is broken here
        // maybe the popup is not closed properly? how to simulate that?
        // clicking the top of the screen with
        // fireEvent.click(container.querySelector('.header-bar__title'));
        // crashes the tests
        fireEvent.click(screen.getByTitle("Edit title"));

        // Click 'plus' on the second header which _is_ a todoKeyword header
        fireEvent.click(
          screen.queryByText("A todo item with schedule and deadline"),
        );
        fireEvent.click(
          container.querySelectorAll("[data-testid='header-action-plus']")[1],
        );
        expect(screen.getByTestId("titleLineInput").value).toEqual("");
        // switch to "edit full title"
        fireEvent.click(screen.getByTitle("Edit title"));
        expect(screen.getByTestId("titleLineInput").value).toEqual("TODO ");
      });

      test("Can clock in & out of an event", async () => {
        expect(screen.queryByText("Clock In")).toBeFalsy();
        expect(screen.queryByText("Clock Out")).toBeFalsy();

        fireEvent.click(screen.getByText("Top level header"));

        expect(
          container.querySelector("[data-testid='org-clock-in']"),
        ).toBeTruthy();
        expect(
          container.querySelector("[data-testid='org-clock-out']"),
        ).toBeFalsy();
        expect(screen.queryByText(":LOGBOOK:...")).toBeFalsy();

        fireEvent.click(
          container.querySelector("[data-testid='org-clock-in']"),
        );

        expect(
          container.querySelector("[data-testid='org-clock-in']"),
        ).toBeFalsy();
        expect(
          container.querySelector("[data-testid='org-clock-out']"),
        ).toBeTruthy();
        expect(screen.queryByText(":LOGBOOK:...")).toBeTruthy();

        fireEvent.click(
          container.querySelector("[data-testid='org-clock-out']"),
        );

        expect(
          container.querySelector("[data-testid='org-clock-in']"),
        ).toBeTruthy();
        expect(
          container.querySelector("[data-testid='org-clock-out']"),
        ).toBeFalsy();
        expect(screen.queryByText(":LOGBOOK:...")).toBeTruthy();

        fireEvent.click(screen.getByText(":LOGBOOK:..."));

        expect(screen.queryByText("CLOCK:")).toBeTruthy();
        expect(screen.queryByText("=> 0:00")).toBeTruthy();
      });
    });

    describe("List item manipulation", async () => {
      test("Can create a new list item of same type in the middle of an existing list", async () => {
        const header = screen.queryByText("A header with plain list items");
        fireEvent.click(header);
        fireEvent.click(screen.queryByText("Plain list item 1"));
        fireEvent.click(
          container.querySelectorAll(
            "[data-testid='list-item-action-plus']",
          )[0],
        );

        const input = screen.getByTestId("list-item-edit");
        fireEvent.change(input, { target: { value: "Plain list item 2a" } });

        // Close the modal by clicking on the outside
        fireEvent.click(screen.getByText("Top level header"));

        // New list item has the same UX
        fireEvent.click(screen.queryByText("Plain list item 2a"));
        expect(
          container.querySelectorAll(
            "[data-testid='list-item-action-plus']",
          )[0],
        ).toBeTruthy();

        // The new item is inserted in the middle of 'item 1' and 'item 2'
        expect(
          store
            .getState()
            .org.present.getIn([
              "files",
              STATIC_FILE_PREFIX + "fixtureTestFile.org",
              "headers",
            ])
            .get(12)
            .get("rawDescription"),
        ).toContain(
          "- Plain list item 1\n- Plain list item 2a\n- Plain list item 2",
        );
      });
    });

    describe("Tracking TODO state changes", async () => {
      describe("Default settings", async () => {
        test("shouldLogIntoDrawer enabled", async () => {
          expect(screen.queryByText(":LOGBOOK:...")).toBeFalsy();
          expect(store.getState().base.toJS().shouldLogIntoDrawer).toBeFalsy();
          store.dispatch(setShouldLogIntoDrawer(true));

          fireEvent.click(screen.getByText("Another top level header"));
          fireEvent.click(screen.getByText("A repeating todo"));

          fireEvent.click(screen.getByText("TODO"));
          fireEvent.click(screen.getByText("A repeating todo"));

          // After the TODO is toggled, it's still just TODO, because
          // the state got tracked
          expect(screen.queryByText("DONE")).toBeFalsy();
          // TODO has been scheduled one day into the future
          expect(screen.queryByText("<2020-04-05 Sun +1d>")).toBeFalsy();
          expect(screen.queryByText("<2020-04-06 Mon +1d>")).toBeTruthy();

          expect(screen.queryByText(":LOGBOOK:...")).toBeTruthy();
        });
        test("shouldLogIntoDrawer disabled", async () => {
          expect(screen.queryByText(":LOGBOOK:...")).toBeFalsy();
          expect(store.getState().base.toJS().shouldLogIntoDrawer).toBeFalsy();

          fireEvent.click(screen.getByText("Another top level header"));
          fireEvent.click(screen.getByText("A repeating todo"));

          fireEvent.click(screen.getByText("TODO"));
          fireEvent.click(screen.getByText("A repeating todo"));

          // After the TODO is toggled, it's still just TODO, because
          // the state got tracked
          expect(screen.queryByText("DONE")).toBeFalsy();
          // TODO has been scheduled one day into the future
          expect(screen.queryByText("<2020-04-05 Sun +1d>")).toBeFalsy();
          expect(screen.queryByText("<2020-04-06 Mon +1d>")).toBeTruthy();

          expect(screen.queryByText(":LOGBOOK:...")).toBeFalsy();
        });
      });
    });

    describe("Renders everything starting from an Org file", async () => {
      test("renders an Org file", async () => {
        expect(screen.getAllByText(/\*/)).toHaveLength(8);
      });

      describe("Custom todo sequences", async () => {
        test("It recognizes custom todo sequences and their DONE state", async () => {
          fireEvent.click(screen.getByText("Top level header"));
          expect(
            screen
              .queryByText("TODO")
              .classList.contains("todo-keyword--done-state"),
          ).toBe(false);
          fireEvent.click(screen.queryByText("TODO"));
          expect(
            screen
              .queryByText("DONE")
              .classList.contains("todo-keyword--done-state"),
          ).toBe(true);
          expect(
            screen
              .queryByText("FINISHED")
              .classList.contains("todo-keyword--done-state"),
          ).toBe(true);
        });
      });

      describe("Undo / Redo", async () => {
        test("On loading an Org file, both are disabled", async () => {
          await waitFor(() => {
            expect(
              screen
                .getByTestId("undo")
                .classList.contains("header-bar__actions__item--disabled"),
            ).toBe(true);
          });
          await waitFor(() => {
            expect(
              screen
                .getByTestId("redo")
                .classList.contains("header-bar__actions__item--disabled"),
            ).toBe(true);
          });
        });

        test('Undo becomes available on "edit header"', async () => {
          await userEvent.click(screen.queryByText("Top level header"));
          await userEvent.click(screen.queryByText("TODO"));

          // Open the the title edit textarea
          await userEvent.click(
            container.querySelector('[data-testid="edit-header-title"]'),
          );

          // Close the title edit textarea
          await userEvent.click(screen.queryByText("DONE"));

          // Undo should become available
          expect(
            container
              .querySelector('[data-testid="undo"]')
              .classList.contains("header-bar__actions__item--disabled"),
          ).toBe(false);
        });
      });

      describe("Planning items", async () => {
        test("deletes planning items", async () => {
          fireEvent.click(screen.queryByText("Top level header"));
          fireEvent.click(
            screen.queryByText("A todo item with schedule and deadline"),
          );
          fireEvent.click(screen.queryByText("<2019-09-19 Thu>"));

          expect(screen.queryByText("SCHEDULED:")).toBeTruthy();
          expect(screen.queryByText("DEADLINE:")).toBeTruthy();

          // First: Delete "Scheduled" time

          // The <input type="date"> field exposes a 'x' button to
          // delete the time. There's no direct API to trigger it.
          // Hence, get the element, remove the time and fire the
          // 'change' event manually.
          let timePicker = screen.getByTestId("timestamp-selector");
          timePicker.value = null;
          fireEvent.change(timePicker);

          expect(screen.queryByText("SCHEDULED:")).toBeFalsy();
          expect(screen.queryByText("DEADLINE:")).toBeTruthy();

          // Second: Delete "Deadline" time

          fireEvent.click(screen.queryByText("<2018-10-05 Fri>"));
          timePicker = screen.getByTestId("timestamp-selector");
          timePicker.value = null;
          fireEvent.change(timePicker);

          expect(screen.queryByText("SCHEDULED:")).toBeFalsy();
          expect(screen.queryByText("DEADLINE:")).toBeFalsy();
        });
      });

      /* global global */
      describe("Sharing", async () => {
        let windowSpy: null | vi.spyOn;
        beforeEach(() => {
          windowSpy = vi.spyOn(global, "open");
          windowSpy.mockImplementation((x) => x);
        });

        afterEach(() => {
          windowSpy?.mockRestore();
        });

        // did I delete this
        test("sends the selected header and its body as an email", async () => {
          fireEvent.click(screen.queryByText("Another top level header"));
          fireEvent.click(screen.getByTestId("share"));
          expect(global.open).toBeCalledWith(
            `mailto:?subject=${encodeURIComponent(
              "Another top level header",
            )}&body=${encodeURIComponent(
              "* Another top level header\nSome description content\n\n** TODO A repeating todo\n   SCHEDULED: <2020-04-05 Sun +1d>\n\n",
            )}`,
          );
        });
      });

      describe("Search", async () => {
        test("renders Search for an Org file", async () => {
          expect(screen.queryByText("Search")).toBeFalsy();
          expect(
            screen.queryByText("A todo item with schedule and deadline"),
          ).toBeFalsy();

          fireEvent.click(screen.getByTitle("Show Search / Task List"));
          const drawerElem = screen.getByTestId("draggable-drawer");
          expect(drawerElem).toHaveTextContent(
            "A todo item with schedule and deadline",
          );
        });

        test("searches in all headers", async () => {
          fireEvent.click(screen.getByTitle("Show Search / Task List"));
          const drawerElem = screen.getByTestId("draggable-drawer");
          const input = screen.getByPlaceholderText(
            "e.g. -DONE doc|man :simple|easy :assignee:nobody|none",
          );

          // All kinds of headers are visible
          expect(drawerElem).toHaveTextContent(
            "A todo item with schedule and deadline",
          );
          expect(drawerElem).toHaveTextContent("A header with tags");
          expect(drawerElem).toHaveTextContent("Another top level header");

          // Filter down to headers with tag :tag1:
          fireEvent.change(input, { target: { value: ":tag1" } });

          expect(drawerElem).toHaveTextContent("A header with tags");
          expect(drawerElem).not.toHaveTextContent("Another top level header");
        });

        test("searches in sub-headers when narrowed", async () => {
          // Click 'narrow' on the first header
          fireEvent.click(screen.queryByText("Top level header"));
          fireEvent.click(
            container.querySelectorAll(
              "[data-testid='header-action-narrow']",
            )[0],
          );

          fireEvent.click(screen.getByTitle("Show Search / Task List"));
          const drawerElem = screen.getByTestId("draggable-drawer");

          // Only sub-headers are visible
          expect(drawerElem).not.toHaveTextContent("A header with tags");
          expect(drawerElem).not.toHaveTextContent("Another top level header");
          expect(drawerElem).toHaveTextContent("A nested header");
          expect(drawerElem).toHaveTextContent(
            "A todo item with schedule and deadline",
          );
        });
      });

      describe("Refile", async () => {
        test("removes selected header and subheader from search", async () => {
          fireEvent.click(screen.queryByText("Top level header"));
          fireEvent.click(screen.getByTestId("org-refile"));

          const drawerElem = screen.getByTestId("draggable-drawer");
          expect(drawerElem).not.toHaveTextContent("Top level header");
          expect(drawerElem).toHaveTextContent("Another top level header");
        });
      });

      describe("TaskList", async () => {
        test("renders TaskList for an Org file", async () => {
          expect(screen.queryByText("Task list")).toBeFalsy();
          expect(
            screen.queryByText("A todo item with schedule and deadline"),
          ).toBeFalsy();

          fireEvent.click(screen.getByTitle("Show Search / Task List"));
          fireEvent.click(screen.getByText("Task List"));
          const drawerElem = screen.getByTestId("draggable-drawer");
          expect(drawerElem).not.toHaveTextContent("Top level header");
          expect(drawerElem).toHaveTextContent(
            "A todo item with schedule and deadline",
          );
        });

        // Order by state first and then by date. Ergo TODO is before
        // DONE and yesterday is before today.
        test("orders tasks for an Org file", async () => {
          fireEvent.click(screen.getByTitle("Show Search / Task List"));
          const drawerElem = screen.getByTestId("draggable-drawer");
          expect(drawerElem).toMatchSnapshot();
        });

        test("search in TaskList filters headers (by default only with todoKeywords)", async () => {
          fireEvent.click(screen.getByTitle("Show Search / Task List"));
          const drawerElem = screen.getByTestId("draggable-drawer");
          const input = screen.getByPlaceholderText(
            "e.g. -DONE doc|man :simple|easy :assignee:nobody|none",
          );
          fireEvent.change(input, {
            target: { value: "a search with no results" },
          });

          expect(drawerElem).not.toHaveTextContent(
            "A todo item with schedule and deadline",
          );
          fireEvent.change(input, { target: { value: "todo item" } });

          expect(drawerElem).toHaveTextContent(
            "A todo item with schedule and deadline",
          );
        });

        // More rigorous testing of the search parser is here:
        // headline_filter_parser.unit.test.js
        test("search in TaskList filters headers (on demand without todoKeywords)", async () => {
          fireEvent.click(screen.getByTitle("Show Search / Task List"));
          fireEvent.click(screen.getByText("Task List"));
          const drawerElem = screen.getByTestId("draggable-drawer");
          screen.getByPlaceholderText(
            "e.g. -DONE doc|man :simple|easy :assignee:nobody|none",
          );

          // Is a regular header without TODO keyword
          expect(drawerElem).not.toHaveTextContent("Another top level header");
          // Is a header with TODO keyword
          expect(drawerElem).toHaveTextContent("A repeating todo");
        });
      });

      describe("Agenda", async () => {
        test("renders Agenda for an Org file", async () => {
          // Agenda is not visible by default
          expect(screen.queryByText("Agenda")).toBeFalsy();
          expect(screen.queryByText("Day")).toBeFalsy();
          expect(screen.queryByText("Month")).toBeFalsy();
          expect(screen.queryByText("A scheduled todo item")).toBeFalsy();

          fireEvent.click(screen.getByTitle("Show agenda"));

          expect(screen.queryByText("Agenda")).toBeTruthy();
          expect(screen.queryByText("Day")).toBeTruthy();
          expect(screen.queryByText("Month")).toBeTruthy();
          expect(
            screen.queryAllByText("A todo item with schedule and deadline"),
          ).toBeTruthy();
        });

        test("Agenda starts on Monday by default", async () => {
          fireEvent.click(screen.getByTitle("Show agenda"));
          expect(
            container.querySelectorAll(".agenda-day__title__day-name")[0],
          ).toHaveTextContent("Monday");
        });

        test("Clicking a TODO within the agenda highlights it in the main view", async () => {
          expect(
            screen.queryByText("A todo item with schedule and deadline"),
          ).toBeFalsy();
          fireEvent.click(screen.getByTitle("Show agenda"));
          expect(screen.queryByText("Agenda")).toBeTruthy();
          fireEvent.click(
            screen.queryAllByText("A todo item with schedule and deadline")[0],
          );
          expect(screen.queryByText("Agenda")).toBeFalsy();
          expect(
            screen.queryByText("A todo item with schedule and deadline"),
          ).toBeTruthy();
        });

        test("Clicking the Timestamp in a TODO within the agenda toggles from the date to the time", async () => {
          const expectedDate = new Date(2019, 8, 19, 12, 0);
          fireEvent.click(screen.getByTitle("Show agenda"));
          const timeSinceScheduled = formatDistanceToNow(expectedDate);
          expect(screen.queryByText(timeSinceScheduled)).toBeFalsy();
          expect(screen.queryByText("09/19")).toBeTruthy();
          fireEvent.click(screen.queryByText("09/19"));
          expect(screen.queryByText("09/19")).toBeFalsy();
          expect(screen.queryByText(`${timeSinceScheduled} ago`)).toBeTruthy();
        });

        test("Agenda shows only actionable TODOs, not with a DONE state", async () => {
          fireEvent.click(screen.getByTitle("Show agenda"));

          const drawerElem = screen.getByTestId("draggable-drawer");
          expect(drawerElem).not.toHaveTextContent(
            "A headline that's done since a loong time",
          );
          expect(drawerElem).not.toHaveTextContent(
            "A headline that's done a day earlier even",
          );

          expect(drawerElem).toHaveTextContent(
            "A todo item with schedule and deadline",
          );
          expect(drawerElem).toHaveTextContent("A repeating todo");
        });
      });

      describe("TableEditor", async () => {
        let testOrgFileWithTable;

        const drawerWithTable: string = "table-drawer";
        const editCellButtonId: string = "edit-cell-button";
        const editCellContainerId: string = "edit-cell-container";

        const getTableRows = property(["rows"]);

        const getContentsOfTableColumn = curry((columnNumber, table) => {
          return pipe([
            getTableRows,
            map(property(["cells", columnNumber, "textContent"])),
          ])(table);
        });

        const getTableColumnsCount = property(["rows", 0, "cells", "length"]);

        const getAllTableColumnsAsListOfLists = (table) => {
          return pipe([
            getTableColumnsCount,
            times((columnNumber) =>
              getContentsOfTableColumn(columnNumber, table),
            ),
          ])(table);
        };

        const getTableRowsCount = property(["rows", "length"]);

        const getContentsOfTableRow = curry((rowNumber, table) => {
          return pipe([
            property(["rows", rowNumber, "cells"]),
            map(property(["textContent"])),
          ])(table);
        });

        const getAllTableRowsAsListOfLists = (table) => {
          return pipe([
            getTableRowsCount,
            times((rowNumber) => getContentsOfTableRow(rowNumber, table)),
          ])(table);
        };

        beforeEach(() => {
          testOrgFileWithTable = readFixture("large_table");
          store.dispatch(
            parseFile(
              STATIC_FILE_PREFIX + "fixtureTestFile.org",
              testOrgFileWithTable,
            ),
          );
          store.dispatch(setPath(STATIC_FILE_PREFIX + "fixtureTestFile.org"));
        });

        test("opens when a table cell is clicked on", async () => {
          // click table
          fireEvent.click(screen.getByText("Dogs"));
          // click cell to open table ediotr
          fireEvent.click(screen.getByText("Argos"));
          // assert edit table component
          expect(screen.getByTestId(drawerWithTable)).toHaveTextContent(
            "Edit Table",
          );
        });

        test("can edit cell value", async () => {
          const cellToClick = "Bauschan";
          // click table
          fireEvent.click(screen.getByText("Dogs"));
          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert pencil edit button exists
          expect(screen.getByTestId(editCellButtonId)).toBeTruthy();

          // click cell again
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // // click pencil to edit cell
          fireEvent.click(screen.getByTestId(editCellButtonId));

          expect(screen.getByTestId(editCellContainerId)).toBeTruthy();

          const newValue = "Motz";
          fireEvent.change(screen.getByTestId(editCellContainerId), {
            target: { value: newValue },
          });
          fireEvent.click(screen.getByText("Edit Table"));
          expect(screen.getAllByText(newValue)).toBeTruthy();
        });

        test("can insert timestamp in a cell", async () => {
          const cellToClick = "Luster";
          // click table
          await userEvent.click(screen.getByText("Dogs"));
          // click cell to open table editor
          await userEvent.click(screen.getByText(cellToClick));
          // assert pencil edit button exists
          await waitFor(() =>
            expect(screen.getByTestId(editCellButtonId)).toBeTruthy(),
          );

          const cellToEdit = screen.getAllByText(cellToClick)[1];
          // click cell again
          await userEvent.click(cellToEdit);
          // // click pencil to edit cell
          await userEvent.click(screen.getByTestId(editCellButtonId));

          const expectedDate = format("yyyy-MM-dd", new Date());

          // click insert timestamp
          await userEvent.click(screen.getByText("Insert timestamp"));
          await userEvent.click(screen.getByText("Edit Table"));

          expect(
            screen.getAllByText(expectedDate, { exact: false }),
          ).toBeTruthy();
        });

        test("can move row up", async () => {
          const cellToClick = "6";
          // click table
          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");

          const [firstTestRowBeforeEdit, secondTestRowBeforeEdit] = over([
            getContentsOfTableRow(4),
            getContentsOfTableRow(5),
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the move right button exists
          expect(
            document.querySelector(".table-action-movement__up"),
          ).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // move row up
          fireEvent.click(document.querySelector(".table-action-movement__up"));
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [firstTestRowAfterEdit, secondTestRowAfterEdit] = over([
            getContentsOfTableRow(4),
            getContentsOfTableRow(5),
          ])(tableAfterMove);

          expect(firstTestRowBeforeEdit).toStrictEqual(secondTestRowAfterEdit);
          expect(secondTestRowBeforeEdit).toStrictEqual(firstTestRowAfterEdit);
        });

        test("can move row down", async () => {
          const cellToClick = "17";
          // click table
          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");

          const [firstTestRowBeforeEdit, secondTestRowBeforeEdit] = over([
            getContentsOfTableRow(9),
            getContentsOfTableRow(10),
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the move right button exists
          expect(
            document.querySelector(".table-action-movement__down"),
          ).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // move row down
          fireEvent.click(
            document.querySelector(".table-action-movement__down"),
          );
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [firstTestRowAfterEdit, secondTestRowAfterEdit] = over([
            getContentsOfTableRow(9),
            getContentsOfTableRow(10),
          ])(tableAfterMove);
          expect(firstTestRowBeforeEdit).toStrictEqual(secondTestRowAfterEdit);
          expect(secondTestRowBeforeEdit).toStrictEqual(firstTestRowAfterEdit);
        });

        test("can move column to the right", async () => {
          const cellToClick = "Rufus";

          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");
          // get the first column

          const [firstTestColumnBeforeEdit, secondTestColumnBeforeEdit] = over([
            getContentsOfTableColumn(0),
            getContentsOfTableColumn(1),
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the move right button exists
          expect(
            document.querySelector(".table-action-movement__right"),
          ).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // move column to the right
          fireEvent.click(
            document.querySelector(".table-action-movement__right"),
          );
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [firstTestColumnAfterEdit, secondTestColumnAfterMove] = over([
            getContentsOfTableColumn(0),
            getContentsOfTableColumn(1),
          ])(tableAfterMove);

          expect(firstTestColumnBeforeEdit).toStrictEqual(
            secondTestColumnAfterMove,
          );
          expect(secondTestColumnBeforeEdit).toStrictEqual(
            firstTestColumnAfterEdit,
          );
        });

        test("can move column to the left", async () => {
          const cellToClick = "Edward Rochester";
          // click table
          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");

          const [firstTestColumnBeforeEdit, secondTestColumnBeforeEdit] = over([
            getContentsOfTableColumn(2),
            getContentsOfTableColumn(3),
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the move right button exists
          expect(
            document.querySelector(".table-action-movement__left"),
          ).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // move column to the left
          fireEvent.click(
            document.querySelector(".table-action-movement__left"),
          );
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [firstTestColumnAfterEdit, secondTestColumnAfterMove] = over([
            getContentsOfTableColumn(2),
            getContentsOfTableColumn(3),
          ])(tableAfterMove);

          expect(firstTestColumnBeforeEdit).toStrictEqual(
            secondTestColumnAfterMove,
          );
          expect(secondTestColumnBeforeEdit).toStrictEqual(
            firstTestColumnAfterEdit,
          );
        });

        test("can add row", async () => {
          const cellToClick = "Anika R.";
          // click table
          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");

          const [
            firstTestRowBeforeEdit,
            secondTestRowBeforeEdit,
            rowCountBeforeEdit,
          ] = over([
            getContentsOfTableRow(7),
            getContentsOfTableRow(8),
            getTableRowsCount,
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the add row button exists
          expect(screen.getByTestId("add-row-button")).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // add row
          fireEvent.click(screen.getByTestId("add-row-button"));
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [
            firstTestRowAfterEdit,
            secondTestRowAfterEdit,
            thirdTestRowAfterEdit,
            rowCountAfterEdit,
          ] = over([
            getContentsOfTableRow(7),
            getContentsOfTableRow(8),
            getContentsOfTableRow(9),
            getTableRowsCount,
          ])(tableAfterMove);

          expect(rowCountAfterEdit).toEqual(rowCountBeforeEdit + 1);
          expect(firstTestRowAfterEdit).toStrictEqual(firstTestRowBeforeEdit);
          expect(thirdTestRowAfterEdit).toStrictEqual(secondTestRowBeforeEdit);
          expect(secondTestRowAfterEdit.length).toEqual(
            firstTestRowBeforeEdit.length,
          );
          expect(secondTestRowAfterEdit).not.toEqual(secondTestRowBeforeEdit);
        });

        test("can add column", async () => {
          const cellToClick = "45";
          // click table
          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");

          const [
            firstTestColumnBeforeEdit,
            secondTestColumnBeforeEdit,
            columnCountBeforeEdit,
          ] = over([
            getContentsOfTableColumn(2),
            getContentsOfTableColumn(3),
            getTableColumnsCount,
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the add column button exists
          expect(screen.getByTestId("add-column-button")).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // add column
          fireEvent.click(screen.getByTestId("add-column-button"));
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [
            firstTestColumnAfterEdit,
            secondTestColumnAfterEdit,
            thirdTestColumnAfterEdit,
            columnCountAfterEdit,
          ] = over([
            getContentsOfTableColumn(2),
            getContentsOfTableColumn(3),
            getContentsOfTableColumn(4),
            getTableColumnsCount,
          ])(tableAfterMove);

          expect(columnCountAfterEdit).toEqual(columnCountBeforeEdit + 1);
          expect(firstTestColumnAfterEdit).toStrictEqual(
            firstTestColumnBeforeEdit,
          );
          expect(thirdTestColumnAfterEdit).toStrictEqual(
            secondTestColumnBeforeEdit,
          );
          expect(secondTestColumnAfterEdit.length).toEqual(
            firstTestColumnBeforeEdit.length,
          );
          expect(secondTestColumnAfterEdit).not.toEqual(
            secondTestColumnBeforeEdit,
          );
        });

        test("can delete row", async () => {
          const cellToClick = "Gyp";
          // click table
          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");

          const [testRowToDelete, rowCountBeforeEdit] = over([
            getContentsOfTableRow(6),
            getTableRowsCount,
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the delete row button exists
          expect(screen.getByTestId("delete-row-button")).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // delete row
          fireEvent.click(screen.getByTestId("delete-row-button"));
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [tableRowsAfterEdit, rowCountAfterEdit] = over([
            getAllTableRowsAsListOfLists,
            getTableRowsCount,
          ])(tableAfterMove);
          const setOfTableRowsAfterEdit = convertToSet(tableRowsAfterEdit);

          expect(rowCountAfterEdit).toEqual(rowCountBeforeEdit - 1);
          expect(setOfTableRowsAfterEdit.has(testRowToDelete)).toBeFalsy();
        });

        test("can delete column", async () => {
          const cellToClick = "Score";
          // click table
          fireEvent.click(screen.getByText("Dogs"));

          const tableBeforeMove = document.querySelector(".table-part");

          const [testColumnToDelete, columnCountBeforeEdit] = over([
            getContentsOfTableColumn(4),
            getTableColumnsCount,
          ])(tableBeforeMove);

          // click cell to open table editor
          fireEvent.click(screen.getByText(cellToClick));
          // assert the delete column button exists
          expect(screen.getByTestId("delete-column-button")).toBeTruthy();
          // click cell in table editor
          fireEvent.click(screen.getAllByText(cellToClick)[1]);
          // delete column
          fireEvent.click(screen.getByTestId("delete-column-button"));
          // exit table editor
          fireEvent.click(screen.getByText("Dogs"));

          const tableAfterMove = document.querySelector(".table-part");

          const [tableColumnsAfterEdit, columnCountAfterEdit] = over([
            getAllTableColumnsAsListOfLists,
            getTableColumnsCount,
          ])(tableAfterMove);
          const setOfTableColumnsAfterEdit = convertToSet(
            tableColumnsAfterEdit,
          );
          expect(columnCountAfterEdit).toEqual(columnCountBeforeEdit - 1);
          expect(
            setOfTableColumnsAfterEdit.has(testColumnToDelete),
          ).toBeFalsy();
        });
      });

      describe("Link recognition", async () => {
        test("recognizes canonical format +xxxxxxxxx phone numbers", async () => {
          fireEvent.click(
            screen.queryByText(
              "A header with a URL, mail address and phone number as content",
            ),
          );
          const elem = screen.getAllByText("+49123456789");
          // There's exactly one phone number
          expect(elem.length).toEqual(1);
          // And it renders as such
          expect(elem[0]).toHaveAttribute("href", "tel:+49123456789");
          expect(elem[0]).toHaveTextContent("+49123456789");
        });

        test("recognizes phone numbers", async () => {
          fireEvent.click(
            screen.queryByText(
              "A header with a URL, mail address and phone number as content",
            ),
          );

          const phone_numbers = [
            // US
            "123-456-7890",
            "(123) 456-7890",
            "123 456 7890",
            "123.456.7890",
            "+91 (123) 456-7890",
            // Swiss
            "0783268674",
            "078 326 86 74",
            "041783268675",
            "0041783268674",
            "+41783268676",
            "+41783268677",
          ];

          for (let i in phone_numbers) {
            const phone_number = phone_numbers[i];
            const elem = screen.getAllByText(phone_number);
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("href", `tel:${phone_number}`);
            expect(elem[0]).toHaveTextContent(phone_number);
          }
        });

        test("does not recognize random numbers as phone numbers", async () => {
          fireEvent.click(
            screen.queryByText(
              "A header with a URL, mail address and phone number as content",
            ),
          );

          const numbers = ["05 05 05"];

          for (let i in numbers) {
            const number = numbers[i];
            const elem = screen.getAllByText(number);
            expect(elem.length).toEqual(1);
            expect(elem[0]).not.toHaveAttribute("href", `tel:${number}`);
            expect(elem[0]).toHaveTextContent(number);
          }
        });

        test("recognizes URLs", async () => {
          fireEvent.click(
            screen.queryByText(
              "A header with a URL, mail address and phone number as content",
            ),
          );
          const elem = screen.getAllByText("https://foo.bar.baz/xyz?a=b&d#foo");
          // There's exactly one such URL
          expect(elem.length).toEqual(1);
          // And it renders as such
          expect(elem[0]).toHaveAttribute(
            "href",
            "https://foo.bar.baz/xyz?a=b&d#foo",
          );
          expect(elem[0]).toHaveTextContent(
            "https://foo.bar.baz/xyz?a=b&d#foo",
          );
        });

        describe("recognizes file: links", async () => {
          beforeEach(() => {
            fireEvent.click(
              screen.queryByText("A header with various links as content"),
            );
          });

          test("relative link to .org file", async () => {
            const elem = screen.getAllByText(
              "an existing .org file in the same directory",
            );
            // There's exactly one such URL
            expect(elem.length).toEqual(1);
            // And it renders as such
            expect(elem[0]).toHaveAttribute(
              "data-target",
              "/dir1/dir2/schedule_and_timestamps.org",
            );
            expect(elem[0]).toHaveTextContent(
              "an existing .org file in the same directory",
            );
          });

          test("relative link to subdir", async () => {
            const elem = screen.getAllByText("subdir");
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("href", "/files/dir1/dir2/subdir");
            expect(elem[0]).toHaveTextContent("subdir");
          });

          test("relative link to subdir/", async () => {
            const elem = screen.getAllByText("subdir/");
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("href", "/files/dir1/dir2/subdir/");
            expect(elem[0]).toHaveTextContent("subdir/");
          });

          test("relative link to fictitious .org file in subdir", async () => {
            testSetup();
            const elem = screen.getAllByText(
              "a fictitious .org file in a sub-directory",
            );
            screen.debug();
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute(
              "data-target",
              "/dir1/dir2/subdir/foo.org",
            );
            expect(elem[0]).toHaveTextContent(
              "a fictitious .org file in a sub-directory",
            );
          });

          test("relative link to fictitious .org file in a parent directory", async () => {
            const elem = screen.getAllByText(
              "a fictitious .org file in a parent directory",
            );
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute(
              "data-target",
              "/dir1/foo.org_archive",
            );
            expect(elem[0]).toHaveTextContent(
              "a fictitious .org file in a parent directory",
            );
          });

          test("relative link to ../subdir", async () => {
            const elem = screen.getAllByText("../subdir");
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("href", "/files/dir1/subdir");
            expect(elem[0]).toHaveTextContent("../subdir");
          });

          test("relative link to ../subdir/", async () => {
            const elem = screen.getAllByText("../subdir/");
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("href", "/files/dir1/subdir/");
            expect(elem[0]).toHaveTextContent("../subdir/");
          });

          test("relative link to fictitious .org file in a grand-parent directory", async () => {
            const elem = screen.getAllByText(
              "a fictitious .org file in a grand-parent directory",
            );
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("data-target", "/foo.org");
            expect(elem[0]).toHaveTextContent(
              "a fictitious .org file in a grand-parent directory",
            );
          });

          test("relative link to fictitious .org file in a too-high ancestor directory", async () => {
            const elem = screen.getAllByText(
              "a fictitious .org file in a too-high ancestor directory",
            );
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute(
              "data-target",
              "../../../../too-high-to-access-file.org",
            );
            expect(elem[0]).toHaveTextContent(
              "a fictitious .org file in a too-high ancestor directory",
            );
          });

          test("relative link to too-high ancestor directory", async () => {
            const elem = screen.getAllByText("a too-high ancestor directory");
            expect(elem.length).toEqual(1);
            // INFO: This file cannot be opened, because it is not
            // visible from within the share given to org-everywhere.
            expect(elem[0]).toHaveAttribute(
              "data-target",
              "../../../../too-high-to-access-directory",
            );
            expect(elem[0]).toHaveTextContent("a too-high ancestor directory");
          });

          test("absolute link to fictitious .org file in home directory", async () => {
            const elem = screen.getAllByText(
              "a fictitious .org file in home directory",
            );
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("data-target", "~/foo/bar/baz.org");
            // INFO: This file cannot really be opened, because
            // org-everywhere doesn't know the directory structure of the
            // user. I.e. the file link might be
            // `file:~/Dropbox/org/things.org`. Then, org-everywhere would
            // have to remove the `Dropbox` folder and try and see if
            // it can find the file underneath.
            expect(elem[0]).toHaveTextContent(
              "a fictitious .org file in home directory",
            );
          });

          test("absolute link to fictitious .org file", async () => {
            const elem = screen.getAllByText("a fictitious .org file");
            expect(elem.length).toEqual(1);
            expect(elem[0]).toHaveAttribute("data-target", "/foo/bar/baz.org");
            expect(elem[0]).toHaveTextContent("a fictitious .org file");
          });
        });

        test("recognizes email addresses", async () => {
          fireEvent.click(
            screen.queryByText(
              "A header with a URL, mail address and phone number as content",
            ),
          );
          const elem = screen.getAllByText("foo.bar@baz.org");
          // There's exactly one such email address
          expect(elem.length).toEqual(1);
          // And it renders as such
          expect(elem[0]).toHaveAttribute("href", "mailto:foo.bar@baz.org");
          expect(elem[0]).toHaveTextContent("foo.bar@baz.org");
        });
      });
    });
  });
});
