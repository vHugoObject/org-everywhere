import { chunk, forEach, pipe, curry, map, mean, inRange } from "lodash/fp";
import { expect, assert } from "vitest";
import {
  convertArrayOfArraysToArrayOfSets,
  convertArrayToSetThenGetSize,
} from "../src/util/transformers"


export const pairIntegersAndAssertEqual = pipe([
  chunk(2),
  forEach(([actual, expected]: [number, number]) => {
    expect(actual).toEqual(expected);
  }),
]);

export const pairStringsAndAssertEqual = pipe([
  chunk(2),
  forEach(([actual, expected]: [number, number]) => {
    expect(actual).toBe(expected);
  }),
]);

export const pairSetsAndAssertStrictEqual = pipe([
  chunk(2),
  forEach(([actual, expected]: [Set<any>, Set<any>]) => {
    expect(actual).toStrictEqual(expected);
  }),
]);

export const convertArraysToSetsAndAssertStrictEqual = pipe([
  convertArrayOfArraysToArrayOfSets,
  pairSetsAndAssertStrictEqual,
]);

export const assertSubset = <T>([expectedSubset, expectedSuperset]: [Set<T>, Set<T>]) => {
  expect(expectedSubset.isSubsetOf(expectedSuperset)).toBeTruthy();
}

export const convertArraysToSetsAndAssertSubset = pipe([
  convertArrayOfArraysToArrayOfSets,
  assertSubset
])

export const assertIntegerInRangeInclusive = curry(
  ([min, max]: [number, number], integer: number) => {
    expect(integer).toBeGreaterThanOrEqual(min);
    expect(integer).toBeLessThanOrEqual(max);
  },
);

export const assertArrayOfIntegersInRangeInclusive = curry(
  (range: [number, number], integers: Array<number>) => {
    map(assertIntegerInRangeInclusive(range))(integers);
  },
);


export const assertIntegerInRangeExclusive = curry(
  ([min, max]: [number, number], integer: number) => {
    expect(integer).toBeGreaterThanOrEqual(min);
    expect(integer).toBeLessThan(max);
  },
);

export const assertArrayOfIntegersInRangeExclusive = curry(
  (range: [number, number], integers: Array<number>) => {
    map(assertIntegerInRangeExclusive(range))(integers);
  },
);

export const assertMeanInRangeExclusive = curry(
  (range: [number, number], integers: Array<number>): void => {
    pipe([mean, assertIntegerInRangeExclusive(range)])(integers);
  },
);

export const parseIntAndAssert = curry(
  (asserter: Function, range: [number, number], integerAsString: string) => {
    return pipe([parseInt, asserter(range)])(integerAsString);
  },
);

export const parseIntAndAssertIntegerInRangeInclusive = parseIntAndAssert(
  assertIntegerInRangeInclusive,
);
export const parseIntAndAssertIntegerInRangeExclusive = parseIntAndAssert(
  assertIntegerInRangeExclusive,
);

export const assertAllArrayValuesAreUnique = <T>(array: Array<T>) => {
  expect(array.length).toEqual(convertArrayToSetThenGetSize(array));
};

export const assertNumbers = map(assert.isNumber);
