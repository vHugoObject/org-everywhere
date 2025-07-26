import {
  convertJSDateObjectIntoActiveOrgTimestampString,
  convertJSDateObjectIntoExtendedActiveOrgTimestampString,
  convertJSDateObjectIntoInactiveOrgTimestampString,
  convertJSDateObjectIntoExtendedInactiveOrgTimestampString,
  orgTimestampFormat,
  orgTimestampFormatWithStartTime,
  yearNumberStringDateFormat
} from "./timestamps"

import {
  merge,
  replace,
  curry,
  mapKeys,
  over,
  reduce,
  pipe,
  mapValues,
  constant,
  trimEnd
} from 'lodash/fp';

export const ACCEPTEDTEMPLATEVARIABLES: Array<string> = ['%T', '%T','%U', '%U', '%R', '%R', '%Y', "%?"]
export const ACCEPTEDTEMPLATEVARIABLESSET: Set<string> = new Set(ACCEPTEDTEMPLATEVARIABLES)

export const TEMPLATEVARIABLESOBJECT: Record<string, (arg: any) => string> = {
    '%t': convertJSDateObjectIntoActiveOrgTimestampString,
    '%T': convertJSDateObjectIntoExtendedActiveOrgTimestampString,
    '%u': convertJSDateObjectIntoInactiveOrgTimestampString, 
    '%U': convertJSDateObjectIntoExtendedInactiveOrgTimestampString,
    '%r': orgTimestampFormat,
    '%R': orgTimestampFormatWithStartTime,
    '%y': yearNumberStringDateFormat
};

const cursorRegex = new RegExp(/%\?/)
export const replaceCursor = pipe([replace(cursorRegex, ''), trimEnd])
export const stringIndexOf = Function.prototype.call.bind(String.prototype.indexOf);
export const getCursorIndex = (templateString: string): number | null =>  {
  const cursorIndex: number | null = stringIndexOf(templateString, "%?")
  return cursorIndex == -1 ? null : cursorIndex;
}

export const mapValuesAsConstants = mapValues(constant)
export const mapKeysAsVariables = mapKeys((key: string) => `%${key}`)

export const reduceReplace = curry((templateFunctions: Record<string, (arg: string|Date) => string>,
  customVariables: Record<string, string>,
  replacementString: string|Date, stringToModify: string): string => {
    return pipe([
      mapKeysAsVariables,
      mapValuesAsConstants,
      merge(templateFunctions),
      Object.entries,
      reduce((currentString: string, [currentVariable, currentFunc]: [string, (date: string|Date) => string]) => {	
	return replace(currentVariable, currentFunc(replacementString), currentString)
      },
	stringToModify,
      )
    ])(customVariables)
  
  })

export const basicCaptureTemplateSubstitution = curry((templateVariablesObject: Record<string, (arg: any) => string>,
  customVariablesObject: Record<string, string>, templateString: string): [string, number|null] => {

    return pipe([reduceReplace(templateVariablesObject, customVariablesObject, new Date())
      ,over([replaceCursor, getCursorIndex])])(templateString)
});

export const captureTemplateSubstitution = basicCaptureTemplateSubstitution(TEMPLATEVARIABLESOBJECT)
