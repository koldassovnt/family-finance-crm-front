/**
 * Telegram's own username rule, which the backend enforces too: 5–32 of
 * [A-Za-z0-9_], with an optional leading "@". Checked on the trimmed input,
 * since the server trims before validating.
 */
export function isTelegramUsername(input: string): boolean {
  return /^@?[A-Za-z0-9_]{5,32}$/.test(input.trim())
}
