import { test, fc } from "@fast-check/vitest";
import { describe, expect, assert } from "vitest";
import { fromJS } from 'immutable';
import { pipe, over, identity } from "lodash/fp"
import { parseOrg } from '../parse_org';
import { convertDateIntoMonthNumberString,
  convertDateIntoDayNameString,
  convertDateIntoDayNumberString,
  convertDateIntoYearNumberString,
  convertJSDateObjectIntoTimestampStringWithAngleBrackets,
  convertDateIntoTimestampStringWithSquareBrackets
} from "../../util/dateUtilities"
import { readFixture } from '../../test_helpers/readFixture';
import { fastCheckGenerateValidJSDateObject } from '../../test_helpers/TestDataGenerators';
import {
  generateHash,
  extractAllOrgProperties,
  computeAllPropertyNames,
  computeAllPropertyValuesFor,
  headerWithPath,
} from '../org_utils';

describe('hash functions', () => {
  
  
  test.prop([fc.array(fc.integer())])
   ('generateHash', (testList) => {
     const actualHash: number = generateHash(testList)
     // uint8.byteLength
     // 256 * testList.length
     
   });
  
});

describe('Extracting and computing property names and values', () => {
  const testOrgFile = readFixture('properties_extended');
  const parsedFile = parseOrg(testOrgFile);
  const headers = parsedFile.get('headers');
  const allProperties = extractAllOrgProperties(headers);
  
  test.prop([fc.gen()])
   ('Did we got all properties?', () => {
     expect(allProperties.size).toEqual(8);
   });

  test.prop([fc.gen()])
   ('Computes distinct property names (alphabetical order)', () => {
      const result = computeAllPropertyNames(allProperties);
    expect(result.toJS()).toEqual(['bar', 'bay', 'baz', 'emptyprop', 'foo', 'foo2']);
  });
  test.prop([fc.gen()])
   ('Computes distinct property values for a property (alphabetical order)', () => {
      const result = computeAllPropertyValuesFor(allProperties, 'bar');
      expect(result.toJS()).toEqual(['xyz', 'zyx']);
    });
  test.prop([fc.gen()])
    ('Handles the case of empty values', () => {
      const result = computeAllPropertyValuesFor(allProperties, 'emptyprop');
      expect(result.toJS()).toEqual(['']);
    });
  test.prop([fc.gen()])
    ('Handles the case of no values for a non-existing property', () => {
      const result = computeAllPropertyValuesFor(allProperties, 'nonexisting');
      expect(result.isEmpty()).toBe(true);
    });
});

describe('Find the headline at the end of the headline-path', () => {
  test.prop([fc.gen()], {numRuns: 0})
    ('where the headline-path contains template variables as headlines', (fcGen) => {
      const testDate =  fastCheckGenerateValidJSDateObject(fcGen)

    const inactiveTimestampAsHeadline = {
      planningItems: [],
      logBookEntries: [],
      opened: true,
      titleLine: {
        title: [
          {
            id: 7,
            type: 'timestamp',
            firstTimestamp: {
              month: convertDateIntoMonthNumberString(testDate),
              dayName: convertDateIntoDayNameString(testDate),
              isActive: false,
              day: convertDateIntoDayNumberString(testDate),
              year: convertDateIntoYearNumberString(testDate)
            },
            secondTimestamp: null,
          },
        ],
        rawTitle: convertDateIntoTimestampStringWithSquareBrackets(testDate),
        tags: [],
      },
      propertyListItems: [],
      rawDescription: '',
      nestingLevel: 1,
      id: 8,
      description: [],
    };
    const activeTimestampAsHeadline = {
      planningItems: [
        {
          type: 'TIMESTAMP_TITLE',
          timestamp: {
            month: convertDateIntoMonthNumberString(testDate),
            dayName: convertDateIntoDayNameString(testDate),
            isActive: true,
            day: convertDateIntoDayNumberString(testDate),
            year: convertDateIntoYearNumberString(testDate),
          },
          id: 147,
        },
      ],
      logBookEntries: [],
      opened: true,
      titleLine: {
        title: [
          {
            id: 9,
            type: 'timestamp',
            firstTimestamp: {
              month: convertDateIntoMonthNumberString(testDate),
              dayName: convertDateIntoDayNameString(testDate),
              isActive: true,
              day: convertDateIntoDayNumberString(testDate),
              year: convertDateIntoYearNumberString(testDate),
            },
            secondTimestamp: null,
          },
        ],
        rawTitle: convertJSDateObjectIntoTimestampStringWithAngleBrackets(testDate),
        tags: [],
      },
      propertyListItems: [],
      rawDescription: '',
      nestingLevel: 2,
      id: 10,
      description: [],
    };
    const expectedHeadline = {
      planningItems: [],
      logBookEntries: [],
      opened: false,
      titleLine: {
        title: [
          {
            type: 'text',
            contents: 'test',
          },
        ],
        rawTitle: 'test',
        tags: [],
      },
      propertyListItems: [],
      rawDescription: '',
      nestingLevel: 3,
      id: 11,
      description: [],
    };
    const extraSiblingHeadline = {
      planningItems: [],
      logBookEntries: [],
      opened: false,
      titleLine: {
        title: [
          {
            type: 'text',
            contents: 'testnot',
          },
        ],
        rawTitle: 'testnot',
        tags: [],
      },
      propertyListItems: [],
      rawDescription: '',
      nestingLevel: 3,
      id: 200,
      description: [],
    };

    const headers = fromJS([
      inactiveTimestampAsHeadline,
      activeTimestampAsHeadline,
      expectedHeadline,
      extraSiblingHeadline,
    ]);
      const headerPath = fromJS(['%u', '%t', 'test']);
      console.log(headers.toJS())
    expect(headerWithPath(headers, headerPath).toJS()).toStrictEqual(expectedHeadline);
  });
});
