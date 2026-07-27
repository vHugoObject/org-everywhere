import { formatDistanceToNow } from "date-fns";
import { List, Map, fromJS, type MapOf } from "immutable";
import { range, type Function1 } from "lodash";
import { curry, partialRight, repeat } from "lodash/fp";
import type {
  FileSetting,
  OrgFile,
  OrgHeadline,
  OrgList,
  OrgListItem,
  OrgPlanningItem,
  OrgPropertyListItem,
  OrgTable,
  OrgTableCell,
  OrgTableRow,
  OrgText,
  OrgTimestamp,
  OrgTodoKeywordSet,
  State,
} from "../types";
import substituteTemplateVariables from "./capture_template_substitution";
import { attributedStringToRawText } from "./export_org";
import generateId from "./id_generator";

export const STATIC_FILE_PREFIX: "org-everywhere_internal_" =
  "org-everywhere_internal_";

export const createHeadingStars: Function1<number, string> = partialRight(
  repeat,
  ["*"],
);

export const indexAndHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): { headerIndex: number; header: MapOf<OrgHeadline> | undefined } => {
  const headerIndex: number = indexOfHeaderWithId(headers, headerId);
  return { headerIndex, header: headers.get(headerIndex) };
};

export const indexOfHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): number => {
  return headers.findIndex(
    (header: MapOf<OrgHeadline>): boolean => header.get("id") === headerId,
  );
};

export const headerWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): MapOf<OrgHeadline> | undefined => {
  return headers.get(indexOfHeaderWithId(headers, headerId));
};

const subheaderIndexRangeForHeaderIndex = (
  headers: List<MapOf<OrgHeadline>>,
  headerIndex: number,
): number[] => {
  const header: MapOf<OrgHeadline> | undefined = headers.get(headerIndex);

  const afterHeaders: List<MapOf<OrgHeadline>> = headers.slice(headerIndex + 1);
  const nextSiblingHeaderIndex: number = afterHeaders.findIndex(
    (siblingHeader: MapOf<OrgHeadline>): boolean => {
      return siblingHeader.get("nestingLevel") <= header.get("nestingLevel");
    },
  );

  if (nextSiblingHeaderIndex === -1) {
    return [headerIndex + 1, headers.size];
  } else {
    return [headerIndex + 1, headerIndex + 1 + nextSiblingHeaderIndex];
  }
};

const subheaderIndexRangeForHeaderId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): number[] => {
  const headerIndex: number = indexOfHeaderWithId(headers, headerId);
  return subheaderIndexRangeForHeaderIndex(headers, headerIndex);
};

export const subheaderIndicesOfHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): number[] => {
  let [begin, end] = subheaderIndexRangeForHeaderId(headers, headerId);
  return range(begin, end);
};

export const subheadersOfHeaderWithIndex = (
  headers: List<MapOf<OrgHeadline>>,
  headerIndex: number,
): List<MapOf<OrgHeadline>> => {
  let [begin, end] = subheaderIndexRangeForHeaderIndex(headers, headerIndex);
  return headers.slice(begin, end);
};

export const subheadersOfHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): List<MapOf<OrgHeadline>> => {
  let [begin, end] = subheaderIndexRangeForHeaderId(headers, headerId);
  return headers.slice(begin, end);
};

export const numSubheadersOfHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): number => subheadersOfHeaderWithId(headers, headerId).size;

export const directParentOfHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): MapOf<OrgHeadline> | null | undefined => {
  const { header, headerIndex } = indexAndHeaderWithId(headers, headerId);

  for (let i: number = headerIndex - 1; i >= 0; --i) {
    const previousHeader: MapOf<OrgHeadline> | undefined = headers.get(i);

    if (previousHeader.get("nestingLevel") === header.get("nestingLevel") - 1) {
      return previousHeader;
    }

    if (previousHeader.get("nestingLevel") < header.get("nestingLevel")) {
      return null;
    }
  }

  return null;
};

export const directParentIdOfHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): number | null => {
  const parent: MapOf<OrgHeadline> | null | undefined =
    directParentOfHeaderWithId(headers, headerId);
  if (!parent) {
    return null;
  } else {
    return parent.get("id");
  }
};

export const parentIdOfHeaderWithId = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): number | null => {
  const { header, headerIndex } = indexAndHeaderWithId(headers, headerId);

  const previousHeaders: List<MapOf<OrgHeadline>> = headers.slice(
    0,
    headerIndex,
  );
  const parentHeader: MapOf<OrgHeadline> | undefined = previousHeaders.findLast(
    (previousHeader: MapOf<OrgHeadline>): boolean =>
      previousHeader.get("nestingLevel") < header.get("nestingLevel"),
  );

  if (!parentHeader) {
    return null;
  }

  return parentHeader.get("id");
};

