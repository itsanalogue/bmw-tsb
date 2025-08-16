import * as nodemailer from 'nodemailer';

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

export function sendMessage(message: MailMessage): Promise<void> {
  if (!emailConfig.to || !emailConfig.username || !emailConfig.password) {
    return Promise.reject(new Error('The email configuration is incomplete'));
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
