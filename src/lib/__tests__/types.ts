export interface DefaultTimestampOptions {
  isActive?: boolean,
  withStartTime?: boolean
}

export interface Timestamp {
  isActive: boolean;
  year: number;
  month: number;
  day: number;
  dayOfWeek?: number;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  repeaterType?: string;
  repeaterValue?: number;
  repeaterUnit?: string;
  repeaterDeadlineValue?: string;
  repeaterDeadlineUnit?: string;
  delayType?: string;
  delayValue?: number;
  delayUnit?: number;
}