export const inheritedValueOfProperty = (
  headers: List<MapOf<OrgHeadline>>,
  headerIndex: number,
  property: MapOf<OrgPropertyListItem>,
) => {
  const headerProp = headers
    .getIn([headerIndex, "propertyListItems"])
    .find((item): boolean => item.get("property") === property);
  if (headerProp) {
    return headerProp.get("value");
  }
  const parentId: number = parentIdOfHeaderWithId(
    headers,
    headers.getIn([headerIndex, "id"]),
  );
  if (parentId) {
    const parentHeaderIndex: number = indexOfHeaderWithId(headers, parentId);
    return inheritedValueOfProperty(headers, parentHeaderIndex, property);
  }
  return null;
};

export const indexOfPreviousSibling = (
  headers: List<MapOf<OrgHeadline>>,
  headerIndex: number,
): number | null => {
  const nestingLevel: unknown = headers.getIn([headerIndex, "nestingLevel"]);

  for (let i: number = headerIndex - 1; i >= 0; --i) {
    const header: MapOf<OrgHeadline> | undefined = headers.get(i);

    if (header.get("nestingLevel") < nestingLevel) {
      return null;
    }

    if (header.get("nestingLevel") === nestingLevel) {
      return i;
    }
  }

  return null;
};

const isHeaderVisible = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
): boolean => {
  const parentHeaderId: number = parentIdOfHeaderWithId(headers, headerId);
  if (!parentHeaderId) {
    return true;
  }

  const parentHeader: MapOf<OrgHeadline> | undefined = headerWithId(
    headers,
    parentHeaderId,
  );
  return (
    parentHeader.get("opened") &&
    isHeaderVisible(headers, parentHeader.get("id"))
  );
};

export const nextVisibleHeaderAfterIndex = (
  headers: List<MapOf<OrgHeadline>>,
  headerIndex: number,
): MapOf<OrgHeadline> | undefined => {
  const followingHeaders: List<MapOf<OrgHeadline>> = headers.slice(
    headerIndex + 1,
  );
  return followingHeaders.find((header: MapOf<OrgHeadline>): boolean =>
    isHeaderVisible(headers, header.get("id")),
  );
};

export const previousVisibleHeaderAfterIndex = (
  headers: List<MapOf<OrgHeadline>>,
  headerIndex: number,
): MapOf<OrgHeadline> | undefined => {
  const previousHeaders: List<MapOf<OrgHeadline>> = headers
    .slice(0, headerIndex)
    .reverse();
  return previousHeaders.find((header: MapOf<OrgHeadline>): boolean =>
    isHeaderVisible(headers, header.get("id")),
  );
};

export const openDirectParent = (state: State, headerId: number): State => {
  const parentHeaderId: number = directParentIdOfHeaderWithId(
    state.get("headers"),
    headerId,
  );
  if (parentHeaderId !== null) {
    const parentHeaderIndex: number = indexOfHeaderWithId(
      state.get("headers"),
      parentHeaderId,
    );
    state = state.setIn(["headers", parentHeaderIndex, "opened"], true);
  }

  return state;
};

export const getOpenHeaderPaths = (
  headers: List<MapOf<OrgHeadline>>,
): string[] => {
  let openedHeaders: string[] = [];
  for (let i: number = 0; i < headers.size; ++i) {
    const header: MapOf<OrgHeadline> | undefined = headers.get(i);
    if (!header.get("opened")) {
      continue;
    }

    const title: string = header.getIn(["titleLine", "rawTitle"]);

    const subheaders: List<MapOf<OrgHeadline>> = subheadersOfHeaderWithId(
      headers,
      header.get("id"),
    );
    const openSubheaderPaths: string[] = getOpenHeaderPaths(subheaders);

    if (openSubheaderPaths.length > 0) {
      openSubheaderPaths.forEach((openedSubheaderPath: string): void => {
        openedHeaders.push([title].concat(openedSubheaderPath));
      });
    } else {
      openedHeaders.push([title]);
    }

    i += subheaders.size;
  }

  return openedHeaders;
};

export const getSelectedHeader = (state: State): MapOf<OrgHeadline> | null => {
  const path: string = state.org.present.get("path");
  const file: MapOf<OrgFile> = state.org.present.getIn(["files", path], Map());
  const headerId: number = file.get("selectedHeaderId");
  const headers: List<MapOf<OrgHeadline>> = file.get("headers");
  if (!headers) {
    return null;
  }
  const headerIdx: number = indexOfHeaderWithId(headers, headerId);
  if (headerIdx === -1) {
    return null;
  }
  return file.getIn(["headers", headerIdx]);
};

