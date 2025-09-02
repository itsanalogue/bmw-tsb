import { getTsbs, readTsbFiles, type Tsb } from './tsb.js';
import { readDatabase, saveDatabase } from './database.js';
import { createOutputWriter } from './output.js';
import { sendMessage } from './email.js';
import log from './log.js';
import { isModelMatch, MODEL_DEFINITIONS } from './model-match.js';
import { FORUM_POST_MAX_LENGTH, updateForumPosts } from './forum-update.js';
import { writePageFooter, writePageHeader, writeSibEntry } from './gh-pages.js';

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
  modelSlice: Set<string>,
) => {
  writer.writeLine(
    `[URL="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}"][B]${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}[/B][/URL] (${dateShortDisplay(date)})`,
  );

  const recallInfo = recallDetails(tsb);
  if (recallInfo.length > 0) {
    writer.writeLine(`[B]${recallInfo}[/B]`);
  }

  let otherModels = 0;

  for (const tsbModel of tsb.models.sort((a, b) =>
    a.model.localeCompare(b.model),
  )) {
    if (!isModelMatch([tsbModel], modelSlice)) {
      otherModels++;
      continue;
    }
    writer.writeLine(
      `${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}`,
    );
  }

  if (otherModels > 0) {
    writer.writeLine(
      `(plus ${otherModels} other model${otherModels === 1 ? '' : 's'})`,
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
  const modelCounts = new Map<string, number>();
  const dataStore = readDatabase();
  const records = await readTsbFiles(dataStore, make);
  const tsbs = await getTsbs(dataStore, records, modelSet);

  log.info(
    `Found ${tsbs.length} ${make} service bulletins or recalls in NHTSA dataset.`,
  );

  await saveDatabase(dataStore);

  const allConfiguredModels = new Set(MODEL_DEFINITIONS.keys());
  const forumWriters = new Map<string, ReturnType<typeof createOutputWriter>>();

  //Add chronological forum output organized by model and calendar year
  for (const tsb of tsbs
    .filter((t) => isModelMatch(t.models, modelSet))
    .sort((a, b) => a.manufacturerDate.localeCompare(b.manufacturerDate))) {
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();
    const tsbYear = date.getFullYear();

    for (const model of models) {
      const modelSlice = new Set([model]);
      if (isModelMatch(tsb.models, modelSlice)) {
        modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
        const writerKey = `${tsbYear}-${model}`;

        let writer = forumWriters.get(writerKey);
        if (!writer) {
          writer = createOutputWriter(`${make}-${model}/${tsbYear}.txt`);
          writer.writeLine(`[B][SIZE="5"]${tsbYear}[/SIZE][/B]`);
          writer.writeLine('');
          forumWriters.set(writerKey, writer);
        }

        if (writer.lengthWritten() < FORUM_POST_MAX_LENGTH) {
          writeForumEntry(writer, tsb, date, modelSlice);
        }
      }
    }
  }

  for (const model of modelSet.values()) {
    log.info(`Found ${modelCounts.get(model)} entries for ${model}`);
  }

  //Add reverse chronological forum output organized by model and new/recent
  const recentCountMap = new Map<string, number>();
  for (const tsb of tsbs
    .filter((t) => isModelMatch(t.models, allConfiguredModels))
    .sort((a, b) => b.manufacturerDate.localeCompare(a.manufacturerDate))) {
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();

    const tsbModelSet = new Set(tsb.models.map((m) => m.model));

    const allWriterKey = `ALL-${make}`;
    const recentCountAll = recentCountMap.get(allWriterKey) ?? 0;
    if (recentCountAll < 500) {
      recentCountMap.set(allWriterKey, recentCountAll + 1);
      let allWriter = forumWriters.get(allWriterKey);
      if (!allWriter) {
        allWriter = createOutputWriter(`${make}/ALL.txt`);
        forumWriters.set(allWriterKey, allWriter);
        allWriter.writeLine(`[B][SIZE="5"]Recent Bulletins[/SIZE][/B]`);
        allWriter.writeLine('');
      }
      if (allWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
        writeForumEntry(allWriter, tsb, date, tsbModelSet);
      }
    }

    if (tsb.newData) {
      const allNewWriterKey = `NEW-${make}`;
      let allNewWriter = forumWriters.get(allNewWriterKey);
      if (!allNewWriter) {
        allNewWriter = createOutputWriter(`${make}/NEW.txt`);
        forumWriters.set(allNewWriterKey, allNewWriter);
      }
      if (allNewWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
        writeForumEntry(allNewWriter, tsb, date, tsbModelSet);
      }
    }

    for (const model of models) {
      const modelSlice = new Set([model]);

      if (isModelMatch(tsb.models, modelSlice)) {
        if (tsb.newData) {
          const writerKey = `NEW-${model}`;
          let writer = forumWriters.get(writerKey);
          if (!writer) {
            writer = createOutputWriter(`${make}-${model}/NEW.txt`);
            forumWriters.set(writerKey, writer);
          }
          if (writer.lengthWritten() < FORUM_POST_MAX_LENGTH) {
            writeForumEntry(writer, tsb, date, modelSlice);
          }
        }

        const writerKey = `RECENT-${model}`;
        const recentCount = recentCountMap.get(writerKey) ?? 0;
        if (recentCount < 100) {
          recentCountMap.set(writerKey, recentCount + 1);
          let writer = forumWriters.get(writerKey);
          if (!writer) {
            writer = createOutputWriter(`${make}-${model}/RECENT.txt`);
            writer.writeLine(`[B][SIZE="5"]Recent Bulletins[/SIZE][/B]`);
            writer.writeLine('');
            forumWriters.set(writerKey, writer);
          }
          if (writer.lengthWritten() < FORUM_POST_MAX_LENGTH) {
            writeForumEntry(writer, tsb, date, modelSlice);
          }
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

  const ghPageWriters = new Map<
    string,
    ReturnType<typeof createOutputWriter>
  >();

  for (const tsb of tsbs
    .filter((t) => isModelMatch(t.models, allConfiguredModels))
    .sort((a, b) => b.manufacturerDate.localeCompare(a.manufacturerDate))) {
    const date =
      parseTsbDate(tsb.manufacturerDate) ??
      parseTsbDate(tsb.nhtsaDate) ??
      new Date();

    if (tsb.newData) {
      const writerKey = `PAGES-NEW-${make}`;
      let writer = ghPageWriters.get(writerKey);
      if (!writer) {
        writer = createOutputWriter(`gh-pages/new.html`);
        ghPageWriters.set(writerKey, writer);
        writePageHeader(writer, 'New', allConfiguredModels);
      }
      writeSibEntry(writer, tsb, date, new Set(tsb.models.map((m) => m.model)));
    }

    const recentCountAll = recentCountMap.get(make) ?? 0;
    if (recentCountAll < 500) {
      recentCountMap.set(make, recentCountAll + 1);
      const ghWriterKey = `index.html`;
      let allWriter = ghPageWriters.get(ghWriterKey);
      if (!allWriter) {
        allWriter = createOutputWriter(`gh-pages/index.html`);
        ghPageWriters.set(ghWriterKey, allWriter);
        writePageHeader(allWriter, '', allConfiguredModels);
      }
      writeSibEntry(
        allWriter,
        tsb,
        date,
        new Set(tsb.models.map((m) => m.model)),
      );
    }
    for (const model of [...allConfiguredModels]) {
      const modelSlice = new Set([model]);
      if (isModelMatch(tsb.models, modelSlice)) {
        const ghWriterKey = `${model}.html`;
        let pageWriter = ghPageWriters.get(ghWriterKey);
        if (!pageWriter) {
          pageWriter = createOutputWriter(`gh-pages/${model}.html`);
          ghPageWriters.set(ghWriterKey, pageWriter);
          writePageHeader(pageWriter, model, allConfiguredModels);
        }
        writeSibEntry(pageWriter, tsb, date, modelSlice);
      }
    }
  }

  // Close all gh-page file writers
  for (const writer of ghPageWriters.values()) {
    writePageFooter(writer);
    await writer.end();
  }
  const ghSiteMap = createOutputWriter(`gh-pages/sitemap.txt`);
  for (const pageKey of [...ghPageWriters.keys()].sort()) {
    ghSiteMap.writeLine(`https://itsanalogue.github.io/bmw-tsb/${pageKey}`);
  }
  await ghSiteMap.end();

  log.info(`Wrote gh-pages output for ${make} to ${ghPageWriters.size} files.`);

  if (forumWriters.size > 0) {
    try {
      const updateCount = await updateForumPosts(dataStore);
      if (updateCount > 0) {
        await saveDatabase(dataStore);
        log.info(`Updated ${updateCount} forum posts with new content.`);
      }
    } catch (error) {
      const errorMsg = `Failed to update forums for ${make} ${models}`;
      log.error(errorMsg, error);
      const errorWithCause = error as Error & { cause?: { message: string } };
      await sendMessage({
        subject: errorMsg,
        bodyText: `Failed to post updates to the forums: ${errorWithCause.cause?.message ?? errorWithCause.message}`,
      });
    }
  }

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
      isModelMatch(tsb.models, modelSet) ? emailModelList : emailMakeList,
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
  let models = (process.argv[2] ?? '').split(',').filter((s) => s.length > 0);
  if (models.length === 0) {
    models = [...MODEL_DEFINITIONS.keys()];
  }
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
