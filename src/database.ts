import fs from 'fs';
import path from 'path';
import { readJson, writeJson } from './storage.js';
import { isAllowEmptyState } from './run-mode.js';

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
  forumPostHashes: { [postId: string]: string };
}

/** State shared between all runners via the `state` git branch. */
export type SharedDataStore = Pick<
  TsbDataStore,
  'files' | 'tsbDates' | 'forumPostHashes'
>;
export const SHARED_SECTIONS = [
  'files',
  'tsbDates',
  'forumPostHashes',
] as const satisfies readonly (keyof SharedDataStore)[];

/** Per-machine state describing the downloads cached in data/. */
type LocalDataStore = Pick<TsbDataStore, 'sources'>;

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
export const stateDir = path.resolve(
  repoRoot,
  process.env.STATE_DIR ?? '.state',
);
export const sharedStorePath = path.join(stateDir, 'dataStore.json');
const dataDir = path.join(repoRoot, 'data');
const localStorePath = path.join(dataDir, 'sources.json');
/** Cookies from passing the forum's altcha verification, reused across runs. */
const humanVerifyPath = path.join(dataDir, 'human-verify.json');
/** Pre-split store that held everything; only read to migrate `sources`. */
const legacyStorePath = path.join(dataDir, 'dataStore.json');

const sortKeys = <T extends object>(obj: T): T =>
  Object.fromEntries(
    // Code-point order: stable across machines, unlike locale-aware sorting.
    Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ) as T;

export const readSharedStore = (): SharedDataStore => {
  const store = readJson<Partial<SharedDataStore> | undefined>(
    sharedStorePath,
    undefined,
  );
  if (!store) {
    if (!isAllowEmptyState()) {
      throw new Error(
        `Shared state ${sharedStorePath} not found. Run with STATE_SYNC=1 to pull it, or set ALLOW_EMPTY_STATE=1 to start empty.`,
      );
    }
  }
  const shared: SharedDataStore = {
    files: store?.files ?? {},
    tsbDates: store?.tsbDates ?? {},
    forumPostHashes: store?.forumPostHashes ?? {},
  };
  if (
    Object.keys(shared.forumPostHashes).length === 0 &&
    !isAllowEmptyState()
  ) {
    throw new Error(
      `Shared state ${sharedStorePath} has no forum post hashes; refusing to run because every forum post would be resent. Set ALLOW_EMPTY_STATE=1 to override.`,
    );
  }
  return shared;
};

export const writeSharedStore = async (store: SharedDataStore) => {
  await fs.promises.mkdir(stateDir, { recursive: true });
  const sorted = Object.fromEntries(
    SHARED_SECTIONS.map((section) => [section, sortKeys(store[section])]),
  );
  await writeJson(sharedStorePath, sorted);
};

export const snapshotSharedStore = (
  dataStore: SharedDataStore,
): SharedDataStore =>
  structuredClone({
    files: dataStore.files,
    tsbDates: dataStore.tsbDates,
    forumPostHashes: dataStore.forumPostHashes,
  });

const readLocalStore = (): LocalDataStore => {
  const local =
    readJson<Partial<LocalDataStore> | undefined>(localStorePath, undefined) ??
    readJson<Partial<LocalDataStore> | undefined>(legacyStorePath, undefined);
  return { sources: local?.sources ?? {} };
};

export const readDatabase = (): TsbDataStore => ({
  ...readLocalStore(),
  ...readSharedStore(),
});

export const saveDatabase = async (dataStore: TsbDataStore) => {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await writeJson(localStorePath, { sources: dataStore.sources });
  await writeSharedStore(dataStore);
};

interface HumanVerifyStore {
  cookies: string[];
  obtainedAt: string;
}

/** Cached altcha verification cookies (`name=value`), or [] if none. */
export const readHumanVerifyCookies = (): string[] => {
  try {
    return (
      readJson<HumanVerifyStore | undefined>(humanVerifyPath, undefined)
        ?.cookies ?? []
    );
  } catch {
    return [];
  }
};

export const writeHumanVerifyCookies = async (cookies: string[]) => {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await writeJson(humanVerifyPath, {
    cookies,
    obtainedAt: new Date().toISOString(),
  } satisfies HumanVerifyStore);
};
