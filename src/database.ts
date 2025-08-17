import path from 'path';
import { readJson, writeJson } from './storage.js';
export interface TsbDataStore {
  sources: {
    [key: string]: {
      fileBaseName: string;
      type: 'tsb' | 'recall';
      active: boolean;
      cacheDate?: Date;
    };
  };
  files: { [key: string]: { fileName: string; url: string }[] };
  tsbDates: { [id: string]: string };
}

const dataStorePath = () => {
  const dataDir = path.resolve(new URL('../data', import.meta.url).pathname);
  const dataStorePath = path.join(dataDir, 'dataStore.json');
  return dataStorePath;
};

export const readDatabase = () => {
  const dataStore = readJson<TsbDataStore>(dataStorePath(), {
    sources: {},
    files: {},
    tsbDates: {},
  });
  if (!dataStore.sources) {
    dataStore.sources = {};
  }
  if (!dataStore.files) {
    dataStore.files = {};
  }
  if (!dataStore.tsbDates) {
    dataStore.tsbDates = {};
  }
  return dataStore;
};

export const saveDatabase = async (dataStore: TsbDataStore) => {
  await writeJson(dataStorePath(), dataStore);
};
