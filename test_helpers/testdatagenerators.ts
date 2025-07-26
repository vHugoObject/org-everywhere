import { fc } from "@fast-check/vitest";
import {
  curry,
  over,
  add,
  zip,
  partialRight,
  pipe,
  multiply,
  chunk,
  first,
  zipAll,
  property,
  flatten,
  join,
  toString,
  identity,
  map,
  shuffle,
  sortBy,
  groupBy,
  mapValues,
  last,
  sum,
  size,
  concat
} from "lodash/fp";
import type {ColorObject} from 'color';
import { unfold,
  minusOne,
  addOne,
  convertCharacterCodeIntoCharacter,
  convertRangeSizeAndMinIntoRange,
  unfoldAndShuffleArray,
  simpleModularArithmetic,
  nonZeroBoundedModularAddition,
  joinOnUnderscores,
  convertArrayOfArraysIntoShuffledArray,
  addMinusOne,
  mapFlatten,
  unfoldItemCountTuplesIntoMixedArray
} from "../src/util/transformers"
import { getFirstLevelArrayLengths } from "../src/util/getters"
import { NONSPACESCHARACTERRANGE, DOUBLEBETWEENZEROAND1RANGE } from "./constants"


export const fastCheckRandomItemFromArray = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    testArray: Array<T>,
  ): fc.Arbitrary<T> => {
    return fcGen(fc.constantFrom, ...shuffle(testArray));
  },
);


 export const fastCheckRandomObjectKey = curry(
   <T>(fcGen: fc.GeneratorValue, object: Record<string, T>): string => {
     return pipe([Object.keys, fastCheckRandomItemFromArray(fcGen)])(object);
  },
 );

export const fastCheckRandomObjectKeyValuePair = curry(
  <T>(fcGen: fc.GeneratorValue, object: Record<string, T>): [string, T] => {
    return pipe([Object.entries, fastCheckRandomItemFromArray(fcGen)])(object);
  },
);

export const fastCheckRandomItemFromArrayWithIndex = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    testArray: Array<T>,
  ): [fc.Arbitrary<T>, number] => {
    return pipe([fastCheckRandomObjectKey(fcGen),
      over([partialRight(property, [testArray]), identity])])(testArray)
  },
);

export const fastCheckGetRandomArrayChunk = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    [testArray, testChunkSize]: [Array<T>, number],
  ): fc.Arbitrary<T> => {
    return pipe([chunk(testChunkSize), fastCheckRandomItemFromArrayWithIndex(fcGen)])(testArray)
  },
);


export const fastCheckRandomInteger = (fcGen: fc.GeneratorValue) =>
  fcGen(fc.integer);


export const fastCheckRandomIntegerInRange = curry(
  (
    fcGen: fc.GeneratorValue,
    [rangeMin, rangeMax]: [number, number],
  ): number => {
    return fcGen(fc.integer, { min: rangeMin, max: minusOne(rangeMax) });
  },
);

export const fastCheckRandomIntegerInRange255 = partialRight(fastCheckRandomIntegerInRange, [[0,255]])

export const fastCheckRandomIntegerBetweenOneAnd = curry(
  (
    fcGen: fc.GeneratorValue,
    rangeMax: number
  ): number => {
    return pipe([concat([1]), fastCheckRandomIntegerInRange(fcGen)])(rangeMax)
  },
);

export const fastCheckRandomArrayChunkSize = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    array: Array<T>
  ): number => {
    return pipe([size, concat([1]), fastCheckRandomIntegerInRange(fcGen)])(array)
  },
);

export const fastCheckNRandomArrayIndices = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    count: number, 
    array: Array<T>
  ): Array<string> => {
    return fcGen(fc.shuffledSubarray, Object.keys(array), {minLength: count, maxLength: count})
  },
);

export const fastCheckNRandomItemsFromArray = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    count: number, 
    array: Array<T>
  ): Array<T> => {
    return fcGen(fc.shuffledSubarray, array, {minLength: count, maxLength: count})
  },
);


