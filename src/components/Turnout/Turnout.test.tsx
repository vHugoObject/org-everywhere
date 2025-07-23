import { fc, test } from "@fast-check/vitest";
import { describe, expect, afterEach, vi } from "vitest";
import { renderWithRouter, setup } from "../../../test_helpers/index"
import Turnout from "./index"

describe("Turnout", async () => {
  test.prop([fc.gen()])(
    "isAuthenticated = true",
    async (fcGen) => {
      const screen = renderWithRouter(<Turnout isAuthenticated={true} />)
      
    },
  );
})
