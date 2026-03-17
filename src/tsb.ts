import AdmZip from 'adm-zip';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { readJson, writeJson } from './storage.js';
import type { TsbDataStore } from './database.js';
import log from './log.js';
import { getModelCode } from './model-codes.js';
import { isForumMatch } from './forum-update.js';

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

export interface TsbModelCorrection {
  type: 'add' | 'remove';
  model: string;
  years: string[];
}

export interface Tsb extends Omit<TsbTextRow, 'model'> {
  models: { code: string; model: string; years: Set<string> }[];
  displayDate: Date;
  files: TsbDataStore['files'][0];
  newData: boolean;
}

const NHTSA_CORRECTIONS: Map<string, Partial<TsbTextRow>> = new Map([
  ['11013037', { tsbID: 'B011824' }],
]);

const TSB_CORRECTIONS: Map<string, TsbModelCorrection[]> = new Map([
  [
    'B650226',
    [
      {
        type: 'remove',
        model: '230I',
        years: ['2025'],
      },
      {
        type: 'add',
        model: '228I',
        years: ['2025'],
      },
    ],
  ],
  [
    'B660725',
    [
      {
        type: 'add',
        model: 'M2',
        years: ['2024'],
      },
      {
        type: 'add',
        model: 'M3',
        years: ['2024'],
      },
      {
        type: 'add',
        model: 'M4',
        years: ['2024'],
      },
      {
        type: 'add',
        model: 'M5',
        years: ['2024'],
      },
      {
        type: 'add',
        model: 'X1',
        years: ['2024'],
      },
      {
        type: 'add',
        model: 'X2',
        years: ['2024'],
      },
    ],
  ],
]);

const TSB_SOURCES: TsbDataStore['sources'][0][] = [
  // {
  //   type: 'tsb',
  //   fileBaseName: 'TSBS_RECEIVED_2010-2014',
  //   active: false,
  // },
  // {
  //   type: 'tsb',
  //   fileBaseName: 'TSBS_RECEIVED_2015-2019',
  //   active: false,
  // },
  {
    type: 'tsb',
    fileBaseName: 'TSBS_RECEIVED_2020-2024',
    active: false,
    cacheDate: undefined,
  },
  {
    type: 'tsb',
    fileBaseName: 'TSBS_RECEIVED_2025-{{YEAR}}',
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

export function parseTsbDate(
  input: string | undefined | null,
): Date | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  if (s.length === 0) return undefined;

  // YYYYMMDD
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // MM/DD/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));

  // YYYY-MM-DD or YYYY/MM/DD
  m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // Fallback to Date.parse for other ISO-like formats
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  return undefined;
}

export function sanitizeSummary(s: string): string {
  if (!s) return s;
  let out = s;
  out = out.replace(/[ÂÃ¢\u0080\u0082\u0083\u009C\u009D]+/g, '"');
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

  const correction = NHTSA_CORRECTIONS.get(nhtsaID);
  if (correction && correction.tsbID) {
    for (const r of data.results) {
      for (const c of r.manufacturerCommunications ?? []) {
        log.info(
          `Applying correction for NHTSA FILE ${nhtsaID} (${c.manufacturerCommunicationNumber}->${correction.tsbID})`,
        );
        c.manufacturerCommunicationNumber = correction.tsbID;
      }
    }
  }

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
        c.associatedDocuments.filter((d) =>
          d.summary.startsWith('Remedy Instructions and TSB'),
        ),
      ),
  );
  dataStore.files[nhtsaID].push(
    ...recalls.map((a) => ({ fileName: a.fileName, url: a.url })),
  );
  return dataStore.files[nhtsaID];
}