export const fastCheckRandomNaturalNumberWithMax = curry(
  (max: number, fcGen: fc.GeneratorValue): number => {
    return fcGen(fc.nat, { max });
  },
);

export const fastCheckRandomFloatBetweenZeroAndOne = (
  fcGen: fc.GeneratorValue,
): number => {
  return fcGen(fc.float, {
    noDefaultInfinity: true,
    noNaN: true,
    min: Math.fround(0.1),
    max: Math.fround(0.99),
  });
};

export const fastCheckRandomRGBA = (fcGen: fc.GeneratorValue): ColorObject => {
  const [r, g, b] = unfold(() => fastCheckRandomIntegerInRange255(fcGen), 3)
  return {
    r,
    g,
    b,
    a: fastCheckRandomFloatBetweenZeroAndOne(fcGen)
  }
}

export const fastCheckNRandomRGBAs = curry((count: number, fcGen: fc.GeneratorValue): Array<ColorObject> => {
  return unfold(() => fastCheckRandomRGBA(fcGen), count)
})

export const fastCheck2RandomRGBAs = fastCheckNRandomRGBAs(2)
      
export const fastCheckArrayOfNFloatsBetweenZeroAndOne = (
  fcGen: fc.GeneratorValue,
  floatCount: number,
): Array<number> => {
  return unfold((_: number) => fastCheckRandomFloatBetweenZeroAndOne(fcGen))(
    floatCount,
  );
};

export const fastCheckRandomDoubleInRange = curry(
  ([min, max]: [number, number], fcGen: fc.GeneratorValue): number => {
    return fcGen(fc.double, {
      maxExcluded: true,
      noDefaultInfinity: true,
      noNaN: true,
      min,
      max,
    });
  },
);

export const fastCheckRandomDoubleBetweenZeroAndOne =
  fastCheckRandomDoubleInRange(DOUBLEBETWEENZEROAND1RANGE);

export const fastCheckNLengthArrayOfDoublesInRange = curry(
  (
    range: [number, number],
    arrayLength: number,
    fcGen: fc.GeneratorValue,
  ): Array<number> => {
    return unfold(
      (_: number) => fastCheckRandomDoubleInRange(range, fcGen),
      arrayLength,
    );
  },
);

export const fastCheckNLengthArrayOfDoublesBetweenZeroAndOne =
  fastCheckNLengthArrayOfDoublesInRange(DOUBLEBETWEENZEROAND1RANGE);

export const fastCheckRandomEvenIntegerInRange = curry(
  (
    [rangeMin, rangeMax]: [number, number],
    fcGen: fc.GeneratorValue,
  ): number => {
    const int: number = fcGen(fc.integer, {
      min: rangeMin,
      max: minusOne(rangeMax),
    });
    return int % 2 == 0 ? int : int + 1;
  },
);

export const fastCheckRandomIntegerInRangeAsString = curry(
  (
    [rangeMin, rangeMax]: [number, number],
    fcGen: fc.GeneratorValue,
  ): string => {
    return pipe([fastCheckRandomIntegerInRange(fcGen), toString])(
      [rangeMin, rangeMax],
      fcGen,
    );
  },
);


export const fastCheckRandomCharacterGenerator = curry(
  (range: [number, number], fcGen: fc.GeneratorValue): string => {
    return pipe([
      fastCheckRandomIntegerInRange(fcGen),
      convertCharacterCodeIntoCharacter,
    ])(range);
  },
);

export const fastCheckNonSpaceRandomCharacterGenerator =
  fastCheckRandomCharacterGenerator(NONSPACESCHARACTERRANGE);

export const fastCheckTestLinearRangeGenerator = curry(
  (fcGen: fc.GeneratorValue, rangeSize: number): [number, number] => {
    return pipe([
      fastCheckRandomInteger,
      convertRangeSizeAndMinIntoRange(rangeSize),
    ])(fcGen);
  },
);

