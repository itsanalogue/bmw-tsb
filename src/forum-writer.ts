import {
  FORUM_MODEL_GROUPS,
  FORUM_POST_MAX_LENGTH,
  isForumMatch,
} from './forum-update.js';
import { createOutputWriter } from './output.js';
import type { Tsb } from './tsb.js';
import {
  sibIdDisplay,
  recallIdDisplay,
  dateShortDisplay,
  recallDetails,
  tsbModelSort,
  encodeHtml,
  tsbDateSort,
  tsbDateSortDesc,
} from './util.js';
import log from './log.js';

const forumWriters = new Map<string, ReturnType<typeof createOutputWriter>>();

export const FORUM_POST_HTML_FOOTER =
  '<p><span style="color:gray; font-size: 64%;"><em>This is an automated post created with code written by a human.</em></span></p>';

export const FORUM_POST_FOOTER =
  '[COLOR="gray"][SIZE="1"][I]This is an automated post created with code written by a human.[/I][/SIZE][/COLOR]';

export const getForumWriter = (props: {
  filePath: string;
  header?: string;
  footer?: string;
}) => {
  const { filePath, header, footer } = props;
  let writer = forumWriters.get(filePath);
  if (!writer) {
    writer = createOutputWriter(filePath, {
      onEnd: footer ? (writer) => writer.writeLine(footer) : undefined,
    });
    if (header) {
      writer.writeLine(header);
    }
    forumWriters.set(filePath, writer);
  }
  return writer;
};

