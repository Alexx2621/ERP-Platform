const COMPANY_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,49}$/;

export class InvalidCompanyCodeError extends Error {
  constructor(code: string) {
    super(`Company code "${code}" is invalid.`);
    this.name = "InvalidCompanyCodeError";
  }
}

export function normalizeCompanyCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!COMPANY_CODE_PATTERN.test(code)) throw new InvalidCompanyCodeError(value);
  return code;
}
