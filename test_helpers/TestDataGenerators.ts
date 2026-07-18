import { fc } from "@fast-check/vitest";
import {
  curry,
  over,
  add,
  partialRight,
  pipe,
  chunk,
  property,
  join,
  toString,
  identity,
  map,
  shuffle,
  repeat,
  size,
  concat,
  subtract,
  first,
} from "lodash/fp";
import {
  unfold,
  unfoldAndShuffleArray,
  nonZeroBoundedModularAddition,
  minusOne,
  convertRangeSizeAndMinIntoRange,
  convertCharacterCodeIntoCharacter,
  simpleModularArithmetic,
  addOne,
  floorDivision,
  unfoldAndTransformRangeChunkN,
} from "../src/util/transformers";
import { createHeadingStars } from "../src/lib/org_utils";
import {
  TESTNONSPACESCHARACTERRANGE,
  DOUBLEBETWEENZEROAND1RANGE,
  TESTINBUFFERSETTINGS,
  TESTORGCAPTURETEMPLATES,
  TESTLOWERALPHACHARACTERRANGE,
  TESTUPPERALPHACHARACTERRANGE,
} from "./Constants";

export const fcGenerateValidJSDateObject = (fcGen: fc.GeneratorValue): Date => {
  return fcGen(fc.date, {
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("3000-12-31T23:59:59.999Z"),
    noInvalidDate: true,
  });
};

export const fcGenerateValidJSDateObjectString = pipe([
  fcGenerateValidJSDateObject,
  (x: Date): string => x.toDateString(),
]);

// don't use with functions
export const fcShuffledArray = curry(
  <T>(fcGen: fc.GeneratorValue, array: Array<T>): Array<T> => {
    return fcGen(fc.shuffledSubarray, array, {
      minLength: array.length,
      maxLength: array.length,
    });
  },
);

export const fcShuffledSubarray = curry(
  <T>(count: number, fcGen: fc.GeneratorValue, array: Array<T>): Array<T> => {
    return fcGen(fc.shuffledSubarray, array, {
      minLength: count,
      maxLength: count,
    });
  },
);

export const fcRandomShuffledSubarray = curry(
  <T>(fcGen: fc.GeneratorValue, array: Array<T>): Array<T> => {
    return fcGen(fc.shuffledSubarray, array, {
      minLength: 1,
      maxLength: array.length - 1,
    });
  },
);

export const fcRandomItemFromArray = curry(
  <T>(fcGen: fc.GeneratorValue, testArray: Array<T>): fc.Arbitrary<T> => {
    return fcGen(fc.constantFrom, ...shuffle(testArray));
  },
);

export const fcGetTwoRandomItemsFromArray = fcShuffledSubarray(2);

export const fcRandomObjectKey = curry(
  (fcGen: fc.GeneratorValue, object: Record<string, any>): string => {
    return pipe([Object.keys, fcRandomItemFromArray(fcGen)])(object);
  },
);

export const fcRandomObjectValue = curry(
  (fcGen: fc.GeneratorValue, object: Record<string, any>): string => {
    return pipe([Object.values, fcRandomItemFromArray(fcGen)])(object);
  },
);

export const fcNRandomArrayIndicesAsIntegers = curry(
  (
    count: number,
    fcGen: fc.GeneratorValue,
    array: Array<any>,
  ): Array<number> => {
    return pipe([Object.keys, fcShuffledSubarray(count, fcGen), map(parseInt)])(
      array,
    );
  },
);

export const fcGetRandomArrayChunk = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    [testArray, testChunkSize]: [Array<T>, number],
  ): fc.Arbitrary<T> => {
    return pipe([
      chunk(testChunkSize),
      fcRandomItemFromArrayWithIndex(fcGen),
      first,
    ])(testArray);
  },
);

export const fcRandomInteger = (fcGen: fc.GeneratorValue) => fcGen(fc.integer);

export const fcRandomIntegerAsString = pipe([fcRandomInteger, toString]);

export const fcRandomIntegerInRange = curry(
  (
    fcGen: fc.GeneratorValue,
    [rangeMin, rangeMax]: [number, number],
  ): number => {
    if (rangeMin <= rangeMax) return rangeMin
    return fcGen(fc.integer, { min: rangeMin, max: minusOne(rangeMax) });
  },
);

export const fcRandomIntegerBetweenZeroAnd = curry(
  (fcGen: fc.GeneratorValue, rangeMax: number): number => {
    return pipe([concat([0]), fcRandomIntegerInRange(fcGen)])(rangeMax);
  },
);

