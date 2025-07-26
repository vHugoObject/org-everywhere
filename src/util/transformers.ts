import {
  pipe,
  concat,
  map,
  flatten,
  curry,
  over,
  identity,
  add,
  first,
  last,
  split,
  shuffle,
  reduce,
  sum,
  join,
  zipAll,
  zipObject,
  zipWith,
  initial,
  flatMap,
  spread,
  reverse,
  property,
  subtract,
  max,
  findIndex,
  divide,
  min,
  chunk,
  sortBy,
  every,
  size,
  inRange,
  partialRight,
  floor,
  multiply
} from "lodash/fp";
import {
  addDays,
  subDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns/fp";


export const mapSum = map(sum);

export const convertToSet = <T>(collection: Array<T>): Set<T> => {
  return new Set(collection);
};

export const convertToList = <T>(object: T): Array<T> => {
  return new Array(object);
};

export const convertArrayChunksIntoSets = pipe([chunk, map(convertToSet)]);

export const subString = curry((start: number, end: number, string: string) => {
  const stringer = Function.prototype.call.bind(String.prototype.substring);
  return stringer(string, start, end);
});

export const convertArrayToSetThenGetSize = pipe([convertToSet, size]);
export const isEveryIntegerInRange = curry(
  ([start, end]: [number, number], arrayOfIntegers: Array<number>): Boolean => {
    return every(inRange(start, end), arrayOfIntegers);
  },
);

export const sortByIdentity = sortBy(identity);
export const sortTuplesByFirstValueInTuple = sortBy(first);

export const unfold = curry(
  <T>(unfolder: (index: number) => T, arraySize: number): Array<T> => {
    return Array.from({ length: arraySize }, (_, index: number) =>
      unfolder(index),
    );
  },
);

export const unfoldItemCountTupleIntoArray = curry(
  <T>([item, count]: [T, number]): Array<T> => {
    return Array(count).fill(item);
  },
);

export const unfoldCountStartingIndexIntoRange = curry(
  (count: number, startingIndex: number): Array<number> => {
    return unfold(add(startingIndex), count);
  },
);

export const unfoldIntoObject = pipe([unfold, Object.fromEntries]);
export const spreadUnfold = spread(unfold);
export const mapSpreadUnfold = map(spreadUnfold);
export const flatMapSpreadUnfold = flatMap(spreadUnfold);
export const unfoldAndShuffleArray = curry(
  <T>(arraySize: number, unfolder: (index: number) => T): Array<T> => {
    return pipe([unfold, shuffle])(unfolder, arraySize);
  },
);

export const unfoldItemCountTuplesIntoTupleOfArrays = map(
  unfoldItemCountTupleIntoArray,
);

export const unfoldItemCountTuplesIntoMixedArray = flatMap(
  unfoldItemCountTupleIntoArray,
);

export const unfoldBooleanCountTuplesIntoArrayOfBooleans = pipe([
  unfoldItemCountTuplesIntoMixedArray,
  map(Boolean),
]);

export const unfoldBooleanCountTuplesIntoShuffledArrayOfBooleans = pipe([
  unfoldBooleanCountTuplesIntoArrayOfBooleans,
  shuffle,
]);


export const apply = <T>(func: (arg: T) => T, arg: T) => func(arg);

export const zipApply = zipWith(apply);
export const spreadZipApply = spread(zipApply);

export const spreadZipObject = spread(zipObject);
export const zipAdd = zipWith<number, number, number>(add);

export const zipChunk = zipWith(chunk);
export const spreadZipChunk = spread(zipChunk);

export const zipAllAndTransformXArrayWithY = curry(
  <T, V>(
    [getter, transformer]: [(arg: Array<T>) => T, (arg: Array<T>) => V],
    array: Array<Array<T>>,
  ): V => {
    return pipe([zipAll, getter, transformer])(array);
  },
);

export const zipAllAndGetFirstArray = zipAllAndTransformXArrayWithY([
  first,
  identity,
]);
export const zipAllAndGetInitial = zipAllAndTransformXArrayWithY([
  initial,
  identity,
]);
export const zipAllAndGetSecondArray = zipAllAndTransformXArrayWithY([
  property([1]),
  identity,
]);
export const zipAllAndGetLastArray = zipAllAndTransformXArrayWithY([
  last,
  identity,
]);

export const zipAllAndGetSumOfFirstArray = zipAllAndTransformXArrayWithY([
  first,
  sum,
]);
export const zipAllAndGetSumOfSecondArray = zipAllAndTransformXArrayWithY([
  property([1]),
  sum,
]);
export const zipAllAndGetSumOfLastArray = zipAllAndTransformXArrayWithY([
  last,
  sum,
]);

export const zipAllAndGetMinOfFirstArray = zipAllAndTransformXArrayWithY([
  first,
  min,
]);
export const zipAllAndGetMinOfSecondArray = zipAllAndTransformXArrayWithY([
  property([1]),
  min,
]);
export const zipAllAndGetMinOfLastArray = zipAllAndTransformXArrayWithY([
  last,
  min,
]);

export const zipAllAndGetSizeOfFirstArray = zipAllAndTransformXArrayWithY([
  first,
  size,
]);

export const zipAllAndGetFirstArrayAsSet = zipAllAndTransformXArrayWithY([
  first,
  convertToSet,
]);

export const convertConcatenatedArraysIntoSet = pipe([concat, convertToSet]);
export const convertFlattenedArrayIntoSet = pipe([flatten, convertToSet]);
export const convertArrayOfArraysToArrayOfSets = map(convertToSet);
export const convertArrayOfIntegersIntoArrayOfStrings = map(toString);
export const convertArrayOfStringsIntoArrayOfIntegers = map(parseInt);
export const calculateTheSumOfArrayOfStringIntegers = pipe([
  convertArrayOfStringsIntoArrayOfIntegers,
  sum,
]);

export const mapFlatten = map(flatten);
export const convertArrayOfArraysIntoShuffledArray = pipe([flatten, shuffle]);

export const convertRangeSizeAndMinIntoRange = curry(
  (rangeSize: number, rangeMin: number): [number, number] => {
    return over<number>([identity, pipe([add(rangeSize), add(1)])])(
      rangeMin,
    ) as [number, number];
  },
);

export const convertArrayIntoLinearRange = pipe([
  Object.keys,
  over([first, last]),
  convertArrayOfStringsIntoArrayOfIntegers,
]);

export const foldArrayOfArraysIntoArrayOfLinearRanges = map(
  convertArrayIntoLinearRange,
);

export const convertObjectKeysIntoSet = pipe([Object.keys, convertToSet]);

export const zipDivide = zipWith(divide);
export const spreadZipDivide = spread(zipDivide);
export const spreadDivide = spread(divide);
export const divideByTwo = partialRight(divide, [2])

export const spreadMultiply = spread(multiply);
export const spreadAdd = spread(add);
export const addOne = add(1);
export const minusOne = add(-1);
export const multiplyByTwo = multiply(2);
export const half = partialRight(divide, [2])
export const convertIntegerToPercentage = multiply(0.01);
export const convertIntegersToPercentages = map(convertIntegerToPercentage);
export const addMinusOne = curry((intOne: number, intTwo: number) =>
  pipe([add, minusOne])(intOne, intTwo),
);
export const addPlusOne = curry((intOne: number, intTwo: number) =>
  pipe([add, addOne])(intOne, intTwo),
);
export const spreadThenSubtract = spread(subtract);
export const reverseThenSpreadSubtract = pipe([reverse, spreadThenSubtract]);
export const mod = curry(
  (divisor: number, dividend: number): number => dividend % divisor,
);
export const getBaseLog = curry((baseLog: number, of: number) => {
  return Math.log(of) / Math.log(baseLog);
});


export const accumulate = curry(
  <T>([func, initial]: [Function, T], array: Array<T>): Array<T> => {
    return reduce(
      (previous: Array<T>, current: any): Array<T> => {
        return concat(previous, func(current, last(previous) || initial));
      },
      [],
      array,
    );
  },
);

export const getRunningSumOfList = accumulate([add, 0]);
export const multiplyAccumulate = accumulate([multiply, 1]);
export const spreadMultiplyAccumulate = pipe([multiplyAccumulate, last]);

export const adjustRangeByPercentage = curry(
  (range: [number, number], percentage: number) => {
    return map(pipe([multiply(percentage), floor]))(range);
  },
);

export const normalizeArrayOfNumbers = (
  percentages: Array<number>,
): Array<number> => {
  const sumOfPercentages: number = sum(percentages);
  return map((percent: number): number => percent / sumOfPercentages)(
    percentages,
  );
};

export const weightedMean = curry(
  (arrWeights: Array<number>, arrValues: Array<number>): number => {
    return pipe([
      normalizeArrayOfNumbers,
      over([pipe([zipWith(multiply, arrValues), sum]), sum]),
      ([totalOfValues, totalOfWeights]: [number, number]) =>
        totalOfValues / totalOfWeights,
    ])(arrWeights);
  },
);

export const weightedRandom = <T>([weights, items]: [
  Array<number>,
  Array<T>,
]): T => {
  return pipe([
    normalizeArrayOfNumbers,
    getRunningSumOfList,
    max,
    multiply(Math.random()),
    (randomNumber: number): number =>
      findIndex((weight: number) => weight >= randomNumber)(weights),
    (randomIndex: number): T => items.at(randomIndex),
  ])(weights);
};

export const sumOfAnArithmeticSeries = (lastNumberInSeries: number): number => {
  return lastNumberInSeries * ((lastNumberInSeries + 1) / 2);
};

export const simpleModularArithmetic = curry(
  (
    arithmeticFunction: (arg: number) => number,
    rangeMax: number,
    num: number,
  ): number => {
    return arithmeticFunction(num) % rangeMax;
  },
);

export const modularAddition = simpleModularArithmetic(addOne);
export const modularSubtraction = simpleModularArithmetic(minusOne);

export const nonZeroBoundedModularAddition = curry(
  (
    [rangeMin, rangeMax]: [number, number],
    standardIncrease: number,
    currentNumber: number,
  ): number => {
    const rangeSize: number = subtract(rangeMax, rangeMin);
    const adjustedIncrease = mod(rangeSize, standardIncrease);
    const currentIndexOfNumber: number = max([
      0,
      subtract(currentNumber, rangeMin),
    ]) as number;
    const indexOfNextNumber: number = mod(
      rangeSize,
      add(currentIndexOfNumber, adjustedIncrease),
    );
    return add(rangeMin, indexOfNextNumber);
  },
);


export const splitOnUnderscores = split("_");
export const joinOnUnderscores = join("_");
export const splitOnUnderscoresAndParseInts = pipe([
  splitOnUnderscores,
  convertArrayOfStringsIntoArrayOfIntegers,
]);

export const convertCharacterAtIndexIntoCharacterCode =
  Function.prototype.call.bind(String.prototype.charCodeAt);
export const convertCharacterIntoCharacterCode = partialRight(
  convertCharacterAtIndexIntoCharacterCode,
  [0],
);

export const convertCharacterCodeIntoCharacter = String.fromCharCode;

export const convertArrayOfIntegersIntoArrayOfCharacters = map(
  convertCharacterIntoCharacterCode,
);


export const addOneDay = addDays(1);
export const subOneDay = subDays(1);
export const addOneWeek = addWeeks(1);
export const addTwoWeeks = addWeeks(2);
export const addOneMonth = addMonths(1);
export const addOneYear = addYears(1);
