import { expect, assert } from "vitest";
import {
  chunk,
  forEach,
  pipe,
  curry,
  map,
  spread,
  split,
  startsWith,
  endsWith,
  zipWith,
  mean,
} from "lodash/fp";
import { convertArrayToSetThenGetSize } from "../src/util/transformers";

export const convertToSet = <T>(collection: Array<T>): Set<T> => {
  return new Set(collection);
};

export const convertArrayOfArraysToArrayOfSets = map(convertToSet);

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

export const assertNumbers = map(assert.isNumber);
export const assertStrings = map(assert.isString);

export const assertIsDate = (value: any): void => {
  assert.instanceOf(value, Date);
};

export const assertDates = map(assertIsDate);

export const assertIsSubset = curry(
  <T>(actualSet: Set<T>, expectedSuperset: Set<T>): void => {
    expect(actualSet.isSubsetOf(expectedSuperset)).toBeTruthy();
  },
);

export const assertIsDisjointFrom = curry(
  <T>(actualSet: Set<T>, expectedDisjointSet: Set<T>): void => {
    expect(actualSet.isDisjointFrom(expectedDisjointSet)).toBeTruthy();
  },
);

export const assertIntersection = curry(
  <T>(
    [actualSet, expectedSet]: [Set<T>, Set<T>],
    expectedIntersection: Set<T>,
  ): void => {
    expect(actualSet.intersection(expectedSet)).toStrictEqual(
      expectedIntersection,
    );
  },
);

export const assertIntegerInRangeInclusive = curry(
  ([min, max]: [number, number], integer: number) => {
    expect(integer).toBeGreaterThanOrEqual(min);
    expect(integer).toBeLessThanOrEqual(max);
  },
);

export const convertArraysToSetsAndAssertIsSubset = pipe([
  convertArrayOfArraysToArrayOfSets,
  spread(assertIsSubset),
]);

export const splitOnSpacesAndConvertToSet = pipe([split(" "), convertToSet]);

export const assertContainsSubstrings = curry(
  (string: string, substrings: Array<string>) => {},
);

export const assertStartsWith = (substring: string, string: string): void => {
  expect(startsWith(substring, string)).toBeTruthy();
};

export const assertEndsWith = (substring: string, string: string): void => {
  expect(endsWith(substring, string)).toBeTruthy();
};

export const zipWithAssertEqual = zipWith(
  (actual: any, expected: any): void => {
    expect(actual).toEqual(expected);
  },
);

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

export const assertSubset = <T>([expectedSubset, expectedSuperset]: [
  Set<T>,
  Set<T>,
]) => {
  expect(expectedSubset.isSubsetOf(expectedSuperset)).toBeTruthy();
};

export const convertArraysToSetsAndAssertSubset = pipe([
  convertArrayOfArraysToArrayOfSets,
  assertSubset,
]);

export const assertArrayOfIntegersInRangeInclusive = curry(
  (range: [number, number], integers: Array<number>) => {
    forEach(assertIntegerInRangeInclusive(range))(integers);
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
    forEach(assertIntegerInRangeExclusive(range))(integers);
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