export const fcRandomIntegerBetweenOneAnd = curry(
  (fcGen: fc.GeneratorValue, rangeMax: number): number => {
    return pipe([concat([1]), fcRandomIntegerInRange(fcGen)])(rangeMax);
  },
);

export const fcRandomIntegerBetweenOneAnd10 = partialRight(
  fcRandomIntegerBetweenOneAnd,
  [10],
);

export const fcRandomIntegerBetweenTwoAnd = curry(
  (fcGen: fc.GeneratorValue, rangeMax: number): number => {
    return pipe([concat([2]), fcRandomIntegerInRange(fcGen)])(rangeMax);
  },
);

export const fcRandomIntegerBetween1And25 = partialRight(
  fcRandomIntegerInRange,
  [[1, 25]],
);

const defaultConvertFCGenIntoRandomGen =
  <T>(generator: (randomNumber: number, fcGen: fc.GeneratorValue) => T) =>
  (fcGen: fc.GeneratorValue): T => {
    const randomNumber = fcRandomIntegerBetween1And25(fcGen);
    return generator(randomNumber, fcGen);
  };

const flippedConvertFCGenIntoRandomGen =
  <T>(generator: (fcGen: fc.GeneratorValue, randomNumber: number) => T) =>
  (fcGen: fc.GeneratorValue): T => {
    const randomNumber = fcRandomIntegerBetween1And25(fcGen);
    return generator(fcGen, randomNumber);
  };

export const plusRandomNumberInRange = curry(
  (range: [number, number], fcGen: fc.GeneratorValue, num: number): number => {
    return pipe([fcRandomIntegerInRange, add(num)])(fcGen, range);
  },
);

export const plusRandomNumberBetweenZeroAnd100 = plusRandomNumberInRange([
  0, 100,
]);

export const fcOneRandomArrayIndexAsInteger = curry(
  (fcGen: fc.GeneratorValue, array: Array<any>): number => {
    return pipe([size, concat([0]), fcRandomIntegerInRange(fcGen)])(array);
  },
);

export const fcRandomItemFromArrayWithIndex = curry(
  <T>(fcGen: fc.GeneratorValue, testArray: Array<T>): [T, number] => {
    return pipe([
      fcOneRandomArrayIndexAsInteger(fcGen),
      over([partialRight(property, [testArray]), identity]),
    ])(testArray);
  },
);

export const fcCallRandomFCGen = curry(
  <T>(
    arrayOfFCGens: Array<(fcGen: fc.GeneratorValue) => T>,
    fcGen: fc.GeneratorValue,
  ): T => {
    // shuffledSubarray causes issues when given arrays of functions
    const index: number = fcOneRandomArrayIndexAsInteger(fcGen, arrayOfFCGens);
    return arrayOfFCGens[index](fcGen);
  },
);

export const fcRandomArrayChunkSize = curry(
  <T>(fcGen: fc.GeneratorValue, array: Array<T>): number => {
    return fcRandomIntegerInRange(fcGen, [1, size(array)]);
  },
);

export const fcRandomArrayChunkOfRandomSize = curry(
  <T>(fcGen: fc.GeneratorValue, array: Array<T>): number => {
    const chunkSize = fcRandomArrayChunkSize(fcGen, array);
    return fcGetRandomArrayChunk(fcGen, [array, chunkSize]);
  },
);

export const fcUnfoldRandomRangeChunk = curry(
  <T>(
    [rangeStart, rangeEnd]: [number, number],
    chunkSize: number,
    unfolder: <T>(index: number) => T,
    fcGen: fc.GeneratorValue,
  ): [Array<T>, number] => {
    const chunkNumber = pipe([
      subtract(rangeEnd),
      floorDivision(chunkSize),
      fcRandomIntegerBetweenZeroAnd(fcGen),
    ])(rangeStart);

    return over([
      unfoldAndTransformRangeChunkN(chunkSize, unfolder, [
        rangeStart,
        rangeEnd,
      ]),
      identity,
    ])(chunkNumber) as [Array<T>, number];
  },
);

export const fcUnfoldRandomNaturalNumberRangeChunk = curry(
  <T>(
    rangeMax: number,
    chunkSize: number,
    unfolder: <T>(index: number) => T,
    fcGen: fc.GeneratorValue,
  ): [Array<T>, number] => {
    return fcUnfoldRandomRangeChunk([0, rangeMax], chunkSize, unfolder, fcGen);
  },
);

export const fcNRandomArrayIndicesAsStrings = curry(
  <T>(
    fcGen: fc.GeneratorValue,
    count: number,
    array: Array<T>,
  ): Array<string> => {
    return fcGen(fc.shuffledSubarray, Object.keys(array), {
      minLength: count,
      maxLength: count,
    });
  },
);