export const headerWithPath = (
  headers: List<MapOf<OrgHeadline>>,
  headerPaths: List<string>,
) => {
  if (headerPaths.size === 0) {
    return null;
  }

  const firstHeader: MapOf<OrgHeadline> | undefined = headers.find(
    (header: MapOf<OrgHeadline>): boolean =>
      parentIdOfHeaderWithId(headers, header.get("id")) === null &&
      header.getIn(["titleLine", "rawTitle"]).trim() ===
        substituteTemplateVariables(headerPaths.first())[0].trim(),
  );
  if (!firstHeader) {
    return null;
  }

  if (headerPaths.size === 1) {
    return firstHeader;
  }

  const subheaders: List<MapOf<OrgHeadline>> = subheadersOfHeaderWithId(
    headers,
    firstHeader.get("id"),
  );
  return headerWithPath(subheaders, headerPaths.rest());
};

export const openHeaderWithPath = (
  headers: List<MapOf<OrgHeadline>>,
  headerPaths: List<string>,
  maxNestingLevel: number = 1,
): List<MapOf<OrgHeadline>> => {
  if (headerPaths.size === 0) {
    return headers;
  }

  const firstTitle: string | undefined = headerPaths.first();
  const headerIndex: number = headers.findIndex(
    (header: MapOf<OrgHeadline>): boolean => {
      const rawTitle: string = header.getIn(["titleLine", "rawTitle"]);
      const nestingLevel: number = header.get("nestingLevel");
      return rawTitle === firstTitle && nestingLevel <= maxNestingLevel;
    },
  );
  if (headerIndex === -1) {
    return headers;
  }

  headers = headers.update(
    headerIndex,
    (header: MapOf<OrgHeadline> | undefined): MapOf<OrgHeadline> =>
      header.set("opened", true),
  );

  let subheaders: List<MapOf<OrgHeadline>> = subheadersOfHeaderWithId(
    headers,
    headers.getIn([headerIndex, "id"]),
  );
  subheaders = openHeaderWithPath(
    subheaders,
    headerPaths.rest(),
    maxNestingLevel + 1,
  );

  headers = headers
    .take(headerIndex + 1)
    .concat(subheaders)
    .concat(
      headers.takeLast(headers.size - (headerIndex + 1 + subheaders.size)),
    );

  return headers;
};

const tablePartContainsCellId = (
  tablePart: MapOf<OrgTable>,
  cellId: number,
): boolean =>
  tablePart
    .get("contents")
    .some((row: MapOf<OrgTableRow>): boolean =>
      row
        .get("contents")
        .some(
          (cell: MapOf<OrgTableCell>): boolean => cell.get("id") === cellId,
        ),
    );

const doesAttributedStringContainTableCellId = (parts, cellId: number) =>
  parts
    .filter((part): boolean => ["table", "list"].includes(part.get("type")))
    .some((part) =>
      part.get("type") === "table"
        ? tablePartContainsCellId(part, cellId)
        : part
            .get("items")
            .some((item) =>
              doesAttributedStringContainTableCellId(
                item.get("contents"),
                cellId,
              ),
            ),
    );

export const headerThatContainsTableCellId = (
  headers: List<MapOf<OrgHeadline>>,
  cellId: number,
): MapOf<OrgHeadline> | undefined =>
  headers.find((header: MapOf<OrgHeadline>) =>
    doesAttributedStringContainTableCellId(header.get("description"), cellId),
  );

