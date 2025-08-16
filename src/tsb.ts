import AdmZip from 'adm-zip';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { readJson, writeJson } from './storage.js';
import type { TsbDataStore } from './database.js';

const TSB_HEADERS = [
  'nhtsaID',
  '_replID',
  'nhtsaDate',
  'tsbID',
  'manufacturerDate',
  '_manufacturerID',
  'type',
  'make',
  'model',
  'year',
  'component',
  '_manufacturerComponent',
  '_manufacturerSubcomponent',
  'summary',
] as const;

const FLAT_RCL_HEADERS = [
  '_recordID',
  'nhtsaID',
  'make',
  'model',
  'year',
  '_manufacturerID',
  'component',
  '_reportingManufacturerName',
  'beginManufacture',
  'endManufacture',
  'type',
  'potentialNumberAffected',
  '_ownerNotificationDate',
  '_influencedBy',
  '_manufacturerName',
  'nhtsaDate',
  'manufacturerDate',
  '_RPNO',
  '_FMVSS',
  'summary',
] as const;

const NHTSA_TSB_SOURCE_ROOT = 'https://static.nhtsa.gov/odi/ffdd/tsbs/';
const NHTSA_RECALL_SOURCE_ROOT = 'https://static.nhtsa.gov/odi/ffdd/rcl/';
const NHTSA_TSB_ISSUES_ROOT =
  'https://api.nhtsa.gov/safetyIssues/byNhtsaId?name=&nhtsaId=';

const TSB_SOURCES: TsbDataStore['sources'][0][] = [
  {
    type: 'tsb',
    fileBaseName: 'TSBS_RECEIVED_2020-2024',
    active: false,
    cacheDate: undefined,
  },
  {
    type: 'tsb',
    fileBaseName: 'TSBS_RECEIVED_2025-2025',
    active: true,
    cacheDate: undefined,
  },
  // Yearly recall files are not properly updating ATM, so read the big one instead
  //{ type: 'recall', fileBaseName: 'RCL_FROM_2020_2024', active: false, cacheDate: undefined },
  //{ type: 'recall', fileBaseName: 'RCL_FROM_2025_2025', active: true, cacheDate: undefined },
  {
    type: 'recall',
    fileBaseName: 'FLAT_RCL_POST_2010',
    active: true,
    cacheDate: undefined,
  },
];
export interface TsbTextRow {
  nhtsaID: string;
  nhtsaDate: string;
  tsbID?: string;
  manufacturerDate: string;
  type: string;
  make: string;
  model: string;
  year: string;
  component: string;
  summary: string;
  potentialNumberAffected?: string;
  beginManufacture?: string;
  endManufacture?: string;
}

export interface Tsb extends Omit<TsbTextRow, 'model'> {
  models: { model: string; years: Set<string> }[];
  files: TsbDataStore['files'][0];
  matchingModel: boolean;
  newData: boolean;
}