export const fcRandomNaturalNumber = (fcGen: fc.GeneratorValue): number => {
  return fcGen(fc.nat, {});
};

export const fcRandomNaturalNumberWithMax = curry(
  (max: number, fcGen: fc.GeneratorValue): number => {
    return fcGen(fc.nat, { max });
  },
);

export const fcRandomFloatBetweenZeroAndOne = (
  fcGen: fc.GeneratorValue,
): number => {
  return fcGen(fc.float, {
    noDefaultInfinity: true,
    noNaN: true,
    min: Math.fround(0.1),
    max: Math.fround(0.99),
  });
};

export const fcArrayOfNFloatsBetweenZeroAndOne = (
  fcGen: fc.GeneratorValue,
  floatCount: number,
): Array<number> => {
  return unfold((_: number) => fcRandomFloatBetweenZeroAndOne(fcGen))(
    floatCount,
  );
};

export const fcRandomDoubleInRange = curry(
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

export const fcRandomDoubleBetweenZeroAndOne = fcRandomDoubleInRange(
  DOUBLEBETWEENZEROAND1RANGE,
);

export const fcNLengthArrayOfDoublesInRange = curry(
  (
    range: [number, number],
    arrayLength: number,
    fcGen: fc.GeneratorValue,
  ): Array<number> => {
    return unfold(
      (_: number) => fcRandomDoubleInRange(range, fcGen),
      arrayLength,
    );
  },
);

export const fcNLengthArrayOfDoublesBetweenZeroAndOne =
  fcNLengthArrayOfDoublesInRange(DOUBLEBETWEENZEROAND1RANGE);

export const fcRandomEvenIntegerInRange = curry(
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

export const fcRandomCharacterGenerator = curry(
  (range: [number, number], fcGen: fc.GeneratorValue): string => {
    return pipe([
      fcRandomIntegerInRange(fcGen),
      convertCharacterCodeIntoCharacter,
    ])(range);
  },
);

export const fcNonSpaceRandomCharacterGenerator = fcRandomCharacterGenerator(
  TESTNONSPACESCHARACTERRANGE,
);

export const fcRandomUpperAlphaChar = fcRandomCharacterGenerator(
  TESTUPPERALPHACHARACTERRANGE,
);

export const fcRandomLowerAlphaChar = fcRandomCharacterGenerator(
  TESTLOWERALPHACHARACTERRANGE,
);

export const fcTestLinearRangeGenerator = curry(
  (fcGen: fc.GeneratorValue, rangeSize: number): [number, number] => {
    return pipe([fcRandomInteger, convertRangeSizeAndMinIntoRange(rangeSize)])(
      fcGen,
    );
  },
);

export const fcTestLinearRangeWithMinimumGenerator = curry(
  (
    fcGen: fc.GeneratorValue,
    [rangeMin, rangeSize]: [number, number],
  ): [number, number] => {
    return pipe([
      convertRangeSizeAndMinIntoRange,
      fcRandomIntegerInRange(fcGen),
      convertRangeSizeAndMinIntoRange(rangeSize),
    ])(rangeSize, rangeMin);
  },
);

export const fcNLengthUniqueXArrayGenerator = curry(
  <A extends T, T extends <T>(x: number) => T>(
    valueTransformer: A,
    fcGen: fc.GeneratorValue,
    arraySize: number,
  ): Array<number> => {
    return pipe([
      fcRandomInteger,
      add,
      unfoldAndShuffleArray(arraySize),
      map(valueTransformer),
    ])(fcGen);
  },
);

export const fcNLengthUniqueIntegerArrayGenerator =
  fcNLengthUniqueXArrayGenerator(identity);

export const fcNLengthUniqueStringIntegerArrayGenerator =
  fcNLengthUniqueXArrayGenerator(toString);

export const fcNLengthUniqueStringNatNumberArrayGenerator =
  fcNLengthUniqueXArrayGenerator(pipe([Math.abs, toString]));

export const fcListOfXNatNumbersWithMaxGenerator = curry(
  (
    fcGen: fc.GeneratorValue,
    maxValue: number,
    arraySize: number,
  ): Array<number> => {
    const randomNat: number = fcRandomNaturalNumberWithMax(maxValue, fcGen);
    return unfoldAndShuffleArray(arraySize)(
      pipe([add(randomNat), simpleModularArithmetic(addOne, maxValue)]),
    );
  },
);

export const fcNLengthArrayOfXGenerator = curry(
  <T>(
    unfolder: (index: number) => T,
    range: [number, number],
    fcGen: fc.GeneratorValue,
    arraySize: number,
  ): Array<T> => {
    return pipe([
      fcRandomIntegerInRange(fcGen),
      unfolder,
      unfoldAndShuffleArray(arraySize),
    ])(range);
  },
);

export const nonZeroBoundedModularAdditionForCharacters = (
  range: [number, number],
) =>
  curry((standardIncrease: number, currentNumber: number) =>
    pipe([
      curry((startingIndex: number, currentNumber: number): number =>
        nonZeroBoundedModularAddition(range, 1, startingIndex + currentNumber),
      ),
      convertCharacterCodeIntoCharacter,
    ])(standardIncrease, currentNumber),
  );

export const nonZeroBoundedModularAdditionForTESTNONSPACESCHARACTERRANGE =
  nonZeroBoundedModularAdditionForCharacters(TESTNONSPACESCHARACTERRANGE);
export const nonZeroBoundedModularAdditionForLOWERALPHACHARACTERRANGE =
  nonZeroBoundedModularAdditionForCharacters(TESTLOWERALPHACHARACTERRANGE);
export const nonZeroBoundedModularAdditionForUPPERALPHACHARACTERRANGE =
  nonZeroBoundedModularAdditionForCharacters(TESTUPPERALPHACHARACTERRANGE);

export const fcNLengthUniqueStringArrayGenerator = fcNLengthArrayOfXGenerator(
  nonZeroBoundedModularAdditionForTESTNONSPACESCHARACTERRANGE,
  TESTNONSPACESCHARACTERRANGE,
);

export const fcNLengthStringGenerator = (
  fcGen: fc.GeneratorValue,
  stringLength: number,
): [string, Array<string>] => {
  return pipe([
    fcNLengthUniqueStringArrayGenerator,
    over([join(""), identity]),
  ])(fcGen, stringLength);
};

export const fcRandomStringGenerator = (fcGen: fc.GeneratorValue): string => {
  return pipe([
    fcRandomIntegerBetweenTwoAnd(fcGen),
    fcNLengthUniqueStringArrayGenerator(fcGen),
    join(""),
  ])(8);
};

export const fcNLengthUniqueLowerAlphaStringArrayGenerator =
  fcNLengthArrayOfXGenerator(
    nonZeroBoundedModularAdditionForLOWERALPHACHARACTERRANGE,
    TESTLOWERALPHACHARACTERRANGE,
  );

export const fcRandomArrayOfLowerAlphaStringsGenerator =
  flippedConvertFCGenIntoRandomGen(
    fcNLengthUniqueLowerAlphaStringArrayGenerator,
  );

export const fcRandomLengthLowerAlphaStringGenerator = pipe([
  fcRandomArrayOfLowerAlphaStringsGenerator,
  join(""),
]);

export const fcNLengthUniqueUpperAlphaStringArrayGenerator =
  fcNLengthArrayOfXGenerator(
    nonZeroBoundedModularAdditionForUPPERALPHACHARACTERRANGE,
    TESTUPPERALPHACHARACTERRANGE,
  );

export const fcRandomArrayOfUpperAlphaStringsGenerator =
  flippedConvertFCGenIntoRandomGen(
    fcNLengthUniqueUpperAlphaStringArrayGenerator,
  );

export const fcRandomLengthUpperAlphaStringGenerator = pipe([
  fcRandomArrayOfUpperAlphaStringsGenerator,
  join(""),
]);

export const fcRandomAlphaString = fcCallRandomFCGen([
  fcRandomLengthUpperAlphaStringGenerator,
  fcRandomLengthLowerAlphaStringGenerator,
]);

export const fcShuffledSubArrayOfTemplateVariables = fcShuffledSubarray(
  TESTORGCAPTURETEMPLATES,
);
export const fcGenerateCaptureTemplateString = (
  fcGen: fc.GeneratorValue,
): string => {
  const templates: Array<string> = fcShuffledSubArrayOfTemplateVariables(fcGen);
  return join(" ", templates);
};

export const fcGenerateCaptureTemplateStringWithCursor = pipe([
  fcGenerateCaptureTemplateString,
  (template: string) => `${template} %?`,
]);

export const fcGenerateOrgHeadingAsString = curry(
  (headingLevel: number, fcGen: fc.GeneratorValue): [string, string] => {
    const headingStars: string = createHeadingStars(headingLevel);
    const headingValue: string = fcRandomStringGenerator(fcGen);
    const heading: string = `${headingStars} ${headingValue}`;
    return [heading, headingValue];
  },
);

export const fcGenerateRandomOrgHeadingAsString =
  defaultConvertFCGenIntoRandomGen(fcGenerateOrgHeadingAsString);

export const fcRandomInBufferSetting = partialRight(fcShuffledSubarray, [
  TESTINBUFFERSETTINGS,
]);