export const pathAndPartOfTimestampItemWithIdInAttributedString = (
  parts,
  timestampId: number,
) =>
  parts
    .map((part, partIndex: number) => {
      if (part.get("type") === "timestamp" && part.get("id") === timestampId) {
        return {
          path: [partIndex],
          timestampPart: part,
        };
      } else if (part.get("type") === "list") {
        return part
          .get("items")
          .map(
            (
              item,
              itemIndex: number,
            ): { path: (string | number)[]; timestampPart: any } | null => {
              let pathAndPart =
                pathAndPartOfTimestampItemWithIdInAttributedString(
                  item.get("contents"),
                  timestampId,
                );
              if (pathAndPart) {
                const { path, timestampPart } = pathAndPart;
                return {
                  path: [partIndex, "items", itemIndex, "contents"].concat(
                    path,
                  ),
                  timestampPart,
                };
              } else {
                let pathAndPart =
                  pathAndPartOfTimestampItemWithIdInAttributedString(
                    item.get("titleLine"),
                    timestampId,
                  );
                if (pathAndPart) {
                  const { path, timestampPart } = pathAndPart;
                  return {
                    path: [partIndex, "items", itemIndex, "titleLine"].concat(
                      path,
                    ),
                    timestampPart,
                  };
                } else {
                  return null;
                }
              }
            },
          )
          .filter((result) => result)
          .first();
      } else if (part.get("type") === "table") {
        return part
          .get("contents")
          .map(
            (
              row: MapOf<OrgTableRow>,
              rowIndex: number,
            ):
              | { path: (string | number)[]; timestampPart: any }
              | null
              | undefined => {
              return row
                .get("contents")
                .map(
                  (
                    cell: MapOf<OrgTableCell>,
                    cellIndex: number,
                  ): {
                    path: (string | number)[];
                    timestampPart: any;
                  } | null => {
                    const pathAndPart =
                      pathAndPartOfTimestampItemWithIdInAttributedString(
                        cell.get("contents"),
                        timestampId,
                      );
                    if (pathAndPart) {
                      const { path, timestampPart } = pathAndPart;
                      return {
                        path: [
                          partIndex,
                          "contents",
                          rowIndex,
                          "contents",
                          cellIndex,
                          "contents",
                        ].concat(path),
                        timestampPart,
                      };
                    } else {
                      return null;
                    }
                  },
                )
                .filter(
                  (
                    result: {
                      path: (string | number)[];
                      timestampPart: any;
                    } | null,
                  ): { path: (string | number)[]; timestampPart: any } | null =>
                    result,
                )
                .first();
            },
          )
          .filter((result) => result)
          .first();
      } else {
        return null;
      }
    })
    .filter((result) => result)
    .first();

export const listPartContainsItemId = (
  listPart: MapOf<OrgList>,
  itemId: number,
): boolean =>
  listPart
    .get("items")
    .some((item: MapOf<OrgListItem>): boolean => item.get("id") === itemId);

export const headerThatContainsListItemId = (
  headers: List<MapOf<OrgHeadline>>,
  listItemId: number,
): MapOf<OrgHeadline> | undefined => {
  const pathAndPart:
    | { path: (string | number)[]; listItemPart: MapOf<OrgListItem> }
    | null
    | undefined = pathAndPartOfListItemWithIdInHeaders(headers, listItemId);
  const headerIndex: number = pathAndPart.path[0];
  return headers.get(headerIndex);
};

export const pathAndPartOfListItemWithIdInAttributedString = (
  parts,
  listItemId: number,
) =>
  parts
    .map((part, partIndex: number) => {
      if (part.get("type") === "list") {
        return part
          .get("items")
          .map(
            (
              item,
              itemIndex: number,
            ): { path: (string | number)[]; listItemPart: any } | null => {
              if (item.get("id") === listItemId) {
                return {
                  path: [partIndex, "items", itemIndex],
                  listItemPart: item,
                };
              } else {
                const pathAndPart =
                  pathAndPartOfListItemWithIdInAttributedString(
                    item.get("contents"),
                    listItemId,
                  );
                if (pathAndPart) {
                  const { path, listItemPart } = pathAndPart;
                  return {
                    path: [partIndex, "items", itemIndex, "contents"].concat(
                      path,
                    ),
                    listItemPart,
                  };
                } else {
                  return null;
                }
              }
            },
          )
          .filter((result) => result)
          .first();
      } else {
        return null;
      }
    })
    .filter((result) => result)
    .first();

export const pathAndPartOfTableContainingCellIdInAttributedString = (
  parts,
  cellId: number,
) =>
  parts
    .map((part, partIndex: number) => {
      if (part.get("type") === "table") {
        if (tablePartContainsCellId(part, cellId)) {
          return { path: [partIndex], tablePart: part };
        } else {
          return null;
        }
      } else if (part.get("type") === "list") {
        return part
          .get("items")
          .map(
            (
              item,
              itemIndex: number,
            ): { path: (string | number)[]; tablePart: any } | null => {
              const pathAndPart =
                pathAndPartOfTableContainingCellIdInAttributedString(
                  item.get("contents"),
                  cellId,
                );
              if (pathAndPart) {
                const { path, tablePart } = pathAndPart;
                return {
                  path: [partIndex, "items", itemIndex, "contents"].concat(
                    path,
                  ),
                  tablePart,
                };
              } else {
                return null;
              }
            },
          )
          .filter((result) => result)
          .first();
      } else {
        return null;
      }
    })
    .filter((result) => result)
    .first();

