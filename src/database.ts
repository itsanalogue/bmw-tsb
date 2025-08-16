import path from 'path';
import { readJson, writeJson } from './storage.js';
import { type TsbDataStore } from './tsb.js';

const dataStorePath = () => {
  const dataDir = path.resolve(new URL('../data', import.meta.url).pathname);
  const dataStorePath = path.join(dataDir, 'dataStore.json');
  return dataStorePath;
};

export const readDatabase = () => {
  const dataStore = readJson<TsbDataStore>(dataStorePath(), {
    sources: {},
    files: {},
    tsbIds: [],
  });
  return dataStore;
};

export const saveDatabase = async (dataStore: TsbDataStore) => {
  await writeJson(dataStorePath(), dataStore);
};
