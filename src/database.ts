import path from "path";
import { readJson, writeJson } from "./storage";
import { TsbDataStore } from "./tsb";

const dataStorePath = () => {
  const dataDir = path.resolve(new URL("../data", import.meta.url).pathname);
  const dataStorePath = path.join(dataDir, "dataStore.json");
  return dataStorePath;
};

export const readDatabase = () => {
  const dataStore = readJson<TsbDataStore>(dataStorePath(), {
    sources: {},
    files: {},
  });
  return dataStore;
};

export const saveDatabase = async (dataStore: TsbDataStore) => {
  await writeJson(dataStorePath(), dataStore);
};
