import { fc } from "@fast-check/vitest";
import { add as addDateUnits } from "date-fns/fp"
import { head, tail, pipe, curry, join, add, concat, partialRight, times, over, identity, spread, zipObject } from "lodash/fp"
import { type Timestamp, type DefaultTimestampOptions } from "../lib/types"
import {
  toDateString,
  convertJSDateObjectIntoTimestampObject,
  getYearMonthDayDayNumberHoursAndMinutesFromJSDateObject,
  convertArrayOfJSDateObjectsIntoArrayOfTimestampObjectsWithStartTimes
} from "../lib/timestamps"

export const NONSPACESCHARACTERRANGEMIN: number = 96
export const NONSPACESCHARACTERRANGE: [number, number] = [NONSPACESCHARACTERRANGEMIN, 10000];

export const TESTORGCAPTURETEMPLATES: Array<string> = ['%t', '%T',"test", '%u', '%U', "test",'%r', '%R', '%y']

export const TESTORGCAPTURETEMPLATESWITHCURSOR = concat(TESTORGCAPTURETEMPLATES, ["%?"])
export const TESTORGCAPTURETEMPLATESWITHCURSORSET: Set<string> = new Set(TESTORGCAPTURETEMPLATESWITHCURSOR)

export const minusOne = add(-1)

export const convertCharacterAtIndexIntoCharacterCode = (character: string): number => {
  return Function.prototype.call.bind(String.prototype.charCodeAt)(character)
}
export const convertCharacterIntoCharacterCode = partialRight(convertCharacterAtIndexIntoCharacterCode, [0])

export const fastCheckGenerateValidJSDateObject = (fcGen: fc.GeneratorValue): Date => {
  return fcGen(fc.date, { noInvalidDate: true, min: new Date('2000-01-01T00:00:00.000Z'), max: new Date('4000-12-31T23:59:59.999Z') })
}
export const fastCheckGenerateValidJSDateObjectString = pipe([fastCheckGenerateValidJSDateObject, toDateString])

export const fastCheckGenerateValidJSDateObjectStringWithDateParts = pipe([fastCheckGenerateValidJSDateObject, over([toDateString, getYearMonthDayDayNumberHoursAndMinutesFromJSDateObject])])

export const fastCheckRandomIntegerInRange = curry(
  (
    fcGen: fc.GeneratorValue,
    [rangeMin, rangeMax]: [number, number],
  ): number => {
    return fcGen(fc.integer, { min: rangeMin, max: minusOne(rangeMax) });
  },
);

export const fastCheckRandomNaturalNumber = (fcGen: fc.GeneratorValue): number => fcGen(fc.nat, {})
export const fastCheckRandomNaturalNumberWithMax = curry((max: number, fcGen: fc.GeneratorValue): number => fcGen(fc.nat, {max}))

export const fastCheckRandomMinutes = fastCheckRandomNaturalNumberWithMax(59)

export const fastCheckRandomHours = fastCheckRandomNaturalNumberWithMax(867000)

export const fastCheckRandomIntegerWithMinOnly = curry((min: number, fcGen: fc.GeneratorValue): number =>
  fcGen(fc.integer, {min}));


export const fastCheckRandomIntegerThatIsGreaterThanZero = fastCheckRandomIntegerWithMinOnly(1)

export const fastCheckJSDateObjectsRangeGenerator = (fcGen: fc.GeneratorValue): [Array<Date>, Array<number>] => {
  const start = fastCheckGenerateValidJSDateObject(fcGen)
  const [hours, minutes] = over([fastCheckRandomHours, fastCheckRandomMinutes])(fcGen)

  const dateRange = over<Date>([identity, addDateUnits({hours, minutes})])(start)
  
  return [dateRange, [hours, minutes]]
}


export const fastCheckShuffledSubarray = curry(<T>(array: Array<T>, fcGen: fc.GeneratorValue): Array<T> => fcGen(fc.shuffledSubarray, array, {minLength: 1}))

