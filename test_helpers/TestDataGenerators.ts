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
  size,
  concat,
  subtract,
  first,
  padCharsStart,
  sortBy,
  merge,
  range,
  take,
} from "lodash/fp";
import { match } from "ts-pattern";
import {
  add as addDateUnits,
  differenceInDays,
  differenceInHours,
  addDays,
  addHours,
  type Duration,
} from "date-fns/fp";
import { type MapOf, Map } from "immutable";
import type { ColorObject } from "color";
import type {
  OrgTimestampPart,
  RepeaterUnit,
  TimestampUnit,
  RepeaterType,
  DelayType,
  DelayUnit,
} from "../src/types";
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
import {
  getTimestampPartsFromDate,
  addTimestampUnitToDate,
  createNextRepeatTimestampPartObject,
} from "../src/lib/timestamps";
import { createHeadingStars } from "../src/lib/org_utils";
import {
  TESTNONSPACESCHARACTERRANGE,
  DOUBLEBETWEENZEROAND1RANGE,
  TESTINBUFFERSETTINGS,
  TESTORGCAPTURETEMPLATES,
  TESTLOWERALPHACHARACTERRANGE,
  TESTUPPERALPHACHARACTERRANGE,
  TESTREPEATERTYPES,
  TESTREPEATERUNITS,
  TESTREPEATERUNITSWITHOUTHOURS,
  TESTDELAYTYPES,
  TESTMINHOURSDIFF,
  TESTMINDAYSDIFF,
  TESTSECONDSINADAY,
  TESTSECONDSINANHOUR,
  TESTSECONDSINAMINUTE,
} from "./Constants";

export const randomArrayValue = pipe([shuffle, first]);
export const randomArrayIndex = pipe([range(0), randomArrayValue]);
export const twoRandomArrayIndices = pipe([range(0), shuffle, take(2)]);
export const threeRandomArrayIndices = pipe([range(0), shuffle, take(3)]);
export const randomArrayIndexFromOne = pipe([range(1), randomArrayValue]);
export const randomArrayIndexMinusLastIndex = pipe([
  minusOne,
  range(0),
  randomArrayValue,
]);

// fast-check

export const fcGenRandomBoolean = (fcGen: fc.GeneratorValue): boolean => {
  return fcGen(fc.boolean);
};

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

export const fcGenRandomShuffledSubarray = curry(
  <T>(fcGen: fc.GeneratorValue, array: Array<T>): Array<T> => {
    return fcGen(fc.shuffledSubarray, array, {
      minLength: 1,
      maxLength: array.length - 1,
    });
  },
);

export const fcGenRandomItemFromArray = curry(
  <T>(fcGen: fc.GeneratorValue, testArray: Array<T>): T => {
    return fcGen(fc.constantFrom, ...shuffle(testArray));
  },
);

export const curriedFCRandomItemFromArray =
  <T>(testArray: Array<T>) =>
  <T>(fcGen: fc.GeneratorValue): T => {
    return fcGen(fc.constantFrom, ...shuffle(testArray));
  };

export const fcGetTwoRandomItemsFromArray = fcShuffledSubarray(2);

export const fcGenRandomObjectKey = curry(
  (fcGen: fc.GeneratorValue, object: Record<string, any>): string => {
    return pipe([Object.keys, fcGenRandomItemFromArray(fcGen)])(object);
  },
);

export const fcGenRandomObjectValue = curry(
  (fcGen: fc.GeneratorValue, object: Record<string, any>): string => {
    return pipe([Object.values, fcGenRandomItemFromArray(fcGen)])(object);
  },
);

export const fcGenRandomObjectKeyValuePair = curry(
  <T>(fcGen: fc.GeneratorValue, object: Record<string, T>): [string, T] => {
    const key: string = fcGenRandomObjectKey(fcGen, object);
    const val: T = object[key];
    return [key, val];
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
  ): T => {
    return pipe([
      chunk(testChunkSize),
      fcGenRandomItemFromArrayWithIndex(fcGen),
      first,
    ])(testArray);
  },
);

export const fcGenRandomInteger = (fcGen: fc.GeneratorValue) => fcGen(fc.integer);
export const fcGenRandomIntegerBetweenOneAndMaxSafeInteger = (
  fcGen: fc.GeneratorValue,
) => fcGen(fc.integer, { min: 1 });

