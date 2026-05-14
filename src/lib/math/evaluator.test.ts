import { describe, expect, it } from "vitest";
import { evaluateDoc } from "./evaluator";

describe("evaluateDoc", () => {
  it("evaluates a simple expression", () => {
    const r = evaluateDoc("2 + 2 =");
    expect(r).toHaveLength(1);
    expect(r[0].display).toBe("4");
    expect(r[0].error).toBeNull();
  });

  it("uses assignments in later queries", () => {
    const r = evaluateDoc("rent = 1200\nsalary = 5000\nsalary - rent =");
    expect(r[0].display).toBeNull();
    expect(r[1].display).toBeNull();
    expect(r[2].display).toBe("3800");
  });

  it("ignores blank, comment, and plain text lines", () => {
    const r = evaluateDoc("# header\nbuy milk\n\n2 + 2 =");
    expect(r[0].display).toBeNull();
    expect(r[1].display).toBeNull();
    expect(r[2].display).toBeNull();
    expect(r[3].display).toBe("4");
  });

  it("recalculates downstream when an assignment changes", () => {
    const r = evaluateDoc("x = 5\nx + 1 =\nx = 10\nx + 1 =");
    expect(r[1].display).toBe("6");
    expect(r[3].display).toBe("11");
  });

  it("handles unit conversions", () => {
    const r = evaluateDoc("5 km to mi =");
    expect(r[0].error).toBeNull();
    expect(r[0].display).toMatch(/mi$/);
  });

  it("reports an error on bad syntax", () => {
    const r = evaluateDoc("2 +/ 2 =");
    expect(r[0].display).toBeNull();
    expect(r[0].error).toBeTruthy();
  });

  it("supports inline assignment-and-display", () => {
    const r = evaluateDoc("total = 5 * 7 =");
    expect(r[0].display).toBe("35");
  });

  it("formats USD with symbol and 2 decimals", () => {
    expect(evaluateDoc("100 usd =")[0].display).toBe("$100.00");
  });

  it("converts USD to EUR with symbol", () => {
    const r = evaluateDoc("100 usd to eur =");
    expect(r[0].error).toBeNull();
    expect(r[0].display).toMatch(/^€\d+\.\d{2}$/);
  });

  it("sums across currencies, left-hand currency wins", () => {
    expect(evaluateDoc("100 usd + 50 eur =")[0].display).toMatch(
      /^\$\d+\.\d{2}$/,
    );
  });

  it("supports variables in currency arithmetic", () => {
    const r = evaluateDoc(
      "rent = 1200 EUR\nsalary = 5000 EUR\nsalary - rent =",
    );
    expect(r[2].display).toBe("€3,800.00");
  });

  it("converts km to miles (built-in mathjs units)", () => {
    const r = evaluateDoc("5 km to mi =");
    expect(r[0].display).toMatch(/mi$/);
  });

  it("accepts $ prefix symbol", () => {
    expect(evaluateDoc("$100 =")[0].display).toBe("$100.00");
  });

  it("accepts € suffix symbol", () => {
    expect(evaluateDoc("100€ =")[0].display).toBe("€100.00");
  });

  it("strips thousand separators from symbol input", () => {
    expect(evaluateDoc("$1,234.56 =")[0].display).toBe("$1,234.56");
  });

  it("does symbol arithmetic", () => {
    expect(evaluateDoc("$100 + $50 =")[0].display).toBe("$150.00");
  });

  it("mixes symbols and code names", () => {
    expect(evaluateDoc("$100 + 50 USD =")[0].display).toBe("$150.00");
  });

  it("converts symbol input to symbol output", () => {
    const r = evaluateDoc("$100 to eur =");
    expect(r[0].display).toMatch(/^€\d+\.\d{2}$/);
  });

  it("formats JPY without decimals", () => {
    expect(evaluateDoc("¥1000 =")[0].display).toBe("¥1,000");
  });

  it("falls back to code for currencies without a mapped symbol", () => {
    expect(evaluateDoc("100 chf =")[0].display).toBe("100.00 CHF");
  });

  it("places ₽ after the number (RUB convention)", () => {
    expect(evaluateDoc("100 rub =")[0].display).toMatch(/^100\.00 ₽$/);
  });

  it("accepts `en` as a conversion keyword (FR)", () => {
    const r = evaluateDoc("5 km en mi =");
    expect(r[0].error).toBeNull();
    expect(r[0].display).toMatch(/mi$/);
  });

  it("accepts `vers` as a conversion keyword (FR)", () => {
    const r = evaluateDoc("$100 vers eur =");
    expect(r[0].error).toBeNull();
    expect(r[0].display).toMatch(/^€\d+\.\d{2}$/);
  });

  it("accepts `into` (EN)", () => {
    expect(evaluateDoc("5 km into mi =")[0].display).toMatch(/mi$/);
  });

  it("`sum` aggregates all defined variables", () => {
    const r = evaluateDoc("a = 10\nb = 20\nc = 30\nsum =");
    expect(r[3].display).toBe("60");
  });

  it("`avg` and `mean` produce the same value", () => {
    expect(evaluateDoc("a = 10\nb = 20\navg =")[2].display).toBe("15");
    expect(evaluateDoc("a = 10\nb = 20\nmean =")[2].display).toBe("15");
  });

  it("`median` picks the middle value", () => {
    expect(evaluateDoc("a = 1\nb = 5\nc = 10\nmedian =")[3].display).toBe("5");
  });

  it("`min` / `max` / `range`", () => {
    const r = evaluateDoc("a = 5\nb = 100\nc = 30\nmin =\nmax =\nrange =");
    expect(r[3].display).toBe("5");
    expect(r[4].display).toBe("100");
    expect(r[5].display).toBe("95");
  });

  it("`count` is the number of numeric variables", () => {
    expect(evaluateDoc("a = 1\nb = 2\nc = 3\ncount =")[3].display).toBe("3");
  });

  it("`pNN` computes the NNth percentile", () => {
    // p50 over [1..5] = 3 (median)
    const r = evaluateDoc("a = 1\nb = 2\nc = 3\nd = 4\ne = 5\np50 =");
    expect(r[5].display).toBe("3");
  });

  it("a user-defined variable wins over an aggregate keyword", () => {
    const r = evaluateDoc("sum = 42\nsum =");
    expect(r[1].display).toBe("42");
  });

  it("does not touch aggregate keywords that are written as function calls", () => {
    // sum(1, 2) should evaluate as the mathjs function directly.
    expect(evaluateDoc("sum(1, 2, 3) =")[0].display).toBe("6");
  });

  it("aggregates currency variables", () => {
    const r = evaluateDoc("rent = 1000 usd\nsalary = 5000 usd\nsum =");
    expect(r[2].display).toBe("$6,000.00");
  });

  it("`total` is an alias for sum", () => {
    expect(evaluateDoc("a = 10\nb = 20\ntotal =")[2].display).toBe("30");
  });

  it("avg works as a direct function call (mathjs alias)", () => {
    expect(evaluateDoc("avg(1, 2, 3) =")[0].display).toBe("2");
  });

  it("total works as a direct function call", () => {
    expect(evaluateDoc("total(10, 20, 30) =")[0].display).toBe("60");
  });

  it("glob matches variables by suffix", () => {
    const r = evaluateDoc(
      "q1_revenue = 100\nq2_revenue = 200\nfixed_cost = 50\nsum(*_revenue) =",
    );
    expect(r[3].display).toBe("300");
  });

  it("glob matches variables by prefix", () => {
    const r = evaluateDoc(
      "growth_rate = 5\ngrowth_pct = 10\nbase = 100\nsum(growth_*) =",
    );
    expect(r[3].display).toBe("15");
  });

  it("glob can be combined with literal variable names", () => {
    const r = evaluateDoc(
      "q1_rev = 100\nq2_rev = 200\nbase = 50\nsum(*_rev, base) =",
    );
    expect(r[3].display).toBe("350");
  });

  it("`*` alone matches every variable", () => {
    expect(
      evaluateDoc("a = 10\nb = 20\nc = 30\nsum(*) =")[3].display,
    ).toBe("60");
  });

  it("glob in mean / median / max also works", () => {
    const r = evaluateDoc(
      "q1_rev = 100\nq2_rev = 300\nq3_rev = 200\nmean(*_rev) =\nmax(*_rev) =",
    );
    expect(r[3].display).toBe("200");
    expect(r[4].display).toBe("300");
  });

  it("keyword matching is case-insensitive", () => {
    expect(evaluateDoc("5 km EN mi =")[0].display).toMatch(/mi$/);
    expect(evaluateDoc("5 km Vers mi =")[0].display).toMatch(/mi$/);
  });
});