export const writeForumEntry = (
  writer: ReturnType<typeof createOutputWriter>,
  tsb: Tsb,
  modelSlice: Set<string>,
) => {
  writer.addEntry();
  writer.writeLine(
    `[URL="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}"][B]${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}[/B][/URL] (${dateShortDisplay(tsb.displayDate)})`,
  );

  const recallInfo = recallDetails(tsb);
  if (recallInfo.length > 0) {
    writer.writeLine(`[B]${recallInfo}[/B]`);
  }

  let otherModels = 0;

  for (const tsbModel of tsb.models.sort(tsbModelSort)) {
    if (!isForumMatch([tsbModel], modelSlice)) {
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

export const writeForumHtmlEntry = (
  writer: ReturnType<typeof createOutputWriter>,
  tsb: Tsb,
  modelSlice: Set<string>,
) => {
  writer.addEntry();
  writer.writeLine(
    `<a target="_blank" rel="noopener noreferrer" class="link_external" href="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}"><strong>${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}</strong></a> (${dateShortDisplay(tsb.displayDate)})<br />`,
  );

  const recallInfo = recallDetails(tsb);
  if (recallInfo.length > 0) {
    writer.writeLine(`<strong>${recallInfo}</strong><br />`);
  }

  let otherModels = 0;

  for (const tsbModel of tsb.models.sort(tsbModelSort)) {
    if (!isForumMatch([tsbModel], modelSlice)) {
      otherModels++;
      continue;
    }
    writer.writeLine(
      `${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}<br />`,
    );
  }

  if (otherModels > 0) {
    writer.writeLine(
      `(plus ${otherModels} other model${otherModels === 1 ? '' : 's'})<br />`,
    );
  }

  writer.writeLine(`${tsb.component.replace(/\:/g, ': ')}<br />`);
  writer.writeLine(`${encodeHtml(tsb.summary)}<br />`);
  for (const att of tsb.files) {
    writer.writeLine(
      `<a target="_blank" rel="noopener noreferrer" class="link_external" href="${att.url}">${att.fileName}</a><br />`,
    );
  }
  writer.writeLine('<br />');
};

export const closeForumWriters = async () => {
  for (const writer of forumWriters.values()) {
    await writer.end();
  }
  const size = forumWriters.size;
  forumWriters.clear();
  return size;
};

export const processTsbsForForums = async (
  tsbs: Tsb[],
  make: string,
  models: string[],
) => {
  const allConfiguredModels = new Set(FORUM_MODEL_GROUPS.keys());
  const modelSet = new Set(models);

  //Add chronological forum output organized by model and calendar year
  const thisYear = new Date().getFullYear();
  for (const tsb of tsbs
    .filter((t) => isForumMatch(t.models, modelSet))
    .sort(tsbDateSort)) {
    const tsbYear = tsb.displayDate.getFullYear();

    if (tsbYear !== thisYear) {
      continue;
    }

    for (const model of models) {
      const modelSlice = new Set([model]);
      if (isForumMatch(tsb.models, modelSlice)) {
        const textWriter = getForumWriter({
          filePath: `${make}-${model}/${tsbYear}.txt`,
          header: `[B][SIZE="5"]${tsbYear}[/SIZE][/B]\n\n`,
          footer: FORUM_POST_FOOTER,
        });
        if (textWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
          writeForumEntry(textWriter, tsb, modelSlice);
        }

        const htmlWriter = getForumWriter({
          filePath: `${make}-${model}/${tsbYear}.html`,
          header: `<p><span style="font-size: 150%"><strong>${tsbYear}</strong></span><br /><br />`,
          footer: `</p>${FORUM_POST_HTML_FOOTER}`,
        });
        if (htmlWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
          writeForumHtmlEntry(htmlWriter, tsb, modelSlice);
        }
      }
    }
  }

  //Add reverse chronological forum output organized by model and new/recent
  for (const tsb of tsbs
    .filter((t) => isForumMatch(t.models, allConfiguredModels))
    .sort(tsbDateSortDesc)) {
    const textWriter = getForumWriter({
      filePath: `${make}/ALL.txt`,
      header: `[B][SIZE="5"]Recent Bulletins[/SIZE][/B]\n\n`,
      footer: FORUM_POST_FOOTER,
    });
    if (
      textWriter.lengthWritten() < FORUM_POST_MAX_LENGTH &&
      textWriter.entriesWritten() < 500
    ) {
      writeForumEntry(textWriter, tsb, modelSet);
    }

    const htmlWriter = getForumWriter({
      filePath: `${make}/ALL.html`,
      header: `<p><span style="font-size: 150%"><strong>Recent Bulletins</strong></span><br /><br />`,
      footer: `</p>${FORUM_POST_HTML_FOOTER}`,
    });
    if (
      htmlWriter.lengthWritten() < FORUM_POST_MAX_LENGTH &&
      htmlWriter.entriesWritten() < 500
    ) {
      writeForumHtmlEntry(htmlWriter, tsb, modelSet);
    }

    if (tsb.newData) {
      const textWriter = getForumWriter({
        filePath: `${make}/NEW.txt`,
        header: `[B][SIZE="5"]New ${new Date().toISOString().split('T')[0]}[/SIZE][/B]\n\n`,
        footer: FORUM_POST_FOOTER,
      });
      if (textWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
        writeForumEntry(textWriter, tsb, modelSet);
      }

      const htmlWriter = getForumWriter({
        filePath: `${make}/NEW.html`,
        header: `<p><span style="font-size: 150%"><strong>New ${new Date().toISOString().split('T')[0]}</strong></span><br /><br />`,
        footer: `</p>${FORUM_POST_HTML_FOOTER}`,
      });
      if (htmlWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
        writeForumHtmlEntry(htmlWriter, tsb, modelSet);
      }
    }

    for (const model of models) {
      const modelSlice = new Set([model]);

      if (isForumMatch(tsb.models, modelSlice)) {
        if (tsb.newData) {
          const textWriter = getForumWriter({
            filePath: `${make}-${model}/NEW.txt`,
            header: `[B][SIZE="5"]New ${new Date().toISOString().split('T')[0]}[/SIZE][/B]\n\n`,
            footer: FORUM_POST_FOOTER,
          });
          if (textWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
            writeForumEntry(textWriter, tsb, modelSlice);
          }

          const htmlWriter = getForumWriter({
            filePath: `${make}-${model}/NEW.html`,
            header: `<p><span style="font-size: 150%"><strong>New ${new Date().toISOString().split('T')[0]}</strong></span><br /><br />`,
            footer: `</p>${FORUM_POST_HTML_FOOTER}`,
          });
          if (htmlWriter.lengthWritten() < FORUM_POST_MAX_LENGTH) {
            writeForumHtmlEntry(htmlWriter, tsb, modelSlice);
          }
        }

        const textWriter = getForumWriter({
          filePath: `${make}-${model}/RECENT.txt`,
          header: `[B][SIZE="5"]Recent Bulletins[/SIZE][/B]\n\n`,
          footer: FORUM_POST_FOOTER,
        });
        if (
          textWriter.lengthWritten() < FORUM_POST_MAX_LENGTH &&
          textWriter.entriesWritten() < 100
        ) {
          writeForumEntry(textWriter, tsb, modelSlice);
        }

        const htmlWriter = getForumWriter({
          filePath: `${make}-${model}/RECENT.html`,
          header: `<p><span style="font-size: 150%"><strong>Recent Bulletins</strong></span><br /><br />`,
          footer: `</p>${FORUM_POST_HTML_FOOTER}`,
        });
        if (
          htmlWriter.lengthWritten() < FORUM_POST_MAX_LENGTH &&
          htmlWriter.entriesWritten() < 100
        ) {
          writeForumHtmlEntry(htmlWriter, tsb, modelSlice);
        }
      }
    }
  }

  const writerCount = await closeForumWriters();
  log.info(`Wrote forum output for ${make} ${models} to ${writerCount} files.`);
};
