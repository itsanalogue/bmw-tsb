import fs from 'fs';
import path from 'path';

export const createOutputWriter = (
  fileName: string,
  opts?: { append?: boolean },
) => {
  const dataDir = path.resolve(
    decodeURI(new URL(`../out`, import.meta.url).pathname),
  );

  const filePath = path.join(dataDir, fileName);
  fs.mkdirSync(filePath.substring(0, filePath.lastIndexOf('/')), {
    recursive: true,
  });
  const stream = fs.createWriteStream(filePath, {
    flags: opts?.append ? 'a' : 'w',
    encoding: 'utf8',
  });

  return {
    writeLine: (line: string) =>
      stream.write(line.endsWith('\n') ? line : line + '\n'),
    end: () =>
      new Promise<void>((resolve, reject) => {
        stream.end(() => resolve());
        stream.on('error', (err) => reject(err));
      }),
  };
};
