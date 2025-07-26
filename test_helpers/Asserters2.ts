import { expect, assert } from "vitest";
import { chunk,
  forEach,
  pipe,
  curry,
  map,
  spread,
  split,
  startsWith,
  endsWith,
  zipWith
} from "lodash/fp";
import {
  getYearMonthDayAndDayNameFromTimestampObject
} from "../lib/timestamps"


export const convertToSet = <T>(collection: Array<T>): Set<T> => {
  return new Set(collection);
};


export const convertArrayOfArraysToArrayOfSets = map(convertToSet)

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

export const assertNumbers = map(assert.isNumber)

export const assertIsDate = (value: any): void => {
  assert.instanceOf(value, Date)
}

export const assertDates = map(assertIsDate)
export const assertIsSubset = curry(<T>(actualSet: Set<T>, expectedSuperset: Set<T>): void => {
  expect(actualSet.isSubsetOf(expectedSuperset)).toBeTruthy();
})

export const assertIsDisjointFrom = curry(<T>(actualSet: Set<T>, expectedDisjointSet: Set<T>): void => {
  expect(actualSet.isDisjointFrom(expectedDisjointSet)).toBeTruthy();
})

export const assertIntersection = curry(<T>([actualSet, expectedSet]: [Set<T>, Set<T>], expectedIntersection: Set<T>): void => {
  expect(actualSet.intersection(expectedSet)).toStrictEqual(expectedIntersection);
})

export const assertIntegerInRangeInclusive = curry(
  ([min, max]: [number, number], integer: number) => {
    expect(integer).toBeGreaterThanOrEqual(min);
    expect(integer).toBeLessThanOrEqual(max);
  },
);



export const convertArraysToSetsAndAssertIsSubset = pipe([
  convertArrayOfArraysToArrayOfSets,
  spread(assertIsSubset)
]);

export const splitOnSpacesAndConvertToSet = pipe([split(" "), convertToSet])

export const assertYearMonthDayAndDayOfWeekTimestampObject = pipe([getYearMonthDayAndDayNameFromTimestampObject, assertNumbers])

export const assertYearMonthDayAndDayOfWeekofArrayOfTimestampObjects = map(assertYearMonthDayAndDayOfWeekTimestampObject)

export const assertContainsSubstrings = curry((string: string, substrings: Array<string>) => {
  
})

export const assertStartsWith = (substring: string, string: string,): void => {
  expect(startsWith(substring, string)).toBeTruthy();
}
export const assertEndsWith = (substring: string, string: string,): void => {
  expect(endsWith(substring, string)).toBeTruthy();
}

export const zipWithAssertEqual = zipWith((actual: any, expected: any): void => {
  expect(actual).toEqual(expected)
})
