import { describe, expect } from "vitest";
import { test } from "@fast-check/vitest";
import {
  dropboxDirectoryListing,
  dropboxDirectoryListingSorted,
} from "./fixtures/directory_listing";
import { filterAndSortDirectoryListing } from "./dropbox_sync_backend_client";

test("Filters down to Org files and orders alphabetically", () => {
  expect(filterAndSortDirectoryListing(dropboxDirectoryListing)).toEqual(
    dropboxDirectoryListingSorted,
  );
});