export const pathAndPartOfListContainingItemIdInHeaders = (
  headers: List<MapOf<OrgHeadline>>,
  itemId: number,
): { path: (string | number)[]; listPart: any } | undefined =>
  headers
    .map(
      (
        header: MapOf<OrgHeadline>,
        headerIndex: number,
      ): { path: (string | number)[]; listPart: MapOf<OrgList> } | null => {
        const pathAndPart = pathAndPartOfListContainingItemIdInAttributedString(
          header.get("description"),
          itemId,
        );
        if (!pathAndPart) {
          return null;
        }

        const { path, listPart } = pathAndPart;
        return {
          path: [headerIndex, "description"].concat(path),
          listPart,
        };
      },
    )
    .filter(
      (
        result: { path: (string | number)[]; listPart: MapOf<OrgList> } | null,
      ): boolean => !!result,
    )
    .first();

export const pathAndPartOfListContainingItemIdInAttributedString = (
  parts,
  itemId: number,
) =>
  parts
    .map((part, partIndex: number) => {
      if (part.get("type") === "list") {
        if (listPartContainsItemId(part, itemId)) {
          return { path: [partIndex], listPart: part };
        } else {
          return part
            .get("items")
            .map(
              (
                item,
                itemIndex: number,
              ): { path: (string | number)[]; listPart: any } | null => {
                const pathAndPart =
                  pathAndPartOfListContainingItemIdInAttributedString(
                    item.get("contents"),
                    itemId,
                  );
                if (!!pathAndPart) {
                  const { path, listPart } = pathAndPart;
                  return {
                    path: [partIndex, "items", itemIndex, "contents"].concat(
                      path,
                    ),
                    listPart,
                  };
                } else {
                  return null;
                }
              },
            )
            .filter((result): boolean => !!result)
            .first();
        }
      } else {
        return null;
      }
    })
    .filter((result): boolean => !!result)
    .first();

export const pathAndPartOfTimestampItemWithIdInHeaders = (
  headers: List<MapOf<OrgHeadline>>,
  timestampId: number,
) => {
  const makeResult = (
    headerIndex: number,
    pathAndPart,
    localPath: string,
  ): { path: (string | number)[]; timestampPart: any } => ({
    path: [headerIndex, ...localPath].concat(pathAndPart.path),
    timestampPart: pathAndPart.timestampPart,
  });

  return headers
    .map((header: MapOf<OrgHeadline>, headerIndex: number) => {
      let localPath: string[] = ["titleLine", "title"];
      let pathAndPart = pathAndPartOfTimestampItemWithIdInAttributedString(
        header.getIn(localPath),
        timestampId,
      );
      if (pathAndPart) return makeResult(headerIndex, pathAndPart, localPath);

      localPath = ["description"];
      pathAndPart = pathAndPartOfTimestampItemWithIdInAttributedString(
        header.getIn(localPath),
        timestampId,
      );
      if (pathAndPart) return makeResult(headerIndex, pathAndPart, localPath);

      localPath = ["logNotes"];
      pathAndPart = pathAndPartOfTimestampItemWithIdInAttributedString(
        header.getIn(localPath),
        timestampId,
      );
      if (pathAndPart) return makeResult(headerIndex, pathAndPart, localPath);

      pathAndPart = header
        .get("propertyListItems")
        .map(
          (
            propertyListItem: MapOf<OrgPropertyListItem>,
            propertyListItemIndex: number,
          ): { path: (string | number)[]; timestampPart: any } | null => {
            if (!propertyListItem.get("value")) {
              return null;
            }

            const plistPathAndPart =
              pathAndPartOfTimestampItemWithIdInAttributedString(
                propertyListItem.get("value"),
                timestampId,
              );
            localPath = ["propertyListItems", propertyListItemIndex, "value"];
            if (plistPathAndPart)
              return makeResult(headerIndex, plistPathAndPart, localPath);

            return null;
          },
        )
        .filter(
          (
            result: { path: (string | number)[]; timestampPart: any } | null,
          ): { path: (string | number)[]; timestampPart: any } | null => result,
        )
        .first();
      if (pathAndPart) {
        return pathAndPart;
      }

      return null;
    })
    .filter((result) => result)
    .first();
};

export const pathAndPartOfListItemWithIdInHeaders = (
  headers: List<MapOf<OrgHeadline>>,
  listItemId: number,
): { path: (string | number)[]; listItemPart: any } | null | undefined =>
  headers
    .map(
      (
        header: MapOf<OrgHeadline>,
        headerIndex: number,
      ): { path: (string | number)[]; listItemPart: any } | null => {
        const pathAndPart = pathAndPartOfListItemWithIdInAttributedString(
          header.get("description"),
          listItemId,
        );
        if (!pathAndPart) {
          return null;
        }

        const { path, listItemPart } = pathAndPart;
        return {
          path: [headerIndex, "description"].concat(path),
          listItemPart,
        };
      },
    )
    .filter(
      (
        result: { path: (string | number)[]; listItemPart: any } | null,
      ): { path: (string | number)[]; listItemPart: any } | null => result,
    )
    .first();

