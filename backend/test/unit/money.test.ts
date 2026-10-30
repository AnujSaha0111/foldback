import { textStatesAmount } from "../../src/domain/money";

describe("textStatesAmount", () => {
  it("finds a price written with a dollar sign, decimals, or a currency word", () => {
    for (const text of [
      "it is $80",
      "$ 80 each",
      "80.00 each",
      "80 dollars",
      "80 USD",
      "80 bucks",
      "$80.00",
    ]) {
      expect(textStatesAmount(text, 8000)).toBe(true);
    }
  });

  it("reads commas and cents", () => {
    expect(textStatesAmount("the van is $1,250", 125000)).toBe(true);
    expect(textStatesAmount("$12.5", 1250)).toBe(true);
    expect(textStatesAmount("$12.50", 1250)).toBe(true);
    expect(textStatesAmount("$12.05", 1205)).toBe(true);
  });

  it("does not count a bare number, so a headcount cannot pass for a price", () => {
    expect(textStatesAmount("4 people, deadline 6pm", 400)).toBe(false);
    expect(textStatesAmount("we are 80 in total", 8000)).toBe(false);
  });

  it("does not match a different amount", () => {
    expect(textStatesAmount("$80 each", 800)).toBe(false);
    expect(textStatesAmount("$80 each", 80000)).toBe(false);
    expect(textStatesAmount("$800", 8000)).toBe(false);
  });

  it("returns false for text without prices", () => {
    expect(textStatesAmount("", 8000)).toBe(false);
  });
});
