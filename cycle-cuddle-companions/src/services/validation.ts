/** Shared text-field rules for the free-text forms. */
export function validateText(value: string, { min = 3, max = 1000, label = "This" } = {}): string | null {
  const t = value.trim();
  if (!t) return `${label} can't be empty.`;
  if (t.length < min) return `${label} needs at least ${min} characters.`;
  if (t.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}
