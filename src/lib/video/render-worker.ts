/** Presence of all five Remotion Lambda settings is the "can this app
 * actually kick off a render" signal for the admin UI — same role
 * ANTHROPIC_API_KEY/OPENAI_API_KEY play in earlier phases. Function/site
 * come from `npx remotion lambda functions deploy` / `sites create`
 * (see remotion.dev/docs/lambda/setup); the webhook secret is one you
 * generate yourself and pass to both renderMediaOnLambda() and the
 * webhook route that verifies its signature. */
export function isRemotionConfigured(): boolean {
  return (
    !!process.env.REMOTION_AWS_ACCESS_KEY_ID &&
    !!process.env.REMOTION_AWS_SECRET_ACCESS_KEY &&
    !!process.env.REMOTION_AWS_REGION &&
    !!process.env.REMOTION_FUNCTION_NAME &&
    !!process.env.REMOTION_SERVE_URL &&
    !!process.env.REMOTION_WEBHOOK_SECRET
  );
}
