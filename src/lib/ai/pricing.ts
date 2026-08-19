/**
 * Rough cost estimation for admin visibility only — not a billing record.
 * Rates are approximate published per-million-token pricing for Claude
 * Sonnet-class models, converted to kobo at an approximate FX rate. An
 * admin updating either constant does not need a code change elsewhere;
 * this is the single place estimates are computed.
 */
const USD_PER_MILLION_INPUT_TOKENS = 3;
const USD_PER_MILLION_OUTPUT_TOKENS = 15;
const NGN_PER_USD = 1600;

export function estimateCostKobo(inputTokens: number, outputTokens: number): number {
  const usd =
    (inputTokens / 1_000_000) * USD_PER_MILLION_INPUT_TOKENS +
    (outputTokens / 1_000_000) * USD_PER_MILLION_OUTPUT_TOKENS;
  return Math.round(usd * NGN_PER_USD * 100);
}
