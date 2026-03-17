import {
  FORUM_MODEL_GROUPS,
  getModelNamesForForum,
  isForumMatch,
} from './forum-update.js';
import {
  dateShortDisplay,
  encodeHtml,
  recallDetails,
  recallIdDisplay,
  sibIdDisplay,
  tsbDateSortDesc,
} from './util.js';
import { createOutputWriter } from './output.js';
import type { Tsb } from './tsb.js';
import log from './log.js';

const ghWriters = new Map<string, ReturnType<typeof createOutputWriter>>();

export const getGitHubWriter = (props: {
  filePath: string;
  model: string;
  modelSet: Set<string>;
}) => {
  const { filePath, model, modelSet } = props;
  let writer = ghWriters.get(filePath);
  if (!writer) {
    writer = createOutputWriter(filePath, {
      onEnd: writePageFooter,
    });
    writePageHeader(writer, model, modelSet);
    ghWriters.set(filePath, writer);
  }
  return writer;
};

export const writePageHeader = (
  writer: ReturnType<typeof createOutputWriter>,
  model: string,
  modelSet: Set<string>,
) => {
  const modelOptions = [...modelSet]
    .sort()
    .map(
      (m) =>
        `<option value="${m}.html"${m === model ? ' selected' : ''}>${m} (${getModelNamesForForum(m).join(', ')})</option>`,
    )
    .join('');
  writer.writeLine(`
    <html>
    <head>
        <meta name="google-site-verification" content="HScbMG7aOOk4Y2jsTrsQxHC6bvbEMw76JaXmxbNumhg" />
        <title>BMW ${model} Service Bulletins</title>        
        <style>
            body {
                background: rgba(246, 246, 246, 1);
                font-family: Helvetica Neue,-apple-system,"system-ui",serif;                
            }
            .content {
                background: #ffffff;
                color:#414141;
                margin-left: 15%;
                margin-right: 15%;
            }
            
            .contentHead {
               color: rgb(68,68,68);
               padding: 20px;
               font-size: 32px;
               font-weight: 700;               
            }
            
            a {
                color: rgb(8, 8, 200)
            }

            dl {
                line-height: px2em(27px);
            }

            dl, dt {
                margin: 0;
                padding: 0;
                font-size: px2em(12px);
            }

            .dlBox {
                padding: 20px;                
                border-bottom-width: 5px;
                border-bottom-style: solid;
                border-bottom-color: rgba(246, 246, 246, 1);
            }
            .dtHead {
                font-weight: bold;
                margin-top: 20px;
                margin-bottom: 10px;
            }

            .ddHead {
                margin-top: 10px;
            }
            .ddRecall {
                font-weight: bold;
                margin-bottom: 10px;
            }
            .modelSelect {
                margin-left: 20px;
            }
            .modelLink {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 20px;
                margin-right: 10px;
            }
            .modelLinkSelected {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 20px;
                margin-right: 10px;
                font-weight: bold;
            }
            .modelLink select, .modelLinkSelected select {
                font-size: 18px;
                padding: 4px 8px;
            }
        </style>
    </head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-YMSCSBZQ3D"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-YMSCSBZQ3D');
    </script>
    <body>
      <div class="content">
        <div class="dlBox">
          <div class="contentHead">BMW ${model} Service Bulletins</div>
          <div class="modelSelect">
            <label class="modelLink">MODEL:
              <select id="modelSelect" onchange="if(this.value) window.location.href=this.value">
                <option value="index.html"${model === '' ? ' selected' : ''}>ALL</option>
                ${modelOptions}
              </select>
            </label>
          </div>
        </div>
        <div>
            <dl>`);
};

export const writeSibEntry = (
  writer: ReturnType<typeof createOutputWriter>,
  tsb: Tsb,
  modelSlice: Set<string>,
) => {
  writer.addEntry();
  writer.writeLine('');
  writer.writeLine(
    `<div class="dlBox"><dt class="dtHead"><a href="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}" target="offsite">${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}</a>  (${dateShortDisplay(tsb.displayDate)})</dt>`,
  );

  const recallInfo = recallDetails(tsb);
  if (recallInfo.length > 0) {
    writer.writeLine(`<dd class="ddRecall">${recallInfo}</dd>`);
  }

  let otherModels = 0;

  for (const tsbModel of tsb.models.sort((a, b) =>
    a.model.localeCompare(b.model),
  )) {
    if (!isForumMatch([tsbModel], modelSlice)) {
      otherModels++;
      continue;
    }
    writer.writeLine(
      `<dd>${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}</dd>`,
    );
  }
  if (otherModels > 0) {
    writer.writeLine(
      `<dd>(plus ${otherModels} other model${otherModels === 1 ? '' : 's'})</dd>`,
    );
  }
  writer.writeLine(`<dd class="ddHead"><b>${tsb.component}</b></dd>`);
  writer.writeLine(`<dd>${encodeHtml(tsb.summary)}</dd>`);
  for (const att of tsb.files) {
    writer.writeLine(
      `<dd class="ddHead"><a href="${att.url}" target="offsite">${att.fileName}</a></dd>`,
    );
  }
  writer.writeLine('</div>');
};

export const writePageFooter = (
  writer: Pick<ReturnType<typeof createOutputWriter>, 'writeLine'>,
) => {
  writer.writeLine(`
            </dl>
        </div>
      </div>
    </body>
</html>`);
};

export const closeGitHubWriters = async () => {
  for (const writer of ghWriters.values()) {
    await writer.end();
  }

  const ghSiteMap = createOutputWriter(`gh-pages/sitemap.txt`);
  for (const pageKey of [...ghWriters.keys()]
    .map((k) => k.replace('gh-pages/', ''))
    .sort()) {
    ghSiteMap.writeLine(`https://itsanalogue.github.io/bmw-tsb/${pageKey}`);
  }
  await ghSiteMap.end();

  const size = ghWriters.size;
  ghWriters.clear();
  return size;
};

export const processTsbsForGithubPages = async (
  tsbs: Tsb[],
  make: string,
  models: string[],
) => {
  const allConfiguredModels = new Set(FORUM_MODEL_GROUPS.keys());
  const modelSet = new Set(models);

  for (const tsb of tsbs
    .filter((t) => isForumMatch(t.models, allConfiguredModels))
    .sort(tsbDateSortDesc)) {
    if (tsb.newData) {
      const ghNewWriter = getGitHubWriter({
        filePath: `gh-pages/new.html`,
        model: 'New',
        modelSet: allConfiguredModels,
      });
      writeSibEntry(ghNewWriter, tsb, modelSet);
    }

    const ghRecentWriter = getGitHubWriter({
      filePath: `gh-pages/index.html`,
      model: '',
      modelSet: allConfiguredModels,
    });
    if (ghRecentWriter.entriesWritten() < 500) {
      writeSibEntry(ghRecentWriter, tsb, modelSet);
    }

    for (const model of [...allConfiguredModels]) {
      const modelSlice = new Set([model]);
      if (isForumMatch(tsb.models, modelSlice)) {
        const ghModelWriter = getGitHubWriter({
          filePath: `gh-pages/${model}.html`,
          model,
          modelSet: allConfiguredModels,
        });
        writeSibEntry(ghModelWriter, tsb, modelSlice);
      }
    }
  }

  const ghWriterCount = await closeGitHubWriters();
  log.info(`Wrote gh-pages output for ${make} to ${ghWriterCount} files.`);
};
