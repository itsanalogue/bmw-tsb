import fs from 'fs';
import path from 'path';

export const getOutputPath = (fileName: string) => {
  const outputFolder = path.resolve(
    decodeURI(new URL('../out', import.meta.url).pathname),
  );
  const outputPath = path.join(outputFolder, fileName);
  return outputPath;
};

export const createOutputWriter = (
  fileName: string,
  opts?: {
    append?: boolean;
    onEnd?: (writer: { writeLine: (line: string) => void }) => void;
  },
) => {
  let lengthWritten = 0;
  let entriesWritten = 0;

  const filePath = getOutputPath(fileName);
  fs.mkdirSync(filePath.substring(0, filePath.lastIndexOf('/')), {
    recursive: true,
  });

  const stream = fs.createWriteStream(filePath, {
    flags: opts?.append ? 'a' : 'w',
    encoding: 'utf8',
  });

  const writeLine = (line: string) => {
    const terminated = line.endsWith('\n');
    stream.write(terminated ? line : line + '\n');
    lengthWritten += line.length;
    lengthWritten += terminated ? 0 : 1;
  };

  return {
    addEntry: () => ++entriesWritten,
    entriesWritten: () => entriesWritten,
    lengthWritten: () => lengthWritten,
    writeLine,
    end: () =>
      new Promise<void>((resolve, reject) => {
        if (opts?.onEnd) {
          opts.onEnd({ writeLine });
        }
        stream.end(() => resolve());
        stream.on('error', (err) => reject(err));
      }),
  };
};
