import { expect as baseExpect } from "vitest";
import matchers from "@testing-library/jest-dom/matchers";

export const expect = baseExpect.extend(matchers);
