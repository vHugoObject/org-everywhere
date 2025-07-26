import type { Assertion, AsymmetricMatchersContaining } from 'vitest'
import type { ExpectStatic } from "@vitest/expect"

interface CustomMatchers<R = unknown> {
  betweenZeroAnd255: (received: number, _: number) => R;
  betweenZeroAndOne: (received: number, _: number) => R;
  toBeWithinRange: (actual: number, floor: number, ceiling: number) => R;
}

declare module 'vitest' {
  interface Matchers<T = any> extends CustomMatchers<T> {}
  interface ExpectStatic extends CustomMatchers<T> {};
}

export {}
