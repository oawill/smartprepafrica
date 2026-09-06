import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { rankFocusAreas } from "../../src/lib/sat/study-plan-service";

const domains = [
  { section: "READING_WRITING" as const, domain: "Craft and Structure" },
  { section: "READING_WRITING" as const, domain: "Information and Ideas" },
  { section: "MATH" as const, domain: "Algebra" },
  { section: "MATH" as const, domain: "Geometry and Trigonometry" },
];

describe("rankFocusAreas", () => {
  test("a domain with no published content and no stats never appears", () => {
    const result = rankFocusAreas([], []);
    assert.deepEqual(result, []);
  });

  test("an unpracticed domain is flagged with a null accuracy, never a fabricated 0%", () => {
    const result = rankFocusAreas(
      [{ section: "MATH", domain: "Algebra" }],
      []
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].reason, "unpracticed");
    assert.equal(result[0].accuracy, null);
  });

  test("a domain above the weak threshold is not surfaced", () => {
    const result = rankFocusAreas(
      [{ section: "MATH", domain: "Algebra" }],
      [{ section: "MATH", domain: "Algebra", attempted: 10, correct: 8 }] // 80%
    );
    assert.deepEqual(result, []);
  });

  test("a domain below the weak threshold is surfaced as weak", () => {
    const result = rankFocusAreas(
      [{ section: "MATH", domain: "Algebra" }],
      [{ section: "MATH", domain: "Algebra", attempted: 10, correct: 3 }] // 30%
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].reason, "weak");
    assert.ok(Math.abs((result[0].accuracy ?? 0) - 0.3) < 1e-9);
  });

  test("unpracticed domains are prioritized ahead of weak ones", () => {
    const result = rankFocusAreas(domains, [
      { section: "READING_WRITING", domain: "Craft and Structure", attempted: 10, correct: 2 }, // weak, 20%
      { section: "MATH", domain: "Algebra", attempted: 10, correct: 9 }, // strong, not surfaced
      // Information and Ideas and Geometry and Trigonometry: never attempted
    ]);
    assert.equal(result[0].reason, "unpracticed");
    assert.equal(result[1].reason, "unpracticed");
    assert.equal(result[2].reason, "weak");
    assert.equal(result[2].domain, "Craft and Structure");
  });

  test("weak domains are sorted worst-accuracy first", () => {
    const result = rankFocusAreas(
      [
        { section: "MATH", domain: "Algebra" },
        { section: "MATH", domain: "Geometry and Trigonometry" },
      ],
      [
        { section: "MATH", domain: "Algebra", attempted: 10, correct: 6 }, // 60%
        { section: "MATH", domain: "Geometry and Trigonometry", attempted: 10, correct: 1 }, // 10%
      ]
    );
    assert.equal(result[0].domain, "Geometry and Trigonometry");
    assert.equal(result[1].domain, "Algebra");
  });

  test("caps at 4 focus areas", () => {
    const manyDomains = Array.from({ length: 10 }, (_, i) => ({
      section: "MATH" as const,
      domain: `Domain ${i}`,
    }));
    const result = rankFocusAreas(manyDomains, []);
    assert.equal(result.length, 4);
  });
});