export async function readTsbFiles(
  dataStore: TsbDataStore,
  make: string,
): Promise<TsbTextRow[]> {
  const dataDir = path.resolve(new URL('../data', import.meta.url).pathname);
  const records: TsbTextRow[] = [];
  for (const sourceConfig of TSB_SOURCES) {
    const source = dataStore.sources[sourceConfig.fileBaseName] ?? sourceConfig;

    const zipUrl = `${sourceConfig.type === 'tsb' ? NHTSA_TSB_SOURCE_ROOT : NHTSA_RECALL_SOURCE_ROOT}${source.fileBaseName}.zip`;
    const zipPath = path.join(dataDir, `${source.fileBaseName}.zip`);
    const txtPath = path.join(dataDir, `${source.fileBaseName}.txt`);
    const jsonPath = path.join(dataDir, `${make}.${source.fileBaseName}.json`);

    let download = !fs.existsSync(jsonPath);

    if (!download && source.active) {
      const head = await fetch(zipUrl, { method: 'HEAD' });
      if (head.ok) {
        const lastMod =
          head.headers.get('last-modified') ?? head.headers.get('date');
        const remoteDate = lastMod ? new Date(lastMod) : undefined;
        if (
          !source.cacheDate ||
          (remoteDate &&
            remoteDate.getTime() > new Date(source.cacheDate).getTime())
        ) {
          download = true;
        }
      } else {
        throw new Error(
          `Refresh source check for ${source.fileBaseName} returned ${head.status} ${head.statusText}`,
        );
      }
    }

    if (download) {
      // Ensure data directory exists
      await fsPromises.mkdir(dataDir, { recursive: true });

      const getRes = await fetch(zipUrl);
      if (!getRes.ok)
        throw new Error(`Failed to download ${zipUrl}: ${getRes.status}`);

      const lastMod =
        getRes.headers.get('last-modified') ?? getRes.headers.get('date');
      const remoteDate = lastMod ? new Date(lastMod) : undefined;
      source.cacheDate = remoteDate;

      const buffer = Buffer.from(await getRes.arrayBuffer());
      await fsPromises.writeFile(zipPath, buffer);

      try {
        if (fs.existsSync(txtPath)) {
          fs.unlinkSync(txtPath);
        }
        if (fs.existsSync(jsonPath)) {
          fs.unlinkSync(jsonPath);
        }
        const sourceZip = new AdmZip(zipPath);
        sourceZip.extractAllTo(dataDir);
      } finally {
        fs.unlinkSync(zipPath);
      }
    }

    // eslint-disable-next-line require-atomic-updates
    dataStore.sources[sourceConfig.fileBaseName] = source;

    let fileRecords = readJson<TsbTextRow[]>(jsonPath) ?? [];

    if (!fileRecords || fileRecords.length === 0) {
      fileRecords = [];
      try {
        const rl = readline.createInterface({
          input: fs.createReadStream(txtPath, { encoding: 'utf8' }),
          crlfDelay: Infinity,
        });

        for await (const line of rl) {
          if (!line || !line.trim()) continue;
          const cols = line.split('\t');
          const obj: Partial<TsbTextRow> = {};
          const headers =
            source.type === 'tsb' ? TSB_HEADERS : FLAT_RCL_HEADERS;
          headers.forEach((h, i) => {
            if (h.startsWith('_')) {
              return;
            }
            const key = h as keyof TsbTextRow;
            const raw = (cols[i] ?? '').trim();
            const value = key === 'summary' ? sanitizeSummary(raw) : raw;
            (obj as TsbTextRow)[key] = value;
          });

          let validForMake = obj.make === make;
          if (make === 'BMW' && obj.tsbID && obj.tsbID.startsWith('M')) {
            validForMake = false;
          }
          if (validForMake) {
            fileRecords.push(obj as TsbTextRow);
          }
        }
        await writeJson(jsonPath, fileRecords);
      } finally {
        if (fs.existsSync(txtPath)) {
          fs.unlinkSync(txtPath);
        }
      }
    }
    records.push(...fileRecords);
  }

  return records;
}

