import fs from 'fs';
import path from 'path';

export const createOutputWriter = (
  make: string,
  model: string,
  fileName: string,
  opts?: { append?: boolean },
) => {
  const dataDir = path.resolve(
    decodeURI(new URL(`../out/${make}-${model}`, import.meta.url).pathname),
  );

  fs.mkdirSync(dataDir, { recursive: true });
  const filePath = path.join(dataDir, fileName);
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
