const ORGANIZATION_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,49}$/;

export class InvalidOrganizationCodeError extends Error {
  constructor(code: string) {
    super(`Organization code "${code}" is invalid.`);
    this.name = "InvalidOrganizationCodeError";
  }
}

export function normalizeOrganizationCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!ORGANIZATION_CODE_PATTERN.test(code)) throw new InvalidOrganizationCodeError(value);
  return code;
}
