/** Internal email domain for cleaner staff logins (login only, not real inbox). */
export const CLEANER_AUTH_EMAIL_DOMAIN = 'staff.sparklepro.app';

/** Turn short login (hk924) or full email into auth email. */
export function resolveCleanerAuthEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@${CLEANER_AUTH_EMAIL_DOMAIN}`;
}

/**
 * Login = first letter of first name + first letter of last name + 3 digits (100–999).
 * e.g. Stepa Troitskiy → st281, Ahmed Hassan → ah924
 */
export function generateCleanerLogin(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? 'cleaner';
  const last = parts.length > 1 ? parts[parts.length - 1] : first;
  const a = (first[0] ?? 'c').toLowerCase();
  const b = (last[0] ?? 'l').toLowerCase();
  const prefix = `${a}${b}`.replace(/[^a-z]/g, '') || 'cl';
  const digits = String(100 + Math.floor(Math.random() * 900));
  return `${prefix}${digits}`;
}

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Random 8-character password (letters + digits, no ambiguous chars). */
export function generateCleanerPassword(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return out;
}