export const fcGenRandomIntegerAsString = pipe([fcGenRandomInteger, toString]);

export const fcGenRandomIntegerInRange = curry(
  (
    fcGen: fc.GeneratorValue,
    [rangeMin, rangeMax]: [number, number],
  ): number => {
    if (rangeMin >= rangeMax) return rangeMin;
    return fcGen(fc.integer, { min: rangeMin, max: minusOne(rangeMax) });
  },
);

export const fcGenRandomIntegerBetweenZeroAnd = curry(
  (fcGen: fc.GeneratorValue, rangeMax: number): number => {
    return pipe([concat([0]), fcGenRandomIntegerInRange(fcGen)])(rangeMax);
  },
);

export const fcGenRandomIntegerBetweenOneAnd = curry(
  (fcGen: fc.GeneratorValue, rangeMax: number): number => {
    return pipe([concat([1]), fcGenRandomIntegerInRange(fcGen)])(rangeMax);
  },
);

export const curriedFCRandomIntegerBetweenOneAnd =
  (rangeMax: number) =>
  (fcGen: fc.GeneratorValue): number => {
    return fcGenRandomIntegerBetweenOneAnd(fcGen, rangeMax);
  };

export const fcGenRandomIntegerBetweenOneAndTen = partialRight(
  fcGenRandomIntegerBetweenOneAnd,
  [10],
);

export const fcGenRandomIntegerBetweenTwoAnd = curry(
  (fcGen: fc.GeneratorValue, rangeMax: number): number => {
    return pipe([concat([2]), fcGenRandomIntegerInRange(fcGen)])(rangeMax);
  },
);

export const fcGenRandomIntegerBetweenTwoAndTen = partialRight(
  fcGenRandomIntegerBetweenTwoAnd,
  [10],
);

export const fcGenRandomIntegerBetween1And25 = partialRight(
  fcGenRandomIntegerInRange,
  [[1, 25]],
);

export const fcGenRandomIntegerBetween0And1000 = partialRight(
  fcGenRandomIntegerInRange,
  [[0, 1000]],
);

const defaultConvertFCGenIntoRandomGen =
  <T>(generator: (randomNumber: number, fcGen: fc.GeneratorValue) => T) =>
  (fcGen: fc.GeneratorValue): T => {
    const randomNumber = fcGenRandomIntegerBetween1And25(fcGen);
    return generator(randomNumber, fcGen);
  };

const flippedConvertFCGenIntoRandomGen =
  <T>(generator: (fcGen: fc.GeneratorValue, randomNumber: number) => T) =>
  (fcGen: fc.GeneratorValue): T => {
    const randomNumber = fcGenRandomIntegerBetween1And25(fcGen);
    return generator(fcGen, randomNumber);
  };

const convertFCGenWithBooleanIntoRandomGen =
  <T>(generator: (randomBoolean: boolean, fcGen: fc.GeneratorValue) => T) =>
  (fcGen: fc.GeneratorValue): T => {
    const randomBoolean = fcGenRandomBoolean(fcGen);
    return generator(randomBoolean, fcGen);
  };

export const plusRandomNumberInRange = curry(
  (range: [number, number], fcGen: fc.GeneratorValue, num: number): number => {
    return pipe([fcGenRandomIntegerInRange, add(num)])(fcGen, range);
  },
);

export const plusRandomNumberBetweenZeroAnd100 = plusRandomNumberInRange([
  0, 100,
]);

export const fcOneRandomArrayIndexAsInteger = curry(
  (fcGen: fc.GeneratorValue, array: Array<any>): number => {
    return pipe([size, concat([0]), fcGenRandomIntegerInRange(fcGen)])(array);
  },
);

