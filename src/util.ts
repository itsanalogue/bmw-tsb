import { parseTsbDate, type Tsb } from './tsb.js';

export const encodeHtml = (data: string) =>
  data
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function dateShortDisplay(date?: Date) {
  if (!date) {
    return '';
  }
  return date.toISOString().split('T')[0];
}

export function sibIdDisplay(input: string): string | undefined {
  if (!input) return undefined;
  const cleaned = String(input)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  let s = cleaned;
  if (/^B\d{6}$/.test(s)) {
    s = `SIB${s.slice(1)}`;
  }

  const m = s.match(/^SIB(\d{2})(\d{2})(\d{2})$/);
  if (m) {
    return `SIB ${m[1]} ${m[2]} ${m[3]}`;
  }

  const digits = (cleaned.match(/(\d{6})/) || [])[0];
  if (digits) {
    return `SIB ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)}`;
  }

  return input;
}

export function recallIdDisplay(input: string) {
  return `RECALL ${input}`;
}

export const recallDetails = (tsb: Tsb) => {
  let details = '';
  if (tsb.potentialNumberAffected) {
    details += `Affecting ${tsb.potentialNumberAffected} total vehicles`;
  }
  if (tsb.beginManufacture && tsb.endManufacture) {
    details += ` built between ${dateShortDisplay(parseTsbDate(tsb.beginManufacture))} and ${dateShortDisplay(parseTsbDate(tsb.endManufacture))}`;
  } else if (tsb.beginManufacture) {
    details += ` built after ${dateShortDisplay(parseTsbDate(tsb.beginManufacture))}`;
  } else if (tsb.endManufacture) {
    details += ` built up to ${dateShortDisplay(parseTsbDate(tsb.endManufacture))}`;
  }
  return details;
};

export const tsbModelSort = (a: Tsb['models'][0], b: Tsb['models'][0]) => {
  let compare = a.model.localeCompare(b.model);
  if (compare !== 0) {
    return compare;
  }
  const aYear = [...a.years].sort()[0];
  const bYear = [...b.years].sort()[0];
  compare = aYear.localeCompare(bYear);
  if (compare !== 0) {
    return compare;
  }
  return a.code.localeCompare(b.code);
};

export const tsbDateSort = (a: Tsb, b: Tsb) => {
  let compared = a.manufacturerDate.localeCompare(b.manufacturerDate);
  if (compared !== 0) {
    return compared;
  }
  compared = a.nhtsaDate.localeCompare(b.nhtsaDate);
  if (compared !== 0) {
    return compared;
  }
  return a.nhtsaID.localeCompare(b.nhtsaID);
};

export const tsbDateSortDesc = (a: Tsb, b: Tsb) => tsbDateSort(b, a);
