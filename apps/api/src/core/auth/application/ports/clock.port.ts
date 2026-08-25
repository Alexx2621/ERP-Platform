/** Injectable clock so session-expiry rules are deterministic in tests. */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol("CLOCK");
