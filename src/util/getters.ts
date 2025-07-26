import {
  sum,
  map,
  last,
  takeRight,
  take,
  min,
  max,
  flatten,
  pipe,
  compact,
  property,
  flatMapDepth,
  size,
  over,
  first,
  isEqual,
  isString,
  isInteger,
  isBoolean,
  countBy,
  identity,
  curry,
  filter,
  isArray,
  startsWith,
  reverse,
  uniq,
  isNumber,
  tail,
  partialRight,
  inRange,
  chunk,
  lt,
  spread,
  subtract,
  add,
  multiply,
  divide
} from "lodash/fp";

export const isTrue = isEqual(true);
export const isFalse = isEqual(false);

export const countByIdentity = countBy(identity);
export const countByStartsWith = countBy(startsWith);

export const getFirstAndTailOfArray = over([first, tail]);
export const getSizeMinAndMaxOfArray = over([size, min, max]);
export const getSizeOfFlattenedArray = pipe([flatten, size]);

export const getFirstLevelArrayLengths = map(size);
export const getFirstLevelArrayMinValues = map(min);
export const getFirstLevelArrayMaxValues = map(max);

export const getSecondArrayValue = property([1]);
export const getSecondArrayValuesOfNestedArrays = map(getSecondArrayValue);
export const getSizeOfCompactedArray = pipe([compact, size]);
export const getFirstLevelArrayLengthsAsSet = pipe([getFirstLevelArrayLengths]);
export const getSecondLevelArrayLengths = pipe([flatMapDepth(map(size), 2)]);

export const getFirstAndLastItemsOfArray = over([first, last]);
export const getMinAndMaxOfArray = over([min, max]);

export const getLastTwoArrayValues = takeRight(2);
export const getFirstTwoArrayValues = take(2);
export const getSumOfFlattenedArray = pipe([flatten, sum]);

export const getCountOfObjectKeys = pipe([Object.keys, size]);
export const getCountOfObjectValues = pipe([Object.values, size]);


export const getCountOfItemsFromArrayForPredicateWithTransformation = curry(
  <T, V>(
    transformation: (args: Array<T>) => V,
    predicate: (arg: V) => boolean,
    array: Array<T>,
  ): number => {
    return pipe([filter(predicate), transformation, size])(array);
  },
);

export const getCountOfItemsFromArrayForPredicate = curry(
  getCountOfItemsFromArrayForPredicateWithTransformation(identity),
);

export const getCountOfUniqueItemsFromArrayForPredicate = curry(
  getCountOfItemsFromArrayForPredicateWithTransformation(uniq),
);

export const betweenZeroAndOne = inRange(0, 1);
export const getCountOfFloatsBetweenZeroAndOne = pipe([
  filter(betweenZeroAndOne),
  size,
]);

export const getCountOfStringsFromArray =
  getCountOfItemsFromArrayForPredicate(isString);
export const getCountOfIntegersFromArray =
  getCountOfItemsFromArrayForPredicate(isInteger);

export const getCountOfNumbersFromArray =
  getCountOfItemsFromArrayForPredicate(isNumber); // includes doubles
export const getCountOfArraysFromArrays =
  getCountOfItemsFromArrayForPredicate(isArray);
export const getCountOfBooleansFromArray =
  getCountOfItemsFromArrayForPredicate(isBoolean);
export const getCountOfTrueFromArray =
  getCountOfItemsFromArrayForPredicate(isTrue);
export const getCountOfFalseFromArray =
  getCountOfItemsFromArrayForPredicate(isTrue);
export const getCountOfStringsFromFlattenedArray = pipe([
  flatten,
  getCountOfStringsFromArray,
]);

export const getCountOfUniqueStringsFromArray =
  getCountOfUniqueItemsFromArrayForPredicate(isString);
export const getCountOfUniqueIntegersFromArray =
  getCountOfUniqueItemsFromArrayForPredicate(isInteger);
export const getCountOfItemsFromArrayThatStartWithX = curry(
  (prefix: string, array: Array<string>) =>
    pipe([
      startsWith,
      partialRight(getCountOfItemsFromArrayForPredicate, [array]),
    ])(prefix),
);

export const getCountOfItemsFromArrayThatAreGreaterThanZero = getCountOfItemsFromArrayForPredicate(lt(0))

export const getCountOfItemsForPredicatePerArrayChunk = curry(
  <T>(
    predicate: (arg: T) => boolean,
    chunkSize: number,
    array: Array<T>,
  ): Array<number> => {
    return pipe([
      chunk(chunkSize),
      map(getCountOfItemsFromArrayForPredicate(predicate)),
    ])(array);
  },
);

export const getCountOfUniqueItemsPerArrayChunk = curry(<T>(chunkSize: number,
  array: Array<T>): Array<number> => {
    return pipe([
      chunk(chunkSize),
      map(pipe([uniq, size])),      
    ])(array)
})

export const getLengthOfLinearRange = pipe([
  pipe([reverse, spread(subtract)]),
  add(-1)
]);

export const getRangeStep = curry((range: [number, number], cycles: number, itemsCount: number): number => {
  return pipe([
    getLengthOfLinearRange,
    multiply(cycles),
    partialRight(divide, [itemsCount]),
  ])(range)
})

