import { test, fc } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { size, pipe, add, over, concat } from 'lodash/fp';
import { assertIsDisjointFrom, assertIntersection,  splitOnSpacesAndConvertToSet, convertToSet, convertArrayOfArraysToArrayOfSets } from "../../test_helpers/Asserters"
import { fastCheckGenerateCaptureTemplateString, fastCheckGenerateCaptureTemplateStringWithCursor, fastCheckGenerateValidJSDateObject,
  fastCheckGenerateCaptureTemplateStringWithCustomVariablesAndCursor,
} from "../../test_helpers/TestDataGenerators"
import { ACCEPTEDTEMPLATEVARIABLESSET,
  ACCEPTEDTEMPLATEVARIABLES,
  captureTemplateSubstitution,
  getCursorIndex,
  TEMPLATEVARIABLESOBJECT,
  reduceReplace,
} from '../capture_template_substitution';


describe('captureTemplateSubstitution test suite', () => {

  
describe('getCursorIndex', () => {
  
    test.prop([fc.gen()])
   ("on string with cursor", (fcGen) => {

     const testTemplate: string = fastCheckGenerateCaptureTemplateStringWithCursor(fcGen)     
     const actualCursorIndex: number | null = getCursorIndex(testTemplate)
     
     const expectedCursorIndex: number = pipe([size, add(-2)])(testTemplate)
     expect(actualCursorIndex).toEqual(expectedCursorIndex)
     
   });

    test.prop([fc.gen()])
   ("on string without cursor", (fcGen) => {

     const testTemplate: string = fastCheckGenerateCaptureTemplateString(fcGen)     
     const actualCursorIndex: number | null = getCursorIndex(testTemplate)
     expect(actualCursorIndex).toBeFalsy()
     
   });
})

  describe('reduceReplace', () => {

    test.prop([fc.gen()])
   ("with a simple string", (fcGen) => {

     const [testTemplate, testDate] = over<string|Date>([fastCheckGenerateCaptureTemplateString, fastCheckGenerateValidJSDateObject])(fcGen)
     
     const actualExpandedString: string = reduceReplace(TEMPLATEVARIABLESOBJECT, {}, testDate, testTemplate)     
     const actualExpandedStringPartsSet: Set<string> = splitOnSpacesAndConvertToSet(actualExpandedString)
     assertIsDisjointFrom(actualExpandedStringPartsSet, ACCEPTEDTEMPLATEVARIABLESSET)
     
   });

  
  test.prop([fc.gen()])
   ("string with a cursor", (fcGen) => {

     const [testTemplate, testDate] = over<string|Date>([fastCheckGenerateCaptureTemplateStringWithCursor, fastCheckGenerateValidJSDateObject])(fcGen)
     
     const actualExpandedString: string = reduceReplace(TEMPLATEVARIABLESOBJECT, {}, testDate, testTemplate)     
     const actualExpandedStringPartsSet: Set<string> = splitOnSpacesAndConvertToSet(actualExpandedString)
     assertIntersection([actualExpandedStringPartsSet, ACCEPTEDTEMPLATEVARIABLESSET], convertToSet(["%?"]))
   });

    test.prop([fc.gen(), fc.integer({min: 2, max: 100})])
   ("string with a cursor and custom variables", (fcGen, testCustomVariablesCount) => {

     
     const testDate: Date = fastCheckGenerateValidJSDateObject(fcGen)
     
     const [testTemplate, testCustomVariablesObject] = fastCheckGenerateCaptureTemplateStringWithCustomVariablesAndCursor(fcGen, testCustomVariablesCount)
     
     const actualExpandedString: string = reduceReplace(TEMPLATEVARIABLESOBJECT, testCustomVariablesObject, testDate, testTemplate)

     const actualExpandedStringPartsSet: Set<string> = splitOnSpacesAndConvertToSet(actualExpandedString)
     const [expectedSuperSet, expectedIntersectionSet]: Set<string> = pipe([Object.values, over([concat(ACCEPTEDTEMPLATEVARIABLES),
       concat(["%?"])]), convertArrayOfArraysToArrayOfSets])(testCustomVariablesObject)


     assertIntersection([actualExpandedStringPartsSet, expectedSuperSet], expectedIntersectionSet)
   });

  })

  describe('captureTemplateSubstitution', () => {

    test.prop([fc.gen()])
   ("with a simple string", (fcGen) => {

     const testTemplate: string = fastCheckGenerateCaptureTemplateString(fcGen)
     const [actualExpandedString, actualCursorIndex] = captureTemplateSubstitution({}, testTemplate)
     const actualExpandedStringPartsSet: Set<string> = splitOnSpacesAndConvertToSet(actualExpandedString)
     assertIsDisjointFrom(actualExpandedStringPartsSet, ACCEPTEDTEMPLATEVARIABLESSET)
     expect(actualCursorIndex).toBeFalsy()
     
   });

  
  test.prop([fc.gen()])
   ("string with a cursor", (fcGen) => {

     const testTemplate: string = fastCheckGenerateCaptureTemplateStringWithCursor(fcGen)     
     const [actualExpandedString, actualCursorIndex] = captureTemplateSubstitution({}, testTemplate)
     const actualExpandedStringPartsSet: Set<string> = splitOnSpacesAndConvertToSet(actualExpandedString)
     assertIsDisjointFrom(actualExpandedStringPartsSet, ACCEPTEDTEMPLATEVARIABLESSET)
     expect(actualCursorIndex).toBeTruthy()
     
   });

    test.prop([fc.gen(), fc.integer({min: 2, max: 100})])
   ("string with a cursor and customVariables", (fcGen, testCustomVariablesCount) => {

     const [testTemplate, testCustomVariablesObject] = fastCheckGenerateCaptureTemplateStringWithCustomVariablesAndCursor(fcGen, testCustomVariablesCount)

     const [actualExpandedString, actualCursorIndex] = captureTemplateSubstitution(testCustomVariablesObject, testTemplate)
     
     const actualExpandedStringPartsSet: Set<string> = splitOnSpacesAndConvertToSet(actualExpandedString)

     assertIsDisjointFrom(actualExpandedStringPartsSet, ACCEPTEDTEMPLATEVARIABLESSET)
     expect(actualCursorIndex).toBeTruthy()
     
   });

  })

})