export const fastCheckShuffledArray = curry(<T>(fcGen: fc.GeneratorValue, array: Array<T>): Array<T> => fcGen(fc.shuffledSubarray, array, {minLength: array.length}))


export const fastCheckShuffledSubArrayOfTemplateVariables = fastCheckShuffledSubarray(TESTORGCAPTURETEMPLATES)
export const fastCheckGenerateCaptureTemplateString = (fcGen: fc.GeneratorValue): string => {
  const templates: Array<string> = fastCheckShuffledSubArrayOfTemplateVariables(fcGen)
  return join(" ", templates)
}

export const fastCheckGenerateCaptureTemplateStringWithCursor = pipe([fastCheckGenerateCaptureTemplateString,
  (template: string) =>  `${template} %?`])




export const fastCheckRandomCharacterGenerator = curry(
  (range: [number, number], fcGen: fc.GeneratorValue): string => {
    return pipe([
      fastCheckRandomIntegerInRange(fcGen),
      String.fromCharCode
    ])(range);
  },
);


export const fastCheckNonSpaceRandomCharacterGenerator =
  fastCheckRandomCharacterGenerator(NONSPACESCHARACTERRANGE);

export const fastCheckNLengthStringGenerator = (
  fcGen: fc.GeneratorValue,
  arrayLength: number,
): Array<string> => {
  const testRandomInteger: number = fastCheckRandomIntegerInRange(fcGen, [96,1000])
  return times(pipe([add(testRandomInteger), String.fromCharCode]))(arrayLength)
};

export const fastCheckTestCaptureCustomVariablesObjectGenerator = (fcGen: fc.GeneratorValue, keysCount: number): Record<string, string> => {
  return pipe([fastCheckNLengthStringGenerator,over([identity, fastCheckShuffledArray(fcGen)]), spread(zipObject)])(fcGen, keysCount)
}

export const fastCheckGenerateCaptureTemplateStringWithCustomVariablesAndCursor = (fcGen: fc.GeneratorValue, testKeysCount: number): [string, Record<string, string>] => {
  const testTemplateVariables: Array<string> = fastCheckShuffledSubArrayOfTemplateVariables(fcGen)
  const testCustomVariablesObject: Record<string, string> = fastCheckTestCaptureCustomVariablesObjectGenerator(fcGen, testKeysCount)
  const templateString: string = pipe([Object.keys, concat(testTemplateVariables), fastCheckShuffledArray(fcGen), join(" "), (template: string) => `${template} %?`])(testCustomVariablesObject)
  return [templateString, testCustomVariablesObject]
}

export const fastCheckTimestampObjectGenerator = curry((testTimestampOptions: DefaultTimestampOptions, fcGen: fc.GeneratorValue): [Timestamp, Array<number>, Date] => {
  
  return pipe([fastCheckGenerateValidJSDateObject, over<Timestamp|Array<number>|Date>([convertJSDateObjectIntoTimestampObject(testTimestampOptions), getYearMonthDayDayNumberHoursAndMinutesFromJSDateObject, identity])])(fcGen)
  
})

export const fastCheckActiveTimestampObjectGenerator = fastCheckTimestampObjectGenerator({isActive: true})
export const fastCheckInactiveTimestampObjectGenerator = fastCheckTimestampObjectGenerator({isActive: false})
export const fastCheckActiveTimestampWithStartTimeObjectGenerator = fastCheckTimestampObjectGenerator({withStartTime: true})

export const fastCheckInactiveTimestampWithStartTimeObjectGenerator = fastCheckTimestampObjectGenerator({isActive: false, withStartTime: false})

export const fastCheckTimestampObjectRangeGenerator = pipe([fastCheckJSDateObjectsRangeGenerator, over([pipe([head, convertArrayOfJSDateObjectsIntoArrayOfTimestampObjectsWithStartTimes]),tail])])
