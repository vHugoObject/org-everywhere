import React from "react";
import { fc, test } from "@fast-check/vitest";
import { describe } from "vitest";
import { renderWithRouter } from "../../../test_helpers/index";
import Turnout from "./index";

describe("Turnout", async () => {
  test.skip.prop([fc.gen()])("isAuthenticated = true", async (fcGen) => {
    const screen = renderWithRouter(<Turnout isAuthenticated={true} />);
  });
});
