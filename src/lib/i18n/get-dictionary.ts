import type { Locale } from "./locale";
import { en } from "./messages/en";
import { fr } from "./messages/fr";

const dictionaries = { en, fr };

/** Plain lookup, not a dynamic import — these dictionaries only cover
 * the small set of surfaces this phase translates (see messages/en.ts),
 * so there's no bundle-size reason to lazy-load them, and a plain
 * object is importable from Client Components too (needed by
 * PublicHeaderClient and PhoneLoginForm). */
export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
