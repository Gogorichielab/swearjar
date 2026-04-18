'use strict';

const { escapeOdata } = require('./odata');

describe('escapeOdata()', () => {
  it('returns the value unchanged when there are no single quotes', () => {
    expect(escapeOdata('BOLD-JAR-5432')).toBe('BOLD-JAR-5432');
  });

  it("doubles any single quote characters to escape them", () => {
    expect(escapeOdata("O'Brien")).toBe("O''Brien");
  });

  it("handles multiple single quotes in a string", () => {
    expect(escapeOdata("it's o'clock")).toBe("it''s o''clock");
  });

  it('coerces non-string values to strings', () => {
    expect(escapeOdata(42)).toBe('42');
    expect(escapeOdata(null)).toBe('null');
  });

  it('returns an empty string unchanged', () => {
    expect(escapeOdata('')).toBe('');
  });
});