export const fastCheckTestLinearRangeWithMinimumGenerator = curry(
  (
    fcGen: fc.GeneratorValue,
    [rangeMin, rangeSize]: [number, number],
  ): [number, number] => {
    return pipe([
      convertRangeSizeAndMinIntoRange,
      fastCheckRandomIntegerInRange(fcGen),
      convertRangeSizeAndMinIntoRange(rangeSize),
    ])(rangeSize, rangeMin);
  },
);

export const fastCheckNLengthUniqueIntegerArrayGenerator = curry(
  (fcGen: fc.GeneratorValue, arraySize: number): Array<number> => {
    return pipe([
      fastCheckRandomInteger,
      add,
      unfoldAndShuffleArray(arraySize),
    ])(fcGen);
  },
);

export const fastCheckListOfXNatNumbersWithMaxGenerator = curry(
  (
    fcGen: fc.GeneratorValue,
    maxValue: number,
    arraySize: number,
  ): Array<number> => {
    const randomNat: number = fastCheckRandomNaturalNumberWithMax(
      maxValue,
      fcGen,
    );
    return unfoldAndShuffleArray(arraySize)(
      pipe([add(randomNat), simpleModularArithmetic(addOne, maxValue)]),
    );
  },
);

export const fastCheckNLengthArrayOfXGenerator = curry(
  <T>(
    unfolder: (index: number) => T,
    range: [number, number],
    fcGen: fc.GeneratorValue,
    arraySize: number,
  ): Array<T> => {
    return pipe([
      fastCheckRandomIntegerInRange(fcGen),
      unfolder,
      unfoldAndShuffleArray(arraySize),
    ])(range);
  },
);

export const nonZeroBoundedModularAdditionForNONSPACESCHARACTERRANGE = curry(
  (standardIncrease: number, currentNumber: number) =>
    pipe([
      curry((startingIndex: number, currentNumber: number): number =>
        nonZeroBoundedModularAddition(
          NONSPACESCHARACTERRANGE,
          1,
          startingIndex + currentNumber,
        ),
      ),
      convertCharacterCodeIntoCharacter,
    ])(standardIncrease, currentNumber),
);

export const fastCheckNLengthUniqueStringArrayGenerator =
  fastCheckNLengthArrayOfXGenerator(
    nonZeroBoundedModularAdditionForNONSPACESCHARACTERRANGE,
    NONSPACESCHARACTERRANGE,
  );

export const fastCheckNLengthStringGenerator = (
  fcGen: fc.GeneratorValue,
  stringLength: number,
): [string, Array<string>] => {
  return pipe([
    fastCheckNLengthUniqueStringArrayGenerator,
    over([join(""), identity]),
  ])(fcGen, stringLength);
};

export const fastCheckNUniqueIntegersFromRangeAsArrayGenerator = curry(
  (
    fcGen: fc.GeneratorValue,
    [range, arraySize]: [[number, number], number],
  ): Array<number> => {
    return pipe([
      fastCheckRandomIntegerInRange(fcGen),
      nonZeroBoundedModularAddition(range),
      unfoldAndShuffleArray(arraySize),
    ])(range);
  },
);

const addersForStringCountTuples = curry((start: number, index: number) =>
  over([nonZeroBoundedModularAdditionForNONSPACESCHARACTERRANGE, add])(
    start,
    index,
  ),
);

export const fastCheckNLengthArrayOfStringCountTuplesGenerator =
  fastCheckNLengthArrayOfXGenerator(
    addersForStringCountTuples,
    NONSPACESCHARACTERRANGE,
  );

export const fastCheckTestSingleStringIDGenerator = pipe([
  partialRight(fastCheckNLengthArrayOfStringCountTuplesGenerator, [1]),
  first,
  over([joinOnUnderscores, identity]),
]);

export const fastCheckNLengthArrayOfStringsAndIntegersGenerator = pipe([
  fastCheckNLengthArrayOfStringCountTuplesGenerator,
  zipAll,
  over([convertArrayOfArraysIntoShuffledArray, getFirstLevelArrayLengths]),
]);

