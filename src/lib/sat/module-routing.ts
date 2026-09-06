export type ModuleTier = "EASIER" | "HARDER";

/** Reusable test-routing abstraction — deliberately never inlined into a
 * UI component, per the spec's explicit instruction. Approximates the
 * real Digital SAT's adaptive structure (strong Module 1 performance
 * unlocks a more challenging, higher-ceiling Module 2; weak performance
 * routes to an easier one) as a SmartPrepAfrica educational
 * approximation — not a reproduction of College Board's proprietary
 * adaptive algorithm. Pure and exported so it's directly unit-testable. */
export function selectNextSATModule(module1CorrectCount: number, module1TotalItems: number): ModuleTier {
  if (module1TotalItems <= 0) return "EASIER";
  const accuracy = module1CorrectCount / module1TotalItems;
  return accuracy >= 0.6 ? "HARDER" : "EASIER";
}