export const pathAndPartOfTableContainingCellIdInHeaders = (
  headers: List<MapOf<OrgHeadline>>,
  cellId: number,
): { path: (string | number)[]; tablePart: any } | null | undefined =>
  headers
    .map(
      (
        header: MapOf<OrgHeadline>,
        headerIndex: number,
      ): { path: (string | number)[]; tablePart: any } | null => {
        const pathAndPart =
          pathAndPartOfTableContainingCellIdInAttributedString(
            header.get("description"),
            cellId,
          );
        if (!pathAndPart) {
          return null;
        }

        const { path, tablePart } = pathAndPart;
        return {
          path: [headerIndex, "description"].concat(path),
          tablePart,
        };
      },
    )
    .filter(
      (
        result: { path: (string | number)[]; tablePart: any } | null,
      ): { path: (string | number)[]; tablePart: any } | null => result,
    )
    .first();

export const updateTableContainingCellId = (
  headers: List<MapOf<OrgHeadline>>,
  cellId: number,
  updaterCallbackGenerator,
): List<MapOf<OrgHeadline>> => {
  const { path, tablePart }: { path: string; tablePart: MapOf<OrgTable> } =
    pathAndPartOfTableContainingCellIdInHeaders(headers, cellId);

  const rowIndexContainingCellId: number = tablePart
    .get("contents")
    .findIndex((row: MapOf<OrgTableRow>): boolean =>
      row
        .get("contents")
        .some(
          (cell: MapOf<OrgTableCell>): boolean => cell.get("id") === cellId,
        ),
    );
  const columnIndexContainingCellId: number = tablePart
    .getIn(["contents", rowIndexContainingCellId, "contents"])
    .findIndex(
      (cell: MapOf<OrgTableCell>): boolean => cell.get("id") === cellId,
    );

  return headers.updateIn(
    path.concat(["contents"]),
    updaterCallbackGenerator(
      rowIndexContainingCellId,
      columnIndexContainingCellId,
    ),
  );
};

export const newEmptyTableRowLikeRows = (
  rows: List<MapOf<OrgTableRow>>,
): MapOf<OrgTableRow> =>
  rows
    .get(0)
    .set("id", generateId())
    .update(
      "contents",
      (contents: List<MapOf<OrgTableCell>>): List<MapOf<OrgTableCell>> =>
        contents.map(
          (cell: MapOf<OrgTableCell>): MapOf<OrgTableCell> =>
            cell
              .set("id", generateId())
              .set("type", "table-row")
              .set("contents", List())
              .set("rawContents", ""),
        ),
    );

export const newEmptyTableCell = (): MapOf<OrgTableCell> =>
  Map({
    id: generateId(),
    type: "table-cell",
    contents: List(),
    rawContents: "",
  });

export const newListPart = (): MapOf<OrgList> =>
  Map({
    type: "list",
    id: generateId(),
    items: List(),
    bulletCharacter: "-",
    numberTerminatorCharacter: null,
    isOrdered: false,
  });

export const newListPartLikePart = (part) =>
  part.set("id", generateId()).set("items", new List());

export const newListItem = (): Map<
  "id" | "titleLine" | "contents" | "forceNumber" | "isCheckbox",
  unknown
> =>
  fromJS({
    id: generateId(),
    titleLine: [],
    contents: [],
    forceNumber: null,
    isCheckbox: false,
  });

export const parentListItemWithIdInHeaders = (
  headers: List<MapOf<OrgHeadline>>,
  listItemId: number,
): unknown => {
  const pathAndPart:
    | { path: (string | number)[]; listItemPart: MapOf<OrgListItem> }
    | null
    | undefined = pathAndPartOfListItemWithIdInHeaders(headers, listItemId);
  let { path } = pathAndPart;
  return headers.getIn(path.slice(0, path.length - 4));
};

export const updateListContainingListItemId = (
  headers: List<MapOf<OrgHeadline>>,
  listItemId: number,
  updaterCallbackGenerator,
): List<MapOf<OrgHeadline>> => {
  const { path, listPart } = pathAndPartOfListContainingItemIdInHeaders(
    headers,
    listItemId,
  );

  const itemIndexContainingId: number = listPart
    .get("items")
    .findIndex((item): boolean => item.get("id") === listItemId);

  return headers.updateIn(
    path.concat(["items"]),
    updaterCallbackGenerator(itemIndexContainingId),
  );
};

