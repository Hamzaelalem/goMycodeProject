/**
 * Dependency-free keyword heuristics for headlines. Kept separate from
 * `classify.ts` (which pulls in LLM clients) so client code can import it too.
 */

export const RISK_WORDS = /\b(risk|crisis|default|slump|plunge|crash|sanction|conflict|war|fraud|probe|lawsuit|downgrade|recession|inflation|shortage|outage|strike|protest|ban|fine)\b/i;
export const OPPORTUNITY_WORDS = /\b(surge|rally|record|growth|expansion|breakthrough|approval|launch|partnership|upgrade|boom|profit|beat|milestone)\b/i;
// "raise" only counts as a deal when money follows ("raises $50M", "raised capital"),
// not for "central bank raises interest rate".
export const DEAL_WORDS = /\b(?:acquisition|merger|acquires?|acquired|buyout|stake|deal|ipo|funding|investment round|takeover)\b|\brais(?:e|es|ed|ing)\s+(?:[$€£]|usd\b|eur\b|\d|capital\b|funds\b|financing\b)/i;
export const POLICY_WORDS = /\b(regulation|policy|central bank|interest rates?|rate hike|rate cut|tariff|law|legislation|mandate|framework|treaty|subsidy|compliance|esg)\b/i;

/** Keyword sentiment in -1..1 — deterministic, no LLM. */
export function heuristicSentiment(text: string): number {
  let score = 0;
  if (OPPORTUNITY_WORDS.test(text)) score += 0.5;
  if (DEAL_WORDS.test(text)) score += 0.2;
  if (RISK_WORDS.test(text)) score -= 0.6;
  return Math.max(-1, Math.min(1, Number(score.toFixed(2))));
}
