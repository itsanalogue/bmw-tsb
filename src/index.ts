import { getTsbs, readTsbFiles, type Tsb } from './tsb.js';
import { readDatabase, saveDatabase } from './database.js';
import { createOutputWriter } from './output.js';
import { sendMessage } from './email.js';

export function parseTsbDate(
  input: string | undefined | null,
): Date | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  if (s.length === 0) return undefined;

  // YYYYMMDD
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // MM/DD/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));

  // YYYY-MM-DD or YYYY/MM/DD
  m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // Fallback to Date.parse for other ISO-like formats
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  return undefined;
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

export function dateShortDisplay(date?: Date) {
  if (!date) {
    return '';
  }
  return date.toISOString().split('T')[0];
}

export async function processTsbs(make: string, model?: string) {
  const dataStore = readDatabase();
  const records = await readTsbFiles(dataStore, make);
  const tsbs = await getTsbs(dataStore, records, model);

  let modelCount = 0;
  let year = 0;
  let forumWriter: undefined | ReturnType<typeof createOutputWriter> =
    undefined;
  for (const tsb of tsbs
    .filter((t) => t.matchingModel)
    .sort((a, b) => a.manufacturerDate.localeCompare(b.manufacturerDate))) {
    modelCount++;
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();
    const thisYear = date.getFullYear();
    if (thisYear > year) {
      await forumWriter?.end();
      forumWriter = createOutputWriter(make, model ?? 'ALL', `${thisYear}.txt`);
      forumWriter.writeLine(`[B][SIZE="5"]${thisYear}[/SIZE][/B]`);
      forumWriter.writeLine('');
      year = thisYear;
    }
    if (forumWriter) {
      writeForumEntry(forumWriter, tsb, date, model);
    }
  }
  await forumWriter?.end();

  const recentWriter = createOutputWriter(make, model ?? 'ALL', 'RECENT.txt');
  const newWriter = createOutputWriter(make, model ?? 'ALL', 'NEW.txt');
  let recentCount = 0;
  for (const tsb of tsbs
    .filter((t) => t.matchingModel)
    .sort((a, b) => b.manufacturerDate.localeCompare(a.manufacturerDate))) {
    recentCount++;
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();
    if (recentCount <= 20) {
      writeForumEntry(recentWriter, tsb, date, model);
    }
    if (tsb.newData) {
      writeForumEntry(newWriter, tsb, date, model);
    }
  }
  await recentWriter.end();
  await newWriter.end();

  // eslint-disable-next-line no-console
  console.log(`Wrote ${modelCount} TSBs for ${make} ${model}`);
  await saveDatabase(dataStore);

  const emailModelList: string[] = [];
  const emailMakeList: string[] = [];
  for (const tsb of tsbs
    .filter(
      (t) => t.newData && t.manufacturerDate.localeCompare('20250701') > 0,
    )
    .sort((a, b) => b.manufacturerDate.localeCompare(a.manufacturerDate))) {
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();
    addEmailEntry(
      tsb.matchingModel ? emailModelList : emailMakeList,
      tsb,
      date,
    );
  }

  if (emailMakeList.length > 0 || emailModelList.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `Sending new TSB email notification for ${emailModelList.length} model and ${emailMakeList.length} make updates.`,
    );
    let bodyText = '';
    if (emailModelList.length > 0) {
      bodyText += `New or updated TSBs found for ${make} ${model}:\n`;
      for (const item of emailModelList) {
        bodyText += item;
      }
    }
    if (emailMakeList.length > 0) {
      bodyText += `\n\nNew or updated TSBs found for ${make}:\n`;
      for (const item of emailMakeList) {
        bodyText += item;
      }
    }
    await sendMessage({
      subject: `New TSBs for ${make} ${model}`,
      bodyText,
    });
  }
}

const recallDetails = (tsb: Tsb) => {
  let details = '';
  if (tsb.potentialNumberAffected) {
    details += ` - Affecting ${tsb.potentialNumberAffected} total vehicles`;
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

const addEmailEntry = (entries: string[], tsb: Tsb, date: Date) => {
  let entry = '';
  entry += `${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)} (${dateShortDisplay(date)})\n`;
  entry += `https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}\n`;
  for (const tsbModel of tsb.models) {
    entry += `${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}${recallDetails(tsb)}\n`;
  }
  entry += `${tsb.component}\n`;
  entry += `${tsb.summary}\n`;
  for (const att of tsb.files) {
    entry += `${att.url}\n`;
  }
  entry += `\n`;
  entries.push(entry);
};

const writeForumEntry = (
  writer: ReturnType<typeof createOutputWriter>,
  tsb: Tsb,
  date: Date,
  model?: string,
) => {
  writer.writeLine(
    `[URL="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}"][B]${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}[/B][/URL] (${dateShortDisplay(date)})`,
  );
  for (const tsbModel of tsb.models) {
    if (model && tsbModel.model !== model) {
      continue;
    }
    writer.writeLine(
      `${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}${recallDetails(tsb)}`,
    );
  }
  writer.writeLine(tsb.component.replace(/\:/g, ': '));
  writer.writeLine(`${tsb.summary}`);
  for (const att of tsb.files) {
    writer.writeLine(`[URL="${att.url}"]${att.fileName}[/URL]`);
  }
  writer.writeLine(' ');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const make = 'BMW';
  const model = process.argv[2] ?? 'IX';
  try {
    await processTsbs(make, model);
  } catch (error) {
    await sendMessage({
      subject: `Failed to process TSBs for ${make} ${model}`,
      bodyText: `The process failed with error ${(error as Error).message}`,
    });
    throw error;
  }
}
