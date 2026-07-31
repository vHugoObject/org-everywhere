import {
  pipe,
  remove,
  overEvery,
  overSome,
  negate,
  includes,
  map,
  zipObject,
  flatMap,
} from "lodash/fp";
import { unfold, arrayCombinations } from "../../util/transformers";
import type { RepeaterType } from "../../types";
import { REPEATERTYPES } from "../constants";
const predicateForCombosToRemove = (x: Array<string>): boolean => {
  return overSome([
    overEvery([negate(includes("withRepeater")), includes("withDeadline")]),
    overEvery([negate(includes("withStartTime")), includes("withEndTime")]),
  ])(x);
};

export const RENDERASTEXTESTCASES: Array<Record<string, boolean>> = pipe([
  arrayCombinations,
  remove(predicateForCombosToRemove),
  map((options: Array<string>) =>
    zipObject(
      options,
      unfold((_: number) => true, options.length),
    ),
  ),
])([
  "isActive",
  "withStartTime",
  "withEndTime",
  "withRepeater",
  "withDeadline",
  "withDelay",
]);

export const APPLYREPEATERTESTCASES = flatMap((repeaterType: RepeaterType) => [
  { repeaterType, withStartTime: true, withDeadline: true },
  { repeaterType, withStartTime: true, withDeadline: false },
  { repeaterType, withStartTime: false, withDeadline: true },
  { repeaterType, withStartTime: false, withDeadline: false },
])(REPEATERTYPES);
