interface ModelDefinition {
  models: Map<
    string,
    { startYear: number; endYear?: number; strictMatch?: boolean }
  >;
}

const IGNORE_MODEL_VARIANTS = new Set(['IX M60']);

export const MODEL_DEFINITIONS = new Map<string, ModelDefinition>([
  [
    'G01',
    {
      models: new Map([
        ['X3', { startYear: 2018, endYear: 2024 }],
        ['X4', { startYear: 2018, endYear: 2024 }],
      ]),
    },
  ],
  [
    'G05',
    {
      models: new Map([
        ['X5', { startYear: 2019, endYear: 2026 }],
        ['X6', { startYear: 2019, endYear: 2026 }],
      ]),
    },
  ],
  [
    'G07',
    {
      models: new Map([
        ['X7', { startYear: 2019, endYear: 2027 }],
        ['XB7', { startYear: 2019, endYear: 2027 }],
        ['ALPINA XB7', { startYear: 2019, endYear: 2027 }],
      ]),
    },
  ],
  [
    'G09',
    {
      models: new Map([['XM', { startYear: 2023, endYear: 2027 }]]),
    },
  ],
  [
    'G14',
    {
      models: new Map([
        ['M8', { startYear: 2020, endYear: 2026, strictMatch: true }],
        ['840I', { startYear: 2020, endYear: 2026 }],
      ]),
    },
  ],
  [
    'G20',
    {
      models: new Map([
        ['330I', { startYear: 2019, endYear: 2026 }],
        ['330E', { startYear: 2019, endYear: 2026 }],
        ['340I', { startYear: 2019, endYear: 2026 }],
        ['M340I', { startYear: 2019, endYear: 2026 }],
        ['430I', { startYear: 2021, endYear: 2028 }],
        ['M440I', { startYear: 2021, endYear: 2028 }],
      ]),
    },
  ],
  [
    'G26',
    {
      models: new Map([['I4', { startYear: 2022, endYear: 2028 }]]),
    },
  ],
  [
    'G29',
    {
      models: new Map([['Z4', { startYear: 2019, endYear: 2026 }]]),
    },
  ],
  [
    'G42',
    {
      models: new Map([
        ['230I', { startYear: 2022, endYear: 2028 }],
        ['240I', { startYear: 2022, endYear: 2028 }],
        ['M240I', { startYear: 2022, endYear: 2028 }],
      ]),
    },
  ],
  [
    'G45',
    {
      models: new Map([['X3', { startYear: 2025, endYear: 2032 }]]),
    },
  ],
  [
    'G60',
    {
      models: new Map([
        ['I5', { startYear: 2024, endYear: 2030 }],
        ['540I', { startYear: 2024, endYear: 2030 }],
        ['530I', { startYear: 2024, endYear: 2030 }],
        ['5 SERIES', { startYear: 2024, endYear: 2030 }],
      ]),
    },
  ],
  [
    'G70',
    {
      models: new Map([
        ['I7', { startYear: 2023, endYear: 2029 }],
        ['760I', { startYear: 2023, endYear: 2029 }],
        ['740I', { startYear: 2023, endYear: 2029 }],
      ]),
    },
  ],
  [
    'G80',
    {
      models: new Map([
        ['M3', { startYear: 2021, endYear: 2027, strictMatch: true }],
        ['M4', { startYear: 2021, endYear: 2028, strictMatch: true }],
      ]),
    },
  ],
  [
    'G87',
    {
      models: new Map([
        ['M2', { startYear: 2023, endYear: 2030, strictMatch: true }],
      ]),
    },
  ],
  [
    'G90',
    {
      models: new Map([
        ['M5', { startYear: 2025, endYear: 2031, strictMatch: true }],
      ]),
    },
  ],
  [
    'I20',
    {
      models: new Map([['IX', { startYear: 2022, endYear: 2028 }]]),
    },
  ],
  [
    'U11',
    {
      models: new Map([
        ['X1', { startYear: 2023, endYear: 2033 }],
        ['X2', { startYear: 2023, endYear: 2033 }],
      ]),
    },
  ],
]);

export const isModelMatch = (
  tsbModelInfo: { model: string; years: Set<string> }[],
  modelsToMatch: Set<string>,
): boolean => {
  for (const modelToMatch of modelsToMatch.values()) {
    const modelDef: ModelDefinition = MODEL_DEFINITIONS.get(modelToMatch) ?? {
      models: new Map([[modelToMatch, { startYear: 2000 }]]),
    };

    for (const tsbModel of tsbModelInfo) {
      if (IGNORE_MODEL_VARIANTS.has(tsbModel.model)) {
        continue;
      }
      let modelEntry = modelDef.models.get(tsbModel.model);
      if (!modelEntry) {
        const partialKeyMatch = [...modelDef.models.keys()].find((k) =>
          tsbModel.model.startsWith(k),
        );
        if (partialKeyMatch) {
          const partialMatch = modelDef.models.get(partialKeyMatch);
          if (!partialMatch?.strictMatch) {
            modelEntry = partialMatch;
          }
        }
      }
      if (modelEntry) {
        for (const tsbYear of tsbModel.years.values()) {
          if (
            Number(tsbYear) >= modelEntry.startYear &&
            (!modelEntry.endYear || Number(tsbYear) <= modelEntry.endYear)
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
};
