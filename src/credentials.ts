import readline from 'readline/promises';
import { isDryRun, isGithubActions, isMarkForumPosted } from './run-mode.js';

const readVisible = async (question: string) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
};

/** Read a line without echoing it. Ctrl-C exits the process. */
const readHidden = (question: string) =>
  new Promise<string>((resolve) => {
    const stdin = process.stdin;
    let value = '';
    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        switch (ch) {
          case '\r':
          case '\n':
          case '\u0004': // Ctrl-D
            finish();
            resolve(value.trim());
            return;
          case '\u0003': // Ctrl-C
            finish();
            process.exit(130);
            return;
          case '\u007f': // Backspace
          case '\b':
            value = value.slice(0, -1);
            break;
          default:
            value += ch;
        }
      }
    };
    process.stdout.write(question);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });

/**
 * When running interactively in a mode that posts to the forums, ask for any
 * forum credentials missing from the environment. Values are only kept in
 * process.env for this run. HV_COOKIE is optional: set it to an empty value
 * (HV_COOKIE=) to skip the prompt.
 */
export const promptForMissingCredentials = async () => {
  if (
    !process.stdin.isTTY ||
    isGithubActions() ||
    isDryRun() ||
    isMarkForumPosted()
  ) {
    return;
  }
  if (!process.env.FORUM_USERNAME) {
    process.env.FORUM_USERNAME = await readVisible('Forum username: ');
  }
  if (!process.env.FORUM_PASSWORD) {
    process.env.FORUM_PASSWORD = await readHidden('Forum password: ');
  }
  if (process.env.HV_COOKIE === undefined) {
    process.env.HV_COOKIE = await readHidden(
      'human_verify cookie (optional, Enter to skip): ',
    );
  }
};
