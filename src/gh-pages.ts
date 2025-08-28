import {
  dateShortDisplay,
  recallDetails,
  recallIdDisplay,
  sibIdDisplay,
} from './index.js';
import { isModelMatch, MODEL_DEFINITIONS } from './model-match.js';
import type { createOutputWriter } from './output.js';
import type { Tsb } from './tsb.js';

export const writePageHeader = (
  writer: ReturnType<typeof createOutputWriter>,
  model: string,
  modelSet: Set<string>,
) => {
  const modelOptions = [...modelSet]
    .sort()
    .map(
      (m) =>
        `<option value="${m}.html"${m === model ? ' selected' : ''}>${m} (${[...(MODEL_DEFINITIONS.get(m)?.models?.keys() ?? [])].join(', ')})</option>`,
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
  date: Date,
  modelSlice: Set<string>,
) => {
  writer.writeLine('');
  writer.writeLine(
    `<div class="dlBox"><dt class="dtHead"><a href="https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}" target="offsite">${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)}</a>  (${dateShortDisplay(date)})</dt>`,
  );

  const recallInfo = recallDetails(tsb);
  if (recallInfo.length > 0) {
    writer.writeLine(`<dd class="ddRecall">${recallInfo}</dd>`);
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
      `<dd>${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}</dd>`,
    );
  }
  if (otherModels > 0) {
    writer.writeLine(
      `<dd>(plus ${otherModels} other model${otherModels === 1 ? '' : 's'})</dd>`,
    );
  }
  writer.writeLine(`<dd class="ddHead"><b>${tsb.component}</b></dd>`);
  writer.writeLine(`<dd>${tsb.summary}</dd>`);
  for (const att of tsb.files) {
    writer.writeLine(
      `<dd class="ddHead"><a href="${att.url}" target="offsite">${att.fileName}</a></dd>`,
    );
  }
  writer.writeLine('</div>');
};

export const writePageFooter = (
  writer: ReturnType<typeof createOutputWriter>,
) => {
  writer.writeLine(`
            </dl>
        </div>
      </div>
    </body>
</html>`);
};
