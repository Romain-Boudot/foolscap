import { describe, it, expect, beforeEach } from "vitest";
import {
  ephemeralLifetimeDays,
  ephemeralWarningHours,
  expiryTime,
  expiresSoon,
  formatTimeUntil,
  isExpired,
} from "./ephemeral";

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

// Reset to defaults before each test so cross-test mutation can't leak.
beforeEach(() => {
  ephemeralLifetimeDays.value = 7;
  ephemeralWarningHours.value = 24;
});

describe("expiryTime", () => {
  it("returns null for a pinned note", () => {
    expect(expiryTime({ updated_at: NOW, pinned: 1 })).toBeNull();
  });

  it("returns updated_at + lifetime for an unpinned note", () => {
    expect(expiryTime({ updated_at: NOW, pinned: 0 })).toBe(NOW + 7 * DAY);
  });

  it("reflects the current lifetime setting", () => {
    ephemeralLifetimeDays.value = 14;
    expect(expiryTime({ updated_at: NOW, pinned: 0 })).toBe(NOW + 14 * DAY);
  });
});

describe("isExpired", () => {
  it("is false for fresh unpinned notes", () => {
    expect(isExpired({ updated_at: NOW, pinned: 0 }, NOW)).toBe(false);
  });

  it("is true once past lifetime", () => {
    expect(
      isExpired({ updated_at: NOW - 7 * DAY - 1, pinned: 0 }, NOW),
    ).toBe(true);
  });

  it("never expires pinned notes", () => {
    expect(
      isExpired({ updated_at: NOW - 70 * DAY, pinned: 1 }, NOW),
    ).toBe(false);
  });
});

describe("expiresSoon", () => {
  it("is false for fresh notes", () => {
    expect(expiresSoon({ updated_at: NOW, pinned: 0 }, NOW)).toBe(false);
  });

  it("is true within the warning window", () => {
    const editedAt = NOW - 7 * DAY + 12 * HOUR;
    expect(expiresSoon({ updated_at: editedAt, pinned: 0 }, NOW)).toBe(true);
  });

  it("is false once already expired", () => {
    const editedAt = NOW - 7 * DAY - HOUR;
    expect(expiresSoon({ updated_at: editedAt, pinned: 0 }, NOW)).toBe(false);
  });

  it("never warns on pinned notes", () => {
    const editedAt = NOW - 7 * DAY + HOUR;
    expect(expiresSoon({ updated_at: editedAt, pinned: 1 }, NOW)).toBe(false);
  });

  it("uses the configured warning window", () => {
    ephemeralWarningHours.value = 6;
    // 12h before expiry — outside a 6h warning, inside a 24h warning.
    const editedAt = NOW - 7 * DAY + 12 * HOUR;
    expect(expiresSoon({ updated_at: editedAt, pinned: 0 }, NOW)).toBe(false);
    // 3h before expiry — inside a 6h warning.
    const editedAt2 = NOW - 7 * DAY + 3 * HOUR;
    expect(expiresSoon({ updated_at: editedAt2, pinned: 0 }, NOW)).toBe(true);
  });
});

describe("formatTimeUntil", () => {
  it("returns 'now' for non-positive", () => {
    expect(formatTimeUntil(0)).toBe("now");
    expect(formatTimeUntil(-1000)).toBe("now");
  });

  it("rounds up to minutes under an hour", () => {
    expect(formatTimeUntil(30 * 60_000)).toBe("30m");
    expect(formatTimeUntil(45_000)).toBe("1m");
  });

  it("rounds up to hours under a day", () => {
    expect(formatTimeUntil(2 * HOUR)).toBe("2h");
    expect(formatTimeUntil(23 * HOUR + 30 * 60_000)).toBe("24h");
  });

  it("rounds up to days otherwise", () => {
    expect(formatTimeUntil(2 * DAY)).toBe("2d");
    expect(formatTimeUntil(6 * DAY + 12 * HOUR)).toBe("7d");
  });
});
