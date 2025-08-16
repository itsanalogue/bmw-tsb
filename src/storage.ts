import fs from 'fs';

export const readJson = <T>(filePath: string, defaultT?: T): T => {
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    const storeJson = JSON.parse(fileBuffer.toString()) as T;
    return storeJson;
  }
  return defaultT as T;
};

export const writeJson = async (
  filePath: string,
  data: unknown,
): Promise<void> => {
  const json = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(filePath, json);
};
