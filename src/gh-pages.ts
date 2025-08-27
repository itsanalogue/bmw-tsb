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
  modelSet: Set<string>,
) => {
  writer.writeLine(`
    <html>
    <head>
        <meta name="google-site-verification" content="HScbMG7aOOk4Y2jsTrsQxHC6bvbEMw76JaXmxbNumhg" />
        <title>BMW ${model} Service Bulletins</title>        
        <style>
            body {
                color:#414141;
                font-family: Helvetica Neue,-apple-system,"system-ui",serif;                
                margin-left: 15%;
                margin-right: 15%;
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
            .dtRecall {
                font-weight: bold;
                margin-bottom: 10px;
            }
            .modelLink {
                font-size: 20px;
                margin-right: 10px;    
            }
            .modelLinkSelected {
                font-size: 20px;
                margin-right: 10px;    
                font-weight: bold;
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
        <h1>BMW ${model} Service Bulletins</h1>
        <hr/>
        
          <div><span class="modelLink">By Model:</span><span class=${model === '' ? 'modelLinkSelected' : 'modelLink'}><a href="index.html">ALL</a></span>${[
            ...modelSet,
          ]
            .sort()
            .map(
              (m) =>
                `<span class=${m === model ? 'modelLinkSelected' : 'modelLink'}><a href="${m}.html">${m}</a></span>`,
            )
            .join('')}
          <hr/>
          </div>
        <div>
            <dl>`);
};

export const writeSibEntry = (
  writer: ReturnType<typeof createOutputWriter>,
  tsb: Tsb,
  date: Date,
  modelSlice: Set<string>,
) => {
  writer.writeLine('');
  writer.writeLine(
    `<dt class="dtHead"><a href="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}" target="offsite">${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}</a>  (${dateShortDisplay(date)})</dt>`,
  );

  const recallInfo = recallDetails(tsb);
  if (recallInfo.length > 0) {
    writer.writeLine(`<dt class="dtRecall">${recallInfo}</dt>`);
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
      `<dt>${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}</dt>`,
    );
  }
  if (otherModels > 0) {
    writer.writeLine(
      `<dt>(plus ${otherModels} other model${otherModels === 1 ? '' : 's'})</dt>`,
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
