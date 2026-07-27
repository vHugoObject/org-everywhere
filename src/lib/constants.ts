import { map } from "lodash/fp";
import type { TimestampUnit, OrgCheckboxState, RepeaterType, DelayType } from "../types";

export const HOURSINAYEAR: number = 8760;
export const DAYSINAYEAR: number = 365;
export const WEEKSINAYEAR: number = 52;
export const MONTHSINAYEAR: number = 12;
export const HOURSINADAY: number = 24;

export const TIMESTAMPUNITS: Array<TimestampUnit> = ["h", "d", "w", "m", "y"];
export const TIMESTAMPUNITSSET: Set<string> = new Set(TIMESTAMPUNITS);
export const DAYNAMES: Array<string> = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAYABBREVS = map((x: string) => x.slice(0, 3))(DAYNAMES);
export const ORGCHECKBOXSTATEMAPPING: Record<string, OrgCheckboxState> = {
  " ": "unchecked",
  X: "checked",
  "-": "partial",
};

export const REPEATERTYPES: Array<RepeaterType> = ["+", "++", ".+"];
export const REPEATERTYPESSET: Set<string> = new Set(REPEATERTYPES);

export const DELAYTYPES: Array<DelayType> = ["-", "--"];
export const DELAYTYPESSET: Set<string> = new Set(DELAYTYPES);


export const ORGTIMESTAMPDATEKEYNAMES: Array<string> = [
  "year",
  "month",
  "day",
  "dayName",
  "startHour",
  "startMinute",
];
