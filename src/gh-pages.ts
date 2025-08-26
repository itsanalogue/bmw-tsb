import {
  dateShortDisplay,
  recallDetails,
  recallIdDisplay,
  sibIdDisplay,
} from './index.js';
import { isModelMatch } from './model-match.js';
import type { createOutputWriter } from './output.js';
import type { Tsb } from './tsb.js';

export const writePageHeader = (
  writer: ReturnType<typeof createOutputWriter>,
  model: string,
) => {
  writer.writeLine(`
    <html>
    <head>
        <title>BMW ${model} Service Bulletins</title>        
        <style>
            body {
                color:#414141;
                font-family: Helvetica Neue,-apple-system,"system-ui",serif;                
                margin-left: 20%;
                margin-right: 20%;
            }

            hr {
                unicode-bidi: isolate;
                margin-block-start: 0.5em;
                margin-block-end: 0.5em;
                margin-inline-start: auto;
                margin-inline-end: auto;
                overflow: hidden;
            }

            dl {
                line-height: px2em(27px);
            }

            dl, dt {
                margin: 0;
                padding: 0;
                font-size: px2em(12px);
            }

            dt {
                
            }

            .dtHead {
                font-weight: bold;
                margin-top: 40px;
                margin-bottom: 10px;
            }

            .dtFoot {
                margin-top: 10px;
            }
            .modelLink {
                font-size: 20px;
                font-weight: bold;
                margin-right: 10px;    
            }
        </style>
    </head>
    <body>
        <h1>BMW ${model} Service Bulletins</h1>
        <hr/>
        <div>
            <dl>`);
};

export const writeSibEntry = (
  writer: ReturnType<typeof createOutputWriter>,
  tsb: Tsb,
  date: Date,
  modelSlice: Set<string>,
) => {
  writer.writeLine(`
            <dt class="dtHead"><a href="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}" target="offsite">${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}</a>  (${dateShortDisplay(date)})</dt>
        `);

  const recallInfo = recallDetails(tsb);
  const otherModels =
    tsb.models.length > 2 ? ` plus ${tsb.models.length - 1} other models` : '';
  const extraModelInfo =
    otherModels.length > 0 || recallInfo.length > 0
      ? ` (${otherModels}${recallInfo} )`
      : '';

  for (const tsbModel of tsb.models) {
    if (!isModelMatch([tsbModel], modelSlice)) {
      continue;
    }
    writer.writeLine(
      `<dt>${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}${extraModelInfo}</dt>`,
    );
  }
  writer.writeLine(`<dt class="dtFoot"><b>${tsb.component}</b></dt>`);
  writer.writeLine(`<dt>${tsb.summary}</dt>`);
  for (const att of tsb.files) {
    writer.writeLine(
      `<dt class="dtFoot"><a href="${att.url}" target="offsite">${att.fileName}</a></dt>`,
    );
  }
  writer.writeLine('<hr class="dtFoot"/>');
};

export const writePageFooter = (
  writer: ReturnType<typeof createOutputWriter>,
) => {
  writer.writeLine(`
            </dl>
        </div>
    </body>
</html>`);
};