export async function readTsbFiles(
  dataStore: TsbDataStore,
  make: string,
): Promise<TsbTextRow[]> {
  const dataDir = path.resolve(new URL('../data', import.meta.url).pathname);
  const records: TsbTextRow[] = [];
  for (const sourceConfig of TSB_SOURCES) {
    const baseName = sourceConfig.fileBaseName.replace(
      '{{YEAR}}',
      new Date().getFullYear().toString(),
    );
    const source = { ...sourceConfig };
    const cachedSource = dataStore.sources[baseName];
    if (cachedSource) {
      source.cacheDate = cachedSource.cacheDate;
    }

    const zipUrl = `${sourceConfig.type === 'tsb' ? NHTSA_TSB_SOURCE_ROOT : NHTSA_RECALL_SOURCE_ROOT}${baseName}.zip`;
    const zipPath = path.join(dataDir, `${baseName}.zip`);
    const txtPath = path.join(dataDir, `${baseName}.txt`);
    const jsonPath = path.join(dataDir, `${make}.${baseName}.json`);

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
          log.info(
            `Source ${baseName} has new version uploaded at ${remoteDate?.toISOString()}.`,
          );
        }
      } else {
        throw new Error(
          `Refresh source check for ${baseName} returned ${head.status} ${head.statusText}`,
        );
      }
    }

    if (download) {
      await fsPromises.mkdir(dataDir, { recursive: true });

      log.info(`Downloading source ${baseName} `);
      let retries = 3;
      while (retries > 0) {
        try {
          const getRes = await fetch(zipUrl);
          if (!getRes.ok)
            throw new Error(`Failed to download ${zipUrl}: ${getRes.status}`);

          const lastMod =
            getRes.headers.get('last-modified') ?? getRes.headers.get('date');
          const remoteDate = lastMod ? new Date(lastMod) : undefined;
          source.cacheDate = remoteDate;

          const buffer = Buffer.from(await getRes.arrayBuffer());
          await fsPromises.writeFile(zipPath, buffer);
          break;
        } catch (error) {
          let canRetry = false;
          const errorWithCause = error as Error & {
            cause?: { message: string; code?: string };
          };
          switch (errorWithCause.cause?.code) {
            case 'UND_ERR_CLOSED':
            case 'UND_ERR_CONNECT_TIMEOUT':
            case 'UND_ERR_SOCKET':
              canRetry = true;
              break;
          }
          if (canRetry && --retries > 0) {
            log.error(
              `Retrying failed TSB download ${baseName} (${retries} attempts remain)`,
              errorWithCause.cause ?? error,
            );
            //delay 15s on retries
            await new Promise((res) => global.setTimeout(res, 15000));
            continue;
          }
          throw errorWithCause.cause ?? error;
        }
      }

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
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
      }
    }

    // eslint-disable-next-line require-atomic-updates
    dataStore.sources[baseName] = source;

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
        rl.close();
        await writeJson(jsonPath, fileRecords);
      } finally {
        if (fs.existsSync(txtPath)) {
          fs.unlinkSync(txtPath);
        }
      }
    }
    for (const record of fileRecords) {
      records.push(record);
    }
    log.info(
      `Read ${fileRecords.length} records from ${baseName} dated ${source.cacheDate}`,
    );
  }

  return records;
}

