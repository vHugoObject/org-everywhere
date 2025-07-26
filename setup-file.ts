import { inRange, merge } from "lodash/fp"
import type { ExpectStatic } from "vitest";
import { expect as baseExpect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers"

export function toBeWithinRange(actual: number, floor: number, ceiling: number) {
  const pass = actual >= floor && actual <= ceiling;
  if (pass) {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual,
        )} not to be within range ${this.utils.printExpected(
          `${floor} - ${ceiling}`,
        )}`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected ${this.utils.printReceived(
          actual,
        )} to be within range ${this.utils.printExpected(
          `${floor} - ${ceiling}`,
        )}`,
      pass: false,
    };
  }
}

export const betweenZeroAnd255 = (received: number, _: number) => {
     return {
       pass: inRange(0,255,received),
       message: () => `expected ${received} to be in range 255`,
     }
}

export const betweenZeroAndOne = (received: number, _: number) => {
  return {
       pass: inRange(0,1,received),
       message: () => `expected ${received} to be in range 255`,
     }
} 

export const customMatchers = {
  betweenZeroAnd255,
  betweenZeroAndOne,
  toBeWithinRange
};

export const expect = baseExpect.extend(merge(customMatchers, matchers))
