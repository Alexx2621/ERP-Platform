import { relativeTime } from "./activity-feed-widget";

describe("relativeTime", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("reports 'justo ahora' for an event under a minute old", () => {
    expect(relativeTime("2026-01-15T11:59:40.000Z", now)).toBe("justo ahora");
  });

  it("reports minutes for an event under an hour old", () => {
    expect(relativeTime("2026-01-15T11:45:00.000Z", now)).toBe("hace 15 min");
  });

  it("reports hours for an event under a day old", () => {
    expect(relativeTime("2026-01-15T09:00:00.000Z", now)).toBe("hace 3 h");
  });

  it("reports days for an older event", () => {
    expect(relativeTime("2026-01-12T12:00:00.000Z", now)).toBe("hace 3 d");
  });
});
