import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { wordsPerMinute, fillerWordRatio } from "../../src/lib/toefl/speaking-metrics";

describe("wordsPerMinute", () => {
  test("computes real pace from word count and duration", () => {
    assert.equal(wordsPerMinute(120, 60), 120);
  });

  test("60 words in 30 seconds is 120 wpm", () => {
    assert.equal(wordsPerMinute(60, 30), 120);
  });

  test("0 duration returns 0, not NaN or Infinity", () => {
    assert.equal(wordsPerMinute(10, 0), 0);
  });
});

describe("fillerWordRatio", () => {
  test("no filler words is 0", () => {
    assert.equal(fillerWordRatio("This is a clear and confident response about the topic."), 0);
  });

  test("counts um/uh/like as a share of total words", () => {
    const transcript = "um I think uh this is like a good idea";
    const ratio = fillerWordRatio(transcript);
    assert.ok(ratio > 0 && ratio <= 1);
  });

  test("empty transcript returns 0, not NaN", () => {
    assert.equal(fillerWordRatio(""), 0);
    assert.equal(Number.isNaN(fillerWordRatio("")), false);
  });
});