const addersForStringCountIndexTuples = curry((start: number, index: number) =>
  over([
    nonZeroBoundedModularAdditionForNONSPACESCHARACTERRANGE,
    add,
    addMinusOne,
  ])(start, index),
);

export const fastCheckNLengthArrayOfStringCountStartingIndexTuplesGenerator =
  fastCheckNLengthArrayOfXGenerator(
    addersForStringCountIndexTuples,
    NONSPACESCHARACTERRANGE,
  );

export const fastCheckTestSingleStringCountStartingIndexTupleGenerator = pipe([
  partialRight(fastCheckNLengthArrayOfStringCountStartingIndexTuplesGenerator, [
    1,
  ]),
  first,
]);

export const fastCheckArrayOfNIntegerArraysGenerator = curry(
  (
    fcGen: fc.GeneratorValue,
    [arrayCount, sizeOfArrays]: [number, number],
  ): Array<Array<number>> => {
    return pipe([
      multiply,
      fastCheckNLengthUniqueIntegerArrayGenerator(fcGen),
      chunk(sizeOfArrays),
    ])(arrayCount, sizeOfArrays);
  },
);

export const fastCheckNLengthArrayXTuplesGivenItemsAndRangeOfCountsGenerator =
  curry(
    <T>(
      unfolder: (index: number) => any,
      items: Array<T>,
      fcGen: fc.GeneratorValue,
      [rangeMin, rangeSize]: [number, number],
    ): Array<[T, number, number]> => {
      return pipe([
        convertRangeSizeAndMinIntoRange,
        fastCheckRandomIntegerInRange(fcGen),
        unfolder,
        unfoldAndShuffleArray(items.length),
        zip(items),
      ])(rangeSize, rangeMin);
    },
  );

export const fastCheckNLengthArrayOfItemCountTuplesGivenItemsAndRangeOfCountsGenerator =
  fastCheckNLengthArrayXTuplesGivenItemsAndRangeOfCountsGenerator(add);

const addersForCountIndexTuples = curry((start: number, index: number) =>
  over([add, addMinusOne])(start, index),
);

export const fastCheckNLengthArrayOfItemCountIndexTuplesGivenItemsAndRangeOfCountsGenerator =
  curry(
    <T>(
      items: Array<T>,
      fcGen: fc.GeneratorValue,
      range: [number, number],
    ): Array<[T, number, number]> => {
      return pipe([
        fastCheckNLengthArrayXTuplesGivenItemsAndRangeOfCountsGenerator(
          addersForCountIndexTuples,
        ),
        mapFlatten,
      ])(items, fcGen, range);
    },
  );

export const fastCheckTestArrayWithDefinedItemsPerChunk = curry(
  <T>(
    generatorFunction: (fcGen: fc.GeneratorValue, arg: number) => Array<T>,
    fcGen: fc.GeneratorValue,
    uniqueStringsCount: number,
  ): [Array<string>, Array<[string, number]>, number] => {
    const [counts, strings] = over([
      fastCheckListOfXNatNumbersWithMaxGenerator(fcGen, 10),
      generatorFunction(fcGen),
    ])(uniqueStringsCount);
    const getItemCounts = pipe([
      map(sortBy(first)),
      zipAll,
      flatten,
      groupBy(first),
      mapValues(map(last)),
      Object.entries,
    ]);

    return pipe([
      unfold(() => pipe([map(shuffle), zipAll])([strings, counts])),
      over([
        pipe([flatten, unfoldItemCountTuplesIntoMixedArray]),
        getItemCounts,
        pipe([first, map(last), sum]),
      ]),
    ])(fastCheckRandomIntegerInRange(fcGen, [2, 5]));
  },
);

export const fastCheckTestStringArrayWithDefinedStringsPerChunk =
  fastCheckTestArrayWithDefinedItemsPerChunk(
    fastCheckNLengthUniqueStringArrayGenerator,
  );
export const fastCheckTestIntegerArrayWithDefinedIntegersPerChunk =
  fastCheckTestArrayWithDefinedItemsPerChunk(
    fastCheckNLengthUniqueStringArrayGenerator,
  );

