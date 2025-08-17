import { getTsbs, readTsbFiles, type Tsb } from './tsb.js';
import { readDatabase, saveDatabase } from './database.js';
import { createOutputWriter } from './output.js';
import { sendMessage } from './email.js';
import log from './log.js';

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

export async function processTsbs(make: string, models: string[]) {
  const modelSet = new Set(models);

  const dataStore = readDatabase();
  const records = await readTsbFiles(dataStore, make);
  const tsbs = await getTsbs(dataStore, records, modelSet);
  await saveDatabase(dataStore);

  const forumWriters = new Map<string, ReturnType<typeof createOutputWriter>>();

  //Add chronological forum output organized by model and calendar year
  for (const tsb of tsbs
    .filter((t) => t.models.some((m) => modelSet.has(m.model)))
    .sort((a, b) => a.manufacturerDate.localeCompare(b.manufacturerDate))) {
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();
    const tsbYear = date.getFullYear();

    for (const tsbModel of tsb.models) {
      if (modelSet.has(tsbModel.model)) {
        const writerKey = `${tsbYear}-${tsbModel.model}`;

        let writer = forumWriters.get(writerKey);
        if (!writer) {
          writer = createOutputWriter(make, tsbModel.model, `${tsbYear}.txt`);
          writer.writeLine(`[B][SIZE="5"]${tsbYear}[/SIZE][/B]`);
          writer.writeLine('');
          forumWriters.set(writerKey, writer);
        }

        writeForumEntry(writer, tsb, date, tsbModel.model);
      }
    }
  }

  //Add reverse chronological forum output organized by model and new/recent
  const recentCountMap = new Map<string, number>();
  for (const tsb of tsbs
    .filter((t) => t.models.some((m) => modelSet.has(m.model)))
    .sort((a, b) => b.manufacturerDate.localeCompare(a.manufacturerDate))) {
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();

    for (const tsbModel of tsb.models) {
      if (modelSet.has(tsbModel.model)) {
        if (tsb.newData) {
          const writerKey = `NEW-${tsbModel.model}`;
          let writer = forumWriters.get(writerKey);
          if (!writer) {
            writer = createOutputWriter(make, tsbModel.model, `NEW.txt`);
            forumWriters.set(writerKey, writer);
          }
          writeForumEntry(writer, tsb, date, tsbModel.model);
        }

        const recentCount = recentCountMap.get(tsbModel.model) ?? 0;
        if (recentCount < 20) {
          recentCountMap.set(tsbModel.model, recentCount + 1);
          const writerKey = `RECENT-${tsbModel.model}`;
          let writer = forumWriters.get(writerKey);
          if (!writer) {
            writer = createOutputWriter(make, tsbModel.model, `RECENT.txt`);
            forumWriters.set(writerKey, writer);
          }
          writeForumEntry(writer, tsb, date, tsbModel.model);
        }
      }
    }
  }

  // Close all forum file writers
  for (const writer of forumWriters.values()) {
    await writer.end();
  }

  log.info(
    `Wrote TSB forum output for ${make} ${models} to ${forumWriters.size} files.`,
  );

  const emailModelList: string[] = [];
  const emailMakeList: string[] = [];
  const emailCutoff = new Date();
  emailCutoff.setMonth(emailCutoff.getMonth() - 1);
  const emailCutoffCompare = emailCutoff
    .toISOString()
    .split('T')[0]
    .replaceAll('-', '');

  for (const tsb of tsbs
    .filter(
      (t) =>
        t.newData && t.manufacturerDate.localeCompare(emailCutoffCompare) > 0,
    )
    .sort((a, b) => b.manufacturerDate.localeCompare(a.manufacturerDate))) {
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();

    addEmailEntry(
      tsb.models.some((m) => modelSet.has(m.model))
        ? emailModelList
        : emailMakeList,
      tsb,
      date,
    );
  }

  if (emailMakeList.length > 0 || emailModelList.length > 0) {
    log.info(
      `Sending new TSB email notification for ${emailModelList.length} model and ${emailMakeList.length} make updates.`,
    );
    let bodyText = '';
    if (emailModelList.length > 0) {
      bodyText += `\n\n============================================================\n`;
      bodyText += `New or updated TSBs found for ${make} ${models}:\n`;
      bodyText += `============================================================\n\n`;
      for (const item of emailModelList) {
        bodyText += item;
      }
    }
    if (emailMakeList.length > 0) {
      bodyText += `\n\n============================================================\n`;
      bodyText += `New or updated TSBs found for other ${make} models:\n`;
      bodyText += `============================================================\n\n`;
      for (const item of emailMakeList) {
        bodyText += item;
      }
    }
    await sendMessage({
      subject: `New TSBs for ${make} ${emailModelList.length > 0 ? models : ''}`,
      bodyText,
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const make = 'BMW';
  const models = (process.argv[2] ?? '').split(',').filter((s) => s.length > 0);
  try {
    await processTsbs(make, models);
  } catch (error) {
    const errorMsg = `Failed to process TSBs for ${make} ${models}`;
    log.error(errorMsg, error);
    await sendMessage({
      subject: errorMsg,
      bodyText: `The process failed with error ${(error as Error).message}`,
    });
    throw error;
  }
}
