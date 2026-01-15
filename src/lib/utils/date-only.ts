export const parseDateOnlyToUtc = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

export const normalizeDateToUtcDateOnly = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export const toUtcDateOnly = (value: string | Date): Date | null => {
  if (value instanceof Date) {
    return normalizeDateToUtcDateOnly(value);
  }

  const parsedDateOnly = parseDateOnlyToUtc(value);
  if (parsedDateOnly) {
    return parsedDateOnly;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return normalizeDateToUtcDateOnly(parsed);
};
