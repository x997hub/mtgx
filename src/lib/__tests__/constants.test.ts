import { FORMAT_TOGGLE_COLORS, FORMAT_BADGE_COLORS, FORMATS } from "../constants";

describe("FORMAT_TOGGLE_COLORS", () => {
  const expectedFormats = ["pauper", "commander", "standard", "draft"] as const;

  it("has entries for all 4 formats", () => {
    for (const format of expectedFormats) {
      expect(FORMAT_TOGGLE_COLORS).toHaveProperty(format);
    }
  });

  it("has exactly 4 format entries", () => {
    expect(Object.keys(FORMAT_TOGGLE_COLORS)).toHaveLength(4);
  });

  it.each(expectedFormats)("format '%s' has active and inactive strings", (format) => {
    const colors = FORMAT_TOGGLE_COLORS[format];
    expect(colors).toHaveProperty("active");
    expect(colors).toHaveProperty("inactive");
    expect(typeof colors.active).toBe("string");
    expect(typeof colors.inactive).toBe("string");
    expect(colors.active.length).toBeGreaterThan(0);
    expect(colors.inactive.length).toBeGreaterThan(0);
  });

  it("active and inactive colors are different for each format", () => {
    for (const format of expectedFormats) {
      expect(FORMAT_TOGGLE_COLORS[format].active).not.toBe(
        FORMAT_TOGGLE_COLORS[format].inactive
      );
    }
  });

  it("each format has distinct active colors", () => {
    const activeColors = expectedFormats.map((f) => FORMAT_TOGGLE_COLORS[f].active);
    const unique = new Set(activeColors);
    expect(unique.size).toBe(expectedFormats.length);
  });

  it("all inactive colors use the same gray style", () => {
    const inactiveColors = expectedFormats.map((f) => FORMAT_TOGGLE_COLORS[f].inactive);
    const unique = new Set(inactiveColors);
    expect(unique.size).toBe(1);
  });
});

describe("FORMAT_BADGE_COLORS", () => {
  const expectedFormats = ["pauper", "commander", "standard", "draft"] as const;

  it("has entries for all 4 formats", () => {
    for (const format of expectedFormats) {
      expect(FORMAT_BADGE_COLORS).toHaveProperty(format);
    }
  });

  it("has exactly 4 format entries", () => {
    expect(Object.keys(FORMAT_BADGE_COLORS)).toHaveLength(4);
  });

  it.each(expectedFormats)("format '%s' has a non-empty string value", (format) => {
    expect(typeof FORMAT_BADGE_COLORS[format]).toBe("string");
    expect(FORMAT_BADGE_COLORS[format].length).toBeGreaterThan(0);
  });

  it("each format has distinct badge colors", () => {
    const colors = expectedFormats.map((f) => FORMAT_BADGE_COLORS[f]);
    const unique = new Set(colors);
    expect(unique.size).toBe(expectedFormats.length);
  });

  it("badge colors match the active toggle colors", () => {
    for (const format of expectedFormats) {
      expect(FORMAT_BADGE_COLORS[format]).toBe(FORMAT_TOGGLE_COLORS[format].active);
    }
  });
});

describe("FORMATS", () => {
  it("contains all 4 known formats", () => {
    expect(FORMATS).toContain("pauper");
    expect(FORMATS).toContain("commander");
    expect(FORMATS).toContain("standard");
    expect(FORMATS).toContain("draft");
  });

  it("has exactly 4 entries", () => {
    expect(FORMATS).toHaveLength(4);
  });
});