export async function getTsbs(
  dataStore: TsbDataStore,
  records: TsbTextRow[],
  models: string[],
): Promise<Tsb[]> {
  const getDetailsForModels = new Set(models);
  const hasExistingData = Object.keys(dataStore.tsbDates).length > 0;

  const groups = new Map<string, TsbTextRow[]>();
  const correctionLogs = new Set<string>();
  for (let rec of records) {
    const correction = NHTSA_CORRECTIONS.get(rec.nhtsaID);
    if (correction) {
      correctionLogs.add(`Applying correction for NHTSA ID ${rec.nhtsaID}`);
      rec = { ...rec, ...correction };
    }

    let groupKey = rec.tsbID ?? rec.nhtsaID;
    switch (groupKey) {
      case 'InVehicle-InApp-Comm':
      case 'In-Vehicle-InApp-Comm':
      case 'InVeh-InApp-Comm':
        groupKey = rec.nhtsaID;
        break;
    }

    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(rec);
  }

  for (const c of [...correctionLogs]) {
    log.info(c);
  }

  const tsbs: Tsb[] = [];

  const otherCutoffDate = new Date();
  otherCutoffDate.setMonth(otherCutoffDate.getMonth() - 1);
  const fetchOtherCutoff = otherCutoffDate
    .toISOString()
    .split('T')[0]
    .replaceAll('-', '');

  let excludeReturnCount = 0;

  for (const [, group] of groups.entries()) {
    const latest = group.sort((a, b) =>
      b.manufacturerDate.localeCompare(a.manufacturerDate),
    )[0];

    if (latest.summary.endsWith(' Return')) {
      excludeReturnCount++;
      continue;
    }

    const displayDate =
      parseTsbDate(latest.manufacturerDate) ??
      parseTsbDate(latest.nhtsaDate) ??
      new Date();

    const combinedTsb: Tsb = {
      ...latest,
      files: [],
      models: [],
      newData: false,
      displayDate,
    };

    const modelYears = new Map<
      string,
      { code: string; model: string; years: Set<string> }
    >();
    const components = new Set<string>();
    let potentialNumber: undefined | number = undefined;
    for (const r of group) {
      const model = r.model;
      const year = r.year;
      const code = getModelCode({ model, years: new Set([year]) }) ?? 'UNKNOWN';
      const mapKey = `${code}-${model}`;
      if (!modelYears.has(mapKey))
        modelYears.set(mapKey, { code, model, years: new Set() });
      if (year) {
        const modSlice = modelYears.get(mapKey)!;
        modSlice.years.add(year);
      }

      if (r.potentialNumberAffected) {
        const pot = parseInt(r.potentialNumberAffected, 10);
        if (pot > 0 && (!potentialNumber || pot > potentialNumber)) {
          potentialNumber = pot;
        }
      }

      if (r.beginManufacture) {
        if (
          !combinedTsb.beginManufacture ||
          r.beginManufacture.localeCompare(combinedTsb.beginManufacture) < 0
        ) {
          combinedTsb.beginManufacture = r.beginManufacture;
        }
      }

      if (r.endManufacture) {
        if (
          !combinedTsb.endManufacture ||
          r.endManufacture.localeCompare(combinedTsb.endManufacture) > 0
        ) {
          combinedTsb.endManufacture = r.endManufacture;
        }
      }

      components.add(r.component);
    }

    combinedTsb.potentialNumberAffected = potentialNumber?.toString();
    combinedTsb.files = dataStore.files[latest.nhtsaID] ?? [];
    combinedTsb.component = [...components].sort().join(', ');

    const issueId = latest.tsbID ?? latest.nhtsaID;

    const corrections = TSB_CORRECTIONS.get(issueId);
    if (corrections) {
      log.info(`Applying corrections for TSB ${issueId}`);
      for (const c of corrections) {
        for (const correctYear of c.years) {
          const code =
            getModelCode({ model: c.model, years: new Set([correctYear]) }) ??
            'UNKNOWN';
          const mapKey = `${code}-${c.model}`;
          const modelSlice = modelYears.get(mapKey);
          switch (c.type) {
            case 'add':
              if (!modelSlice) {
                modelYears.set(mapKey, {
                  code,
                  model: c.model,
                  years: new Set([correctYear]),
                });
              } else {
                modelSlice.years.add(correctYear);
              }
              break;
            case 'remove':
              if (modelSlice) {
                for (const y of c.years) {
                  modelSlice.years.delete(y);
                }
                if (modelSlice.years.size === 0) {
                  modelYears.delete(mapKey);
                }
              }
              break;
          }
        }
      }
    }

    combinedTsb.models = Array.from(modelYears.values()).map((modelSlice) => ({
      code: modelSlice.code,
      make: latest.make,
      model: modelSlice.model,
      years: modelSlice.years,
    }));

    if (
      latest.manufacturerDate.localeCompare(dataStore.tsbDates[issueId] ?? '') >
      0
    ) {
      log.info(
        `Service Bulletin ${issueId} updated: ${dataStore.tsbDates[issueId] ?? 'NEW'} -> ${latest.manufacturerDate}`,
      );
      dataStore.tsbDates[issueId] = latest.manufacturerDate;
      combinedTsb.newData = hasExistingData;
    }

    const fetchDetails =
      (combinedTsb.newData || combinedTsb.files.length === 0) &&
      (isForumMatch(combinedTsb.models, getDetailsForModels) ||
        latest.manufacturerDate.localeCompare(fetchOtherCutoff) > 0);

    if (fetchDetails) {
      try {
        combinedTsb.files = await resolveAssociatedDocuments(
          dataStore,
          latest.nhtsaID,
          latest.tsbID,
        );
        log.info(
          `Service Bulletin ${issueId} has ${combinedTsb.files.length} associated files.`,
        );
      } catch (error) {
        log.error(
          `Failed to read associated documents for ${issueId}: ${(error as Error).message}`,
        );
      }
    }

    tsbs.push(combinedTsb);
  }

  if (excludeReturnCount > 0) {
    log.info(`Excluded ${excludeReturnCount} parts return bulletins.`);
  }

  return tsbs;
}
