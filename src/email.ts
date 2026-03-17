import * as nodemailer from 'nodemailer';
import log from './log.js';
import type { Tsb } from './tsb.js';
import {
  dateShortDisplay,
  recallDetails,
  recallIdDisplay,
  sibIdDisplay,
  tsbDateSortDesc,
} from './util.js';
import { isForumMatch } from './forum-update.js';

export interface MailMessage {
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
}

const emailConfig = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  username: process.env.SMTP_USER,
  password: process.env.SMTP_PASS,
  to: process.env.MAIL_TO,
};

export const createEmailNotification = async (
  tsbs: Tsb[],
  make: string,
  models: string[],
  unmappedModels: Set<string>,
) => {
  const modelSet = new Set(models);
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
    .sort(tsbDateSortDesc)) {
    addEmailEntry(
      isForumMatch(tsb.models, modelSet) ? emailModelList : emailMakeList,
      tsb,
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
    if (unmappedModels.size > 0) {
      bodyText += `\n\n============================================================\n`;
      bodyText += `New models found without a matching production code:\n`;
      bodyText += `============================================================\n\n`;
      for (const item of [...unmappedModels]) {
        bodyText += `${item}\n`;
      }
    }
    await sendMessage({
      subject: `New TSBs for ${make} ${emailModelList.length > 0 ? models : ''}`,
      bodyText,
    });
  }
};

export const addEmailEntry = (entries: string[], tsb: Tsb) => {
  let entry = '';
  entry += `${tsb.tsbID ? sibIdDisplay(tsb.tsbID) : recallIdDisplay(tsb.nhtsaID)} (${dateShortDisplay(tsb.displayDate)})\n`;
  entry += `https://www.nhtsa.gov/?nhtsaId=${tsb.nhtsaID}\n`;
  for (const tsbModel of tsb.models) {
    entry += `${tsb.make} ${tsbModel.model} ${[...tsbModel.years].sort()}\n`;
  }
  const recallInfo = recallDetails(tsb);
  if (recallInfo.length > 0) {
    entry += `${recallInfo}\n`;
  }
  entry += `${tsb.component}\n`;
  entry += `${tsb.summary}\n`;
  for (const att of tsb.files) {
    entry += `${att.url}\n`;
  }
  entry += `\n`;
  entries.push(entry);
};

export function sendMessage(message: MailMessage): Promise<void> {
  if (!emailConfig.to || !emailConfig.username || !emailConfig.password) {
    log.warn(
      `EMAIL SERVER NOT CONFIGURED.\n\nSUBJECT: ${message.subject}\n\n${message.bodyText}`,
    );
    return Promise.resolve();
  }
  const transport = nodemailer.createTransport({
    host: emailConfig.smtpHost,
    port: emailConfig.smtpPort ?? 25,
    auth: {
      user: emailConfig.username,
      pass: emailConfig.password,
    },
  });

  const { bodyHtml, bodyText, subject } = message;

  return new Promise((resolve, reject) => {
    transport.sendMail(
      {
        to: [process.env.MAIL_TO ?? 'barryhagan@gmail.com'],
        subject,
        text: bodyText,
        html: bodyHtml,
      },
      (error, info) => {
        if (error) {
          error.message = `Unable to send SMTP message: ${error.message}`;
          reject(error);
        } else {
          resolve();
        }
      },
    );
  });
}