export const updateContentsWithListItemAddition = (
  parts,
  listItem: MapOf<OrgListItem>,
  listPart: null = null,
) => {
  if (parts.size === 0 || parts.last().get("type") !== "list") {
    const insertIdx = parts.size;
    if (!!listPart) {
      parts = parts.insert(insertIdx, newListPartLikePart(listPart));
    } else {
      parts = parts.insert(insertIdx, newListPart());
    }
  }

  return parts.map((part) => {
    switch (part.get("type")) {
      case "list":
        return part.update("items", (items) => items.push(listItem));
      default:
        return part;
    }
  });
};

export const timestampWithIdInAttributedString = (
  parts,
  timestampId: number,
) => {
  if (!parts) {
    return null;
  }

  const pathAndPart = pathAndPartOfTimestampItemWithIdInAttributedString(
    parts,
    timestampId,
  );
  if (pathAndPart) {
    return pathAndPart.timestampPart;
  } else {
    return null;
  }
};

export const timestampWithId = (
  headers: List<MapOf<OrgHeadline>>,
  timestampId: number,
) =>
  headers
    .map(
      (header: MapOf<OrgHeadline>) =>
        timestampWithIdInAttributedString(
          header.getIn(["titleLine", "title"]),
          timestampId,
        ) ||
        timestampWithIdInAttributedString(
          header.get("description"),
          timestampId,
        ) ||
        timestampWithIdInAttributedString(
          header.get("logNotes"),
          timestampId,
        ) ||
        header
          .get("propertyListItems")
          .map((propertyListItem: MapOf<OrgPropertyListItem>) =>
            timestampWithIdInAttributedString(
              propertyListItem.get("value"),
              timestampId,
            ),
          )
          .filter((result) => result)
          .first(),
    )
    .find((result) => result);

export const customFormatDistanceToNow = (datetime: Date): string => {
  return formatDistanceToNow(datetime, { addSuffix: true });
};

export const todoKeywordSetForKeyword = (
  todoKeywordSets: List<MapOf<FileSetting>>,
  keyword: string,
): MapOf<FileSetting> | undefined =>
  todoKeywordSets.find((keywordSet: MapOf<FileSetting>) =>
    keywordSet.get("keywords").contains(keyword),
  ) || todoKeywordSets.first();

export const isTodoKeywordCompleted = (
  todoKeywordSets: List<MapOf<FileSetting>>,
  keyword: string,
): boolean | undefined =>
  todoKeywordSetForKeyword(todoKeywordSets, keyword)
    ?.get("completedKeywords")
    .includes(keyword);

export const extractAllOrgTags = (
  headers: List<MapOf<OrgHeadline>>,
): Set<unknown> & OrderedSet<unknown> =>
  headers
    .flatMap((h: MapOf<OrgHeadline>): never => h.getIn(["titleLine", "tags"]))
    .toSet()
    .sort();

export const extractAllOrgProperties = (
  headers: List<MapOf<OrgHeadline>>,
): Collection<unknown, unknown> =>
  headers
    .map((h: MapOf<OrgHeadline>): List<any[]> => {
      const propertyList: List<MapOf<OrgPropertyListItem>> =
        h.get("propertyListItems");
      return propertyList.map((property: MapOf<OrgPropertyListItem>): any[] => {
        const prop: string = property.get("property");
        const valParts: List<MapOf<OrgText> | MapOf<OrgTimestamp> | null> =
          property.get("value"); // lineParts, see parser
        const val = attributedStringToRawText(valParts);
        return [prop, val];
      });
    })
    .filter((x: List<any[]>): boolean => !x.isEmpty())
    .flatten();

export const computeAllPropertyNames = (allOrgProperties) =>
  allOrgProperties
    .map(([x]: []): undefined => x)
    .toSet()
    .sort();

export const computeAllPropertyValuesFor = (
  allOrgProperties,
  propertyName: string,
) =>
  // toLowerCase() because property names (keys) are case-insensitive:
  // https://orgmode.org/manual/Property-Syntax.html
  allOrgProperties
    .filter(
      ([x]: [string]): boolean =>
        x.toLowerCase() === propertyName.toLowerCase(),
    )
    .map(([_, y]: []): undefined => y)
    .toSet()
    .sort();

/**
 * Returns `true` if the header has content, i.e. description.
 * Subheaders do not count as content.
 */
export const hasHeaderContent = (
  header: MapOf<OrgHeadline>,
): string | boolean =>
  header.get("rawDescription") ||
  !header.get("planningItems").isEmpty() ||
  !header.get("propertyListItems").isEmpty() ||
  !header.get("logNotes").isEmpty() ||
  !header.get("logBookEntries").isEmpty();