export const fcGenRandomItemFromArrayWithIndex = curry(
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

export const fcCallRandomFCGenWithArg = curry(
  <A, B>(
    arrayOfFCGens: Array<(arg: B, fcGen: fc.GeneratorValue) => A>,
    arg: B,
    fcGen: fc.GeneratorValue,
  ): A => {
    // shuffledSubarray causes issues when given arrays of functions
    const index: number = fcOneRandomArrayIndexAsInteger(fcGen, arrayOfFCGens);
    return arrayOfFCGens[index](arg, fcGen);
  },
);

export const fcGenRandomArrayChunkSize = curry(
  <T>(fcGen: fc.GeneratorValue, array: Array<T>): number => {
    return fcGenRandomIntegerInRange(fcGen, [1, size(array)]);
  },
);

export const fcGenRandomArrayChunkOfRandomSize = curry(
  <T>(fcGen: fc.GeneratorValue, array: Array<T>): number => {
    const chunkSize = fcGenRandomArrayChunkSize(fcGen, array);
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
      fcGenRandomIntegerBetweenZeroAnd(fcGen),
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

export const fcGenRandomNaturalNumber = (fcGen: fc.GeneratorValue): number => {
  return fcGen(fc.nat);
};

export const fcGenRandomNaturalNumberWithMax = curry(
  (max: number, fcGen: fc.GeneratorValue): number => {
    return fcGen(fc.nat, { max });
  },
);

export const fcGenRandomFloatBetweenZeroAndOneInclusive = (
  fcGen: fc.GeneratorValue,
): number => {
  return fcGen(fc.float, {
    noDefaultInfinity: true,
    noNaN: true,
    min: Math.fround(0.1),
    max: Math.fround(1),
  });
};

export const fcGenRandomFloatBetweenZeroAndOneExclusive = (
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
  return unfold((_: number) => fcGenRandomFloatBetweenZeroAndOneExclusive(fcGen))(
    floatCount,
  );
};

export const fcGenRandomDoubleInRange = curry(
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

export const fcGenRandomDoubleBetweenZeroAndOne = fcGenRandomDoubleInRange(
  DOUBLEBETWEENZEROAND1RANGE,
);

export const fcNLengthArrayOfDoublesInRange = curry(
  (
    range: [number, number],
    arrayLength: number,
    fcGen: fc.GeneratorValue,
  ): Array<number> => {
    return unfold(
      (_: number) => fcGenRandomDoubleInRange(range, fcGen),
      arrayLength,
    );
  },
);

export const fcNLengthArrayOfDoublesBetweenZeroAndOne =
  fcNLengthArrayOfDoublesInRange(DOUBLEBETWEENZEROAND1RANGE);

export const fcGenRandomEvenIntegerInRange = curry(
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

export const fcGenRandomCharacterGenerator = curry(
  (range: [number, number], fcGen: fc.GeneratorValue): string => {
    return pipe([
      fcGenRandomIntegerInRange(fcGen),
      convertCharacterCodeIntoCharacter,
    ])(range);
  },
);

export const fcNonSpaceRandomCharacterGenerator = fcGenRandomCharacterGenerator(
  TESTNONSPACESCHARACTERRANGE,
);

export const fcGenRandomUpperAlphaChar = fcGenRandomCharacterGenerator(
  TESTUPPERALPHACHARACTERRANGE,
);

export const fcGenRandomLowerAlphaChar = fcGenRandomCharacterGenerator(
  TESTLOWERALPHACHARACTERRANGE,
);

export const fcTestLinearRangeGenerator = curry(
  (fcGen: fc.GeneratorValue, rangeSize: number): [number, number] => {
    return pipe([fcGenRandomInteger, convertRangeSizeAndMinIntoRange(rangeSize)])(
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
      fcGenRandomIntegerInRange(fcGen),
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
      fcGenRandomInteger,
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
    const randomNat: number = fcGenRandomNaturalNumberWithMax(maxValue, fcGen);
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
      fcGenRandomIntegerInRange(fcGen),
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

export const fcGenRandomStringGenerator = (fcGen: fc.GeneratorValue): string => {
  return pipe([
    fcGenRandomIntegerBetweenTwoAnd(fcGen),
    fcNLengthUniqueStringArrayGenerator(fcGen),
    join(""),
  ])(8);
};

export const fcNLengthUniqueLowerAlphaStringArrayGenerator =
  fcNLengthArrayOfXGenerator(
    nonZeroBoundedModularAdditionForLOWERALPHACHARACTERRANGE,
    TESTLOWERALPHACHARACTERRANGE,
  );

export const fcGenRandomArrayOfLowerAlphaStringsGenerator =
  flippedConvertFCGenIntoRandomGen(
    fcNLengthUniqueLowerAlphaStringArrayGenerator,
  );

export const fcGenRandomLengthLowerAlphaStringGenerator = pipe([
  fcGenRandomArrayOfLowerAlphaStringsGenerator,
  join(""),
]);

export const fcNLengthUniqueUpperAlphaStringArrayGenerator =
  fcNLengthArrayOfXGenerator(
    nonZeroBoundedModularAdditionForUPPERALPHACHARACTERRANGE,
    TESTUPPERALPHACHARACTERRANGE,
  );

export const fcGenRandomArrayOfUpperAlphaStringsGenerator =
  flippedConvertFCGenIntoRandomGen(
    fcNLengthUniqueUpperAlphaStringArrayGenerator,
  );

export const fcGenRandomLengthUpperAlphaStringGenerator = pipe([
  fcGenRandomArrayOfUpperAlphaStringsGenerator,
  join(""),
]);

export const fcGenRandomAlphaString = fcCallRandomFCGen([
  fcGenRandomLengthUpperAlphaStringGenerator,
  fcGenRandomLengthLowerAlphaStringGenerator,
]);

export const fcShuffledSubArrayOfTemplateVariables = fcShuffledSubarray(
  TESTORGCAPTURETEMPLATES,
);
export const fcGenCaptureTemplateString = (
  fcGen: fc.GeneratorValue,
): string => {
  const templates: Array<string> = fcShuffledSubArrayOfTemplateVariables(fcGen);
  return join(" ", templates);
};

export const fcGenCaptureTemplateStringWithCursor = pipe([
  fcGenCaptureTemplateString,
  (template: string) => `${template} %?`,
]);

export const fcGenOrgHeadingAsString = curry(
  (headingLevel: number, fcGen: fc.GeneratorValue): [string, string] => {
    const headingStars: string = createHeadingStars(headingLevel);
    const headingValue: string = fcGenRandomStringGenerator(fcGen);
    const heading: string = `${headingStars} ${headingValue}`;
    return [heading, headingValue];
  },
);

export const fcGenRandomOrgHeadingAsString = defaultConvertFCGenIntoRandomGen(
  fcGenOrgHeadingAsString,
);

export const fcGenRandomInBufferSetting = partialRight(fcShuffledSubarray, [
  TESTINBUFFERSETTINGS,
]);

export const fcGenRandomColorObjectArray = (
  fcGen: fc.GeneratorValue,
): [number, number, number] => {
  return unfold(
    (_: number): number => fcGenRandomIntegerInRange(fcGen, [0, 255]),
    3,
  );
};

export const fcGenRandomColorObject = (fcGen: fc.GeneratorValue): ColorObject => {
  const [r, g, b] = fcGenRandomColorObjectArray(fcGen);
  const alpha = fcGenRandomFloatBetweenZeroAndOneExclusive(fcGen);
  return {
    r,
    g,
    b,
    alpha,
  };
};

export const fcNLengthArrayOfRandomColorObjects = curry(
  (count: number, fcGen: fc.GeneratorValue): Array<ColorObject> => {
    return unfold(
      (_: number): ColorObject => fcGenRandomColorObject(fcGen),
      count,
    );
  },
);

export const fcTwoRandomColorObjects = fcNLengthArrayOfRandomColorObjects(2);

// Dates

const cleanTestDate = curry((withStartTime: boolean, testDate: Date): Date => {
  if (withStartTime) {
    // no seconds or milliseconds
    return new Date(
      testDate.getFullYear(),
      testDate.getMonth(),
      testDate.getDate(),
      testDate.getHours(),
      testDate.getMinutes(),
    );
  }

  // no hours, minutes, seconds or milliseconds
  return new Date(
    testDate.getFullYear(),
    testDate.getMonth(),
    testDate.getDate(),
  );
});

export const fcGenValidJSDateObject = (
  fcGen: fc.GeneratorValue,
  withStartTime = true,
): Date => {
  const testDate = fcGen(fc.date, {
    min: new Date("2001-01-01T00:00:00.000Z"),
    max: new Date("3000-12-31T23:59:59.999Z"),
    noInvalidDate: true,
  });

  return cleanTestDate(withStartTime, testDate);
};

export const fcGenValidJSDateObjectString = pipe([
  fcGenValidJSDateObject,
  (x: Date): string => x.toDateString(),
]);

const fcGenDuration = (
  withStartTime: boolean,
  fcGen: fc.GeneratorValue,
  [minHours, minDays]: [number, number] = [TESTMINHOURSDIFF, TESTMINDAYSDIFF],
): Duration => {
  if (withStartTime) {
    const [days, hours, minutes] = unfold(
      (_: number) => fcGenRandomIntegerBetween0And1000(fcGen),
      3,
    );
    return { days, hours: hours + minHours, minutes };
  }
  const [months, weeks, days] = unfold(
    (_: number) => fcGenRandomIntegerBetween0And1000(fcGen),
    3,
  );
  return { months, weeks, days: days + minDays };
};

export const fcGenValidJSDateObjectRange = (
  withStartTime: boolean,
  fcGen: fc.GeneratorValue,
): Array<Date> => {
  const startDate: Date = fcGenValidJSDateObject(fcGen, withStartTime);
  const durationToAdd = fcGenDuration(withStartTime, fcGen);
  const endDate: Date = addDateUnits(durationToAdd, startDate);
  return map(cleanTestDate(withStartTime))([startDate, endDate]);
};

export const fcGenValidJSDateObjectInRange = (
  withStartTime: boolean,
  start: Date,
  end: Date,
  fcGen: fc.GeneratorValue,
): Date => {
  const [diffFunction, addFunc] = withStartTime
    ? [differenceInHours, addHours]
    : [differenceInDays, addDays];
  const diff = diffFunction(start, end);
  const unitsToAdd = fcGenRandomIntegerBetweenZeroAnd(fcGen, diff);
  const testDate = addFunc(unitsToAdd, start);
  return cleanTestDate(withStartTime, testDate);
};

// Timestamps

const fcGenRandomHours = curriedFCRandomIntegerBetweenOneAnd(24);
const fcGenRandomDays = curriedFCRandomIntegerBetweenOneAnd(30);
const fcGenRandomWeeks = curriedFCRandomIntegerBetweenOneAnd(4);
const fcGenRandomMonths = curriedFCRandomIntegerBetweenOneAnd(12);
const fcGenRandomYears = curriedFCRandomIntegerBetweenOneAnd(10);

export const fcGenRandomRepeaterType =
  curriedFCRandomItemFromArray(TESTREPEATERTYPES);
const fcGenRandomRepeaterUnitWithHours =
  curriedFCRandomItemFromArray(TESTREPEATERUNITS);
const fcGenRandomRepeaterUnitWithoutHours = curriedFCRandomItemFromArray(
  TESTREPEATERUNITSWITHOUTHOURS,
);

export const fcGenRandomRepeaterUnit = (
  withStartTime: boolean,
  fcGen: fc.GeneratorValue,
): RepeaterUnit => {
  return withStartTime
    ? fcGenRandomRepeaterUnitWithHours(fcGen)
    : fcGenRandomRepeaterUnitWithoutHours(fcGen);
};

const fcGenRandomRepeaterValue = (
  repeaterUnit: string,
  fcGen: fc.GeneratorValue,
): number => {
  return match(repeaterUnit)
    .returnType<number>()
    .with("h", (): number => fcGenRandomHours(fcGen))
    .with("d", (): number => fcGenRandomDays(fcGen))
    .with("w", (): number => fcGenRandomWeeks(fcGen))
    .with("m", (): number => fcGenRandomMonths(fcGen))
    .with("y", (): number => fcGenRandomYears(fcGen))
    .run();
};

const fcGenRandomRepeaterDeadlineValue = (
  repeaterValue: string,
  fcGen: fc.GeneratorValue,
): string => {
  const val: number =
    parseInt(repeaterValue) + fcGenRandomIntegerBetweenOneAndTen(fcGen);
  return val.toString();
};
const fcGenRandomDelayType = curriedFCRandomItemFromArray(TESTDELAYTYPES);
const fcGenRandomDelayUnit = fcGenRandomRepeaterUnit;
const fcGenRandomDelayValue = fcGenRandomRepeaterValue;

export const fcGenTimeRangeParts = (
  [hourOne, minuteOne]: Array<string>,
  fcGen: fc.GeneratorValue,
): Array<string> => {
  const hourTwoNumber = fcGenRandomHours(fcGen);
  const [startHour, endHour] = sortBy(identity, [
    parseInt(hourOne),
    hourTwoNumber,
  ]);
  const minuteOneNumber = parseInt(minuteOne);
  const minuteTwoNumber =
    (minuteOneNumber + fcGenRandomIntegerBetweenOneAnd(fcGen, 59)) % 60;
  const [startMinute, endMinute] = sortBy(identity, [
    minuteOneNumber,
    minuteTwoNumber,
  ]);
  return map<number, string>(pipe([padCharsStart("0", 2)]))([
    startHour,
    startMinute,
    endHour,
    endMinute,
  ]);
};

export const fcGenOrgTimestampPartObject = (
  {
    isActive = false,
    withStartTime = false,
    withEndTime = false,
    withRepeater = false,
    withDeadline = false,
    withDelay = false,
  }: Record<string, boolean>,
  fcGen: fc.GeneratorValue,
): [OrgTimestampPart, Date, string] => {
  const testDate = fcGenValidJSDateObject(fcGen, withStartTime);
  const [year, month, day, dayName, ...startTimeParts] =
    getTimestampPartsFromDate(testDate);

  const [startHour, startMinute, endHour, endMinute]:
    | [string, string, undefined, undefined]
    | Array<string> = withEndTime
    ? fcGenTimeRangeParts(startTimeParts, fcGen)
    : [startTimeParts[0], startTimeParts[1], undefined, undefined];

  const repeaterType: RepeaterType | undefined = withRepeater
    ? fcGenRandomRepeaterType(fcGen)
    : undefined;
  const repeaterUnit: RepeaterUnit | undefined = withRepeater
    ? fcGenRandomRepeaterUnit(withStartTime, fcGen)
    : undefined;
  const repeaterValue: string | undefined =
    withRepeater && repeaterUnit
      ? fcGenRandomRepeaterValue(repeaterUnit, fcGen).toString()
      : undefined;
  const repeaterDeadlineUnit: RepeaterUnit | undefined = withDeadline
    ? repeaterUnit
    : undefined;
  const repeaterDeadlineValue: string | undefined =
    withDeadline && repeaterValue
      ? fcGenRandomRepeaterDeadlineValue(repeaterValue, fcGen)
      : undefined;
  const delayType: DelayType | undefined = withDelay
    ? fcGenRandomDelayType(fcGen)
    : undefined;
  const delayUnit: DelayUnit | undefined = withDelay
    ? fcGenRandomDelayUnit(withStartTime, fcGen)
    : undefined;
  const delayValue: string | undefined =
    withDelay && delayUnit
      ? fcGenRandomDelayValue(delayUnit, fcGen).toString()
      : undefined;

  const timestamp: OrgTimestampPart = {
    isActive,
    withStartTime,
    year,
    month,
    day,
    dayName,
    startHour,
    startMinute,
    endHour,
    endMinute,
    repeaterType,
    repeaterValue,
    repeaterUnit,
    repeaterDeadlineValue,
    repeaterDeadlineUnit,
    delayType,
    delayValue,
    delayUnit,
  };

  const startBracket: string = isActive ? "<" : "[";
  const endBracket: string = isActive ? ">" : "]";
  const mandatoryPart: string = `${year}-${month}-${day} ${dayName}`;
  const startTime: string = withStartTime ? ` ${startHour}:${startMinute}` : "";
  const endTime: string = withEndTime ? `-${endHour}:${endMinute}` : "";
  const repeaterString: string = withRepeater
    ? ` ${repeaterType}${repeaterValue}${repeaterUnit}`
    : "";
  const repeaterDeadlineString: string = withDeadline
    ? `/${repeaterDeadlineValue}${repeaterDeadlineUnit}`
    : "";
  const delayString: string = withDelay
    ? ` ${delayType}${delayValue}${delayUnit}`
    : "";
  const extra: string = `${startTime}${endTime}${repeaterString}${repeaterDeadlineString}${delayString}`;
  const timestampString: string = `${startBracket}${mandatoryPart}${extra}${endBracket}`;

  return [timestamp, testDate, timestampString];
};

export const fcGenOrgTimestampPartRecord = (
  {
    isActive = false,
    withStartTime = false,
    withEndTime = false,
    withRepeater = false,
    withDeadline = false,
    withDelay = false,
  }: Record<string, boolean>,
  fcGen: fc.GeneratorValue,
): [MapOf<OrgTimestampPart>, Date, string] => {
  const [timestamp, testDate, timestampString] = fcGenOrgTimestampPartObject(
    {
      isActive,
      withStartTime,
      withEndTime,
      withRepeater,
      withDeadline,
      withDelay,
    },
    fcGen,
  );
  return [Map(timestamp), testDate, timestampString];
};

export const fcGenRandomOrgTimestampPartObject = (
  fcGen: fc.GeneratorValue,
): [OrgTimestampPart, Date, string] => {
  const [isActive, withStartTime, withRepeater, withDeadline, withDelay] =
    unfold((_: number) => fcGenRandomBoolean(fcGen), 5);
  return fcGenOrgTimestampPartObject(
    { isActive, withStartTime, withRepeater, withDeadline, withDelay },
    fcGen,
  );
};

export const fcGenRandomOrgTimestampPartRecord = (
  fcGen: fc.GeneratorValue,
): [MapOf<OrgTimestampPart>, Date, string] => {
  const [timestamp, testDate, timestampString] =
    fcGenRandomOrgTimestampPartObject(fcGen);
  return [Map(timestamp), testDate, timestampString];
};

export const fcGenOrgTimestampPartObjectWithRepeaterTypeX = (
  {
    repeaterType,
    withStartTime,
    withDeadline,
  }: {
    repeaterType: RepeaterType;
    withStartTime: boolean;
    withDeadline: boolean;
  },
  fcGen: fc.GeneratorValue,
): [OrgTimestampPart, Date, RepeaterUnit, string, string] => {
  const repeaterUnit: RepeaterUnit = fcGenRandomRepeaterUnit(withStartTime, fcGen);
  const repeaterValue: string = fcGenRandomRepeaterValue(
    repeaterUnit,
    fcGen,
  ).toString();
  const repeaterDeadlineUnit: RepeaterUnit | undefined = withDeadline
    ? repeaterUnit
    : undefined;
  const repeaterDeadlineValue: string | undefined =
    withDeadline && repeaterValue
      ? fcGenRandomRepeaterDeadlineValue(repeaterValue, fcGen)
      : undefined;

  const [timestamp, date, text] = fcGenOrgTimestampPartObject(
    { withStartTime, isActive: true },
    fcGen,
  );
  const timestampWithRepeater = merge(timestamp, {
    repeaterUnit,
    repeaterType,
    repeaterValue,
    repeaterDeadlineUnit,
    repeaterDeadlineValue,
  });
  return [timestampWithRepeater, date, repeaterUnit, repeaterValue, text];
};

// +
export const fcGenOrgTimestampPartRecordWithCumulateRepeater = (
  {
    withStartTime,
    withDeadline,
  }: { withStartTime: boolean; withDeadline: boolean },
  fcGen: fc.GeneratorValue,
): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] => {
  const repeaterType: RepeaterType = "+";
  const [timestampWithRepeater, date, repeaterUnit, repeaterValue] =
    fcGenOrgTimestampPartObjectWithRepeaterTypeX(
      { repeaterType, withStartTime, withDeadline },
      fcGen,
    );
  // as current time is always ignored, we just generate whatever here
  const currentDate = fcGenValidJSDateObject(fcGen);

  const expectedRepeatDate = addTimestampUnitToDate(
    repeaterUnit,
    parseInt(repeaterValue),
    date,
  );
  const nextRepeatTimestamp: OrgTimestampPart =
    createNextRepeatTimestampPartObject(
      timestampWithRepeater,
      expectedRepeatDate,
    );

  return [Map(timestampWithRepeater), currentDate, nextRepeatTimestamp];
};

// adding (repeaterValue * periodsElapsed) to a date is not
// the same thing as recursively incrementing a date
const recursiveAddTimestampUnitToDate = (
  times: number,
  unit: TimestampUnit,
  value: number,
  date: Date,
) => {
  if (times > 0) {
    return recursiveAddTimestampUnitToDate(times - 1, unit, value, date);
  }
  return date;
};

// ++
export const fcGenOrgTimestampPartRecordWithCatchupRepeater = (
  {
    withStartTime,
    withDeadline,
  }: { withStartTime: boolean; withDeadline: boolean },
  fcGen: fc.GeneratorValue,
): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] => {
  const repeaterType: RepeaterType = "++";
  const [timestampWithRepeater, date, repeaterUnit, repeaterValue] =
    fcGenOrgTimestampPartObjectWithRepeaterTypeX(
      { repeaterType, withStartTime, withDeadline },
      fcGen,
    );
  const repeaterValueAsInt: number = parseInt(repeaterValue);
  const completeRepeaterPeriodsElapsed: number =
    fcGenRandomIntegerBetween1And25(fcGen);
  const justBeforeNextRepeatDate: Date = recursiveAddTimestampUnitToDate(
    completeRepeaterPeriodsElapsed - 1,
    repeaterUnit,
    repeaterValueAsInt,
    date,
  );
  const nextRepeatDate: Date = addTimestampUnitToDate(
    repeaterUnit,
    repeaterValueAsInt,
    date,
  );
  const currentDate: Date = fcGenValidJSDateObjectInRange(
    withStartTime,
    justBeforeNextRepeatDate,
    nextRepeatDate,
    fcGen,
  );

  const nextRepeatTimestamp: OrgTimestampPart =
    createNextRepeatTimestampPartObject(timestampWithRepeater, nextRepeatDate);

  return [Map(timestampWithRepeater), currentDate, nextRepeatTimestamp];
};

// .+
export const fcGenOrgTimestampPartRecordWithRestartRepeater = (
  {
    withStartTime,
    withDeadline,
  }: { withStartTime: boolean; withDeadline: boolean },
  fcGen: fc.GeneratorValue,
): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] => {
  const repeaterType: RepeaterType = ".+";
  const [timestampWithRepeater, date, repeaterUnit, repeaterValue] =
    fcGenOrgTimestampPartObjectWithRepeaterTypeX(
      { repeaterType, withStartTime, withDeadline },
      fcGen,
    );
  const repeaterValueAsInt: number = parseInt(repeaterValue);
  const completeRepeaterPeriodsElapsed: number =
    fcGenRandomIntegerBetween1And25(fcGen);
  const partialRepeaterPeriodElapsed: number =
    fcGenRandomFloatBetweenZeroAndOneInclusive(fcGen) * repeaterValueAsInt;
  const valueToAddToStartDate: number =
    repeaterValueAsInt * completeRepeaterPeriodsElapsed +
    partialRepeaterPeriodElapsed;
  const currentDate: Date = addTimestampUnitToDate(
    repeaterUnit,
    valueToAddToStartDate,
    date,
  );
  const nextRepeatDate: Date = addTimestampUnitToDate(
    repeaterUnit,
    repeaterValueAsInt,
    currentDate,
  );
  const nextRepeatTimestamp: OrgTimestampPart =
    createNextRepeatTimestampPartObject(timestampWithRepeater, nextRepeatDate);

  return [Map(timestampWithRepeater), currentDate, nextRepeatTimestamp];
};

export const fcGenOrgTimestampPartRecordWithRepeater = (
  {
    repeaterType,
    withStartTime,
    withDeadline = false,
  }: {
    repeaterType: RepeaterType;
    withStartTime: boolean;
    withDeadline: boolean;
  },
  fcGen: fc.GeneratorValue,
): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] => {
  return match(repeaterType)
    .returnType<[MapOf<OrgTimestampPart>, Date, OrgTimestampPart]>()
    .with("+", (): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] =>
      fcGenOrgTimestampPartRecordWithCumulateRepeater(
        { withStartTime, withDeadline },
        fcGen,
      ),
    )
    .with("++", (): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] =>
      fcGenOrgTimestampPartRecordWithCatchupRepeater(
        { withStartTime, withDeadline },
        fcGen,
      ),
    )
    .with(".+", (): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] =>
      fcGenOrgTimestampPartRecordWithRestartRepeater(
        { withStartTime, withDeadline },
        fcGen,
      ),
    )
    .exhaustive();
};

export const fcGenRandomOrgTimestampPartRecordWithRepeater = (
  fcGen: fc.GeneratorValue,
): [MapOf<OrgTimestampPart>, Date, OrgTimestampPart] => {
  const [withStartTime, withDeadline] = unfold(
    (_: number): boolean => fcGenRandomBoolean(fcGen),
    2,
  );
  const REPEATERFUNCS: Array<
    (
      {
        withStartTime,
        withDeadline,
      }: { withStartTime: boolean; withDeadline: boolean },
      fcGen: fc.GeneratorValue,
    ) => [MapOf<OrgTimestampPart>, Date, OrgTimestampPart]
  > = [
    fcGenOrgTimestampPartRecordWithCumulateRepeater,
    fcGenOrgTimestampPartRecordWithCatchupRepeater,
    fcGenOrgTimestampPartRecordWithRestartRepeater,
  ];

  return fcCallRandomFCGenWithArg(
    REPEATERFUNCS,
    { withStartTime, withDeadline },
    fcGen,
  );
};
