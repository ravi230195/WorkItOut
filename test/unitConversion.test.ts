import {
  isLengthInputWithinPrecision,
  isWeightInputWithinPrecision,
} from "../utils/unitConversion";

describe("isWeightInputWithinPrecision", () => {
  it.each([
    "",
    "0",
    "12",
    "12.3",
    "12.34",
    "0.",
    ".",
  ])("allows %s", (value) => {
    expect(isWeightInputWithinPrecision(value)).toBe(true);
  });

  it.each([
    "12.345",
    "0.123",
    "abc",
    "1..2",
  ])("rejects %s", (value) => {
    expect(isWeightInputWithinPrecision(value)).toBe(false);
  });
});

describe("isLengthInputWithinPrecision", () => {
  it.each(["", "0", "12", "12.3", "12.34", "0.", "."])("allows %s", (value) => {
    expect(isLengthInputWithinPrecision(value)).toBe(true);
  });

  it.each(["12.345", "0.123", "abc", "1..2"])("rejects %s", (value) => {
    expect(isLengthInputWithinPrecision(value)).toBe(false);
  });
});