/**
 * Returns a function which takes a `todoKeyword` which then returns
 * if said `todoKeyword` is in any `todoKeywordSets` states.
 * @param {Object} todoKeywordSets
 */
export const createIsTodoKeywordInDoneState = (
  todoKeywordSets: List<MapOf<FileSetting>>,
): ((todoKeyword: any) => boolean) => {
  return (todoKeyword): boolean =>
    todoKeywordSets.some((x: MapOf<FileSetting>) =>
      x.get("completedKeywords").includes(todoKeyword),
    );
};

// Regular planning items in org are written directly below headline and have type SCHEDULED, DEADLINE, CLOSED.
export const isRegularPlanningItem = (x): boolean =>
  !x.get("type").startsWith("TIMESTAMP_");

export const getPlanningItemTypeText = (
  planningItem: MapOf<OrgPlanningItem>,
): OrgPlanningItemType | "TIMESTAMP" =>
  isRegularPlanningItem(planningItem) ? planningItem.get("type") : "TIMESTAMP";

export const getTodoKeywordSetsAsFlattenedArray = (state: State) => {
  return state
    .get("todoKeywordSets")
    .flatMap((todoKeywordSet: MapOf<OrgTodoKeywordSet>): List<string> => {
      return todoKeywordSet.get("keywords");
    })
    .toSet()
    .toJS();
};

/** Regular expression of file extensions to validate a filename. */
export const orgFileExtensions: RegExp = /\.org(_archive)?$/;

const addBreadcrumbs = (
  headers: List<MapOf<OrgHeadline>>,
  breadcrumbs,
  headerId: number,
) => {
  const parent: MapOf<OrgHeadline> | null | undefined =
    directParentOfHeaderWithId(headers, headerId);
  if (!parent) {
    return breadcrumbs;
  }
  breadcrumbs.unshift(parent.get("titleLine").get("rawTitle"));
  return addBreadcrumbs(headers, breadcrumbs, parent.get("id"));
};

const getBreadcrumbs = (
  headers: List<MapOf<OrgHeadline>>,
  headerId: number,
) => {
  return addBreadcrumbs(headers, [], headerId);
};

export const getBreadcrumbsStringFunction = (
  allHeaders,
  path: string,
): ((header: MapOf<OrgHeadline>) => any) => {
  const allHeadersOfFile = allHeaders.get(path);

  let filename;
  if (path.startsWith(STATIC_FILE_PREFIX)) {
    filename = path.substring(STATIC_FILE_PREFIX.length);
  } else if (path.endsWith(".org")) {
    filename = path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
  } else {
    filename = path.substring(path.lastIndexOf("/") + 1);
  }

  return (header: MapOf<OrgHeadline>) => {
    let breadcrumbs = getBreadcrumbs(allHeadersOfFile, header.get("id"));
    breadcrumbs.unshift(filename);
    const maxBreadcrumbLength: number = Math.max(
      3,
      Math.floor((80 - 3 * breadcrumbs.length) / breadcrumbs.length),
    );
    breadcrumbs = breadcrumbs.map((b) =>
      b.length > maxBreadcrumbLength
        ? b.substr(0, maxBreadcrumbLength - 2) + ".."
        : b,
    );
    return breadcrumbs.join(" > ");
  };
};

export const getTable = curry(
  (
    {
      filePath,
      headerIndex,
      descriptionItemIndex,
    }: {
      filePath: string;
      headerIndex: number;
      descriptionItemIndex: number;
    },
    state: State,
  ): MapOf<OrgTable> => {
    return state.org.present.getIn([
      "files",
      filePath,
      "headers",
      headerIndex,
      "description",
      descriptionItemIndex,
    ]);
  },
);

export const getSelectedTable = (state: State): MapOf<OrgTable> => {
  const filePath: string = state.org.present.get("path");
  const file: MapOf<OrgFile> = state.org.present.getIn(
    ["files", filePath],
    Map(),
  );
  const headerIndex: number = file.get("selectedHeaderIndex");
  const descriptionItemIndex: number = file.get("selectedDescriptionItemIndex");
  return getTable({ filePath, headerIndex, descriptionItemIndex }, state);
};

export const getTableCell = curry(
  (
    {
      filePath,
      headerIndex,
      descriptionItemIndex,
      row,
      column,
    }: {
      filePath: string;
      headerIndex: number;
      descriptionItemIndex: number;
      row: MapOf<OrgTableRow>;
      column: number;
    },
    state: State,
  ): never => {
    const table: MapOf<OrgTable> = getTable(
      { filePath, headerIndex, descriptionItemIndex },
      state,
    );
    return table.getIn(["contents", row, "contents", column]);
  },
);