export async function getTsbs(
  dataStore: TsbDataStore,
  records: TsbTextRow[],
  model?: string,
): Promise<Tsb[]> {
  const groups = new Map<string, TsbTextRow[]>();
  for (const rec of records) {
    const groupKey = rec.tsbID ?? rec.nhtsaID;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(rec);
  }

  const tsbs: Tsb[] = [];

  for (const [, group] of groups.entries()) {
    const modelYears = new Map<string, Set<string>>();
    for (const r of group) {
      const model = r.model;
      const year = r.year;
      if (!modelYears.has(model)) modelYears.set(model, new Set());
      if (year) modelYears.get(model)!.add(year);
    }

    const latest = group.sort((a, b) =>
      b.manufacturerDate.localeCompare(a.manufacturerDate),
    )[0];

    const models = Array.from(modelYears.entries()).map(
      ([model, yearsSet]) => ({
        make: latest.make,
        model,
        years: yearsSet,
      }),
    );

    const issueId = latest.tsbID ?? latest.nhtsaID;
    const matchingModel = !!model && models.some((m) => m.model === model);
    let newData = false;
    let files: TsbDataStore['files'][0] = [];

    const lastUpdate = dataStore.tsbDates[issueId] ?? '19700101';
    if (latest.manufacturerDate.localeCompare(lastUpdate) > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `SIB UPDATE ${issueId}: ${dataStore.tsbDates[issueId] ?? ''} -> ${latest.manufacturerDate}`,
      );
      dataStore.tsbDates[issueId] = latest.manufacturerDate;
      newData = true;
    }

    if (
      newData &&
      (matchingModel || latest.manufacturerDate.localeCompare('20250801') > 0)
    ) {
      try {
        files = await resolveAssociatedDocuments(
          dataStore,
          latest.nhtsaID,
          latest.tsbID,
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to read associated documents for ${latest.tsbID ?? latest.nhtsaID}: ${(error as Error).message}`,
        );
      }
    }

    if (newData || matchingModel) {
      tsbs.push({
        ...latest,
        models,
        matchingModel,
        newData,
        files,
      });
    }
  }

  return tsbs;
}

export function sanitizeSummary(s: string): string {
  if (!s) return s;
  let out = s;
  // Common mojibake sequences observed in dataset
  //out = out.replace(/â|â|â?\?\u009d|â\?\u009d/g, '"');
  //out = out.replace(/â|â\u009d/g, '"');
  //out = out.replace(/[ÂÃ¢\u0080\u0082\u00083]+/g, '"');
  out = out.replace(/[ÂÃ¢\u0080\u0082\u0083\u009C\u009D]+/g, '"');
  //out = out.replace(/â/g, '');
  //out = out.replace(/Â/g, '"');
  //out = out.replace(/â/g, ' ');
  // Remove other non-printable / control characters
  // eslint-disable-next-line no-control-regex
  out = out.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
  // Normalize repeated whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

export async function resolveAssociatedDocuments(
  dataStore: TsbDataStore,
  nhtsaID: string,
  tsbID?: string,
): Promise<TsbDataStore['files'][0]> {
  const getRes = await fetch(`${NHTSA_TSB_ISSUES_ROOT}${nhtsaID}`);
  if (!getRes.ok)
    throw new Error(
      `Failed to download TSB safety issues for ${nhtsaID}: ${getRes.status}`,
    );
  const data = (await getRes.json()) as {
    results: {
      recalls?: {
        nhtsaCampaignNumber: string;
        associatedDocuments: {
          fileName: string;
          url: string;
          summary: string;
        }[];
      }[];
      manufacturerCommunications?: {
        manufacturerCommunicationNumber: string;
        associatedDocuments: { fileName: string; url: string }[];
      }[];
    }[];
  };

  dataStore.files[nhtsaID] = [];

  const mcs = data.results.flatMap((r) =>
    (r.manufacturerCommunications ?? [])
      .filter((c) => c.manufacturerCommunicationNumber === tsbID)
      .flatMap((c) => c.associatedDocuments),
  );
  dataStore.files[nhtsaID].push(
    ...mcs.map((a) => ({ fileName: a.fileName, url: a.url })),
  );
  const recalls = data.results.flatMap((r) =>
    (r.recalls ?? [])
      .filter((c) => c.nhtsaCampaignNumber === nhtsaID)
      .flatMap((c) =>
        c.associatedDocuments.filter(
          (d) => d.summary === 'Remedy Instructions and TSB',
        ),
      ),
  );
  dataStore.files[nhtsaID].push(
    ...recalls.map((a) => ({ fileName: a.fileName, url: a.url })),
  );
  return dataStore.files[nhtsaID];
}
