import { Clock } from "../application/ports/clock.port";

/** Deterministic clock for expiry-related assertions. Advance it explicitly instead of sleeping in tests. */
export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}
