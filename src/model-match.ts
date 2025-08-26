interface ModelDefinition {
  modelNames: Set<string>;
  years?: { from: number; to?: number };
}

const IGNORE_MODEL_VARIANTS = new Set(['IX M60']);

export const MODEL_DEFINITIONS = new Map<string, ModelDefinition>([
  [
    'G01',
    {
      modelNames: new Set(['X3', 'X4']),
      years: { from: 2018, to: 2024 },
    },
  ],
  [
    'G05',
    {
      modelNames: new Set(['X5', 'X6']),
      years: { from: 2019, to: 2026 },
    },
  ],
  [
    'G07',
    {
      modelNames: new Set(['X7', 'XB7', 'ALPINA XB7']),
      years: { from: 2019, to: 2027 },
    },
  ],
  [
    'G09',
    {
      modelNames: new Set(['XM']),
    },
  ],
  [
    'G14',
    {
      modelNames: new Set(['M8', '840I']),
      years: { from: 2020, to: 2026 },
    },
  ],
  [
    'G20',
    {
      modelNames: new Set(['330I', '330E', '340I']),
      years: { from: 2019, to: 2026 },
    },
  ],
  [
    'G22',
    {
      modelNames: new Set(['430I', '440I', 'M440I']),
      years: { from: 2020, to: 2027 },
    },
  ],
  [
    'G26',
    {
      modelNames: new Set(['I4']),
      years: { from: 2022 },
    },
  ],
  [
    'G29',
    {
      modelNames: new Set(['Z4']),
      years: { from: 2019, to: 2026 },
    },
  ],
  [
    'G42',
    {
      modelNames: new Set(['228I', '230I', '240I', 'M240I', 'M235I']),
      years: { from: 2022 },
    },
  ],
  [
    'G45',
    {
      modelNames: new Set(['X3']),
      years: { from: 2025 },
    },
  ],
  [
    'G60',
    {
      modelNames: new Set(['I5', '540I', '530I', '5 SERIES']),
      years: { from: 2024, to: 2030 },
    },
  ],
  [
    'G70',
    {
      modelNames: new Set(['I7', '760I', '740I']),
      years: { from: 2023 },
    },
  ],
  [
    'I20',
    {
      modelNames: new Set(['IX']),
      years: { from: 2022 },
    },
  ],
]);

export const isModelMatch = (
  tsbModelInfo: { model: string; years: Set<string> }[],
  modelsToMatch: Set<string>,
): boolean => {
  for (const modelToMatch of modelsToMatch.values()) {
    const modelDef = MODEL_DEFINITIONS.get(modelToMatch) ?? {
      modelNames: new Set([modelToMatch]),
    };

    for (const tsbModel of tsbModelInfo) {
      let hasModelMatch = false;
      if (!IGNORE_MODEL_VARIANTS.has(tsbModel.model)) {
        if (modelDef.modelNames.has(tsbModel.model)) {
          hasModelMatch = true;
        }
        if (
          [...modelDef.modelNames].some((mn) => tsbModel.model.startsWith(mn))
        ) {
          hasModelMatch = true;
        }
      }
      let hasYearMatch = false;
      if (!modelDef.years) {
        hasYearMatch = true;
      } else {
        for (const tsbYear of tsbModel.years.values()) {
          if (
            Number(tsbYear) >= modelDef.years.from &&
            (!modelDef.years.to || Number(tsbYear) <= modelDef.years.to)
          ) {
            hasYearMatch = true;
          }
        }
      }
      if (hasModelMatch && hasYearMatch) {
        return true;
      }
    }
  }
  return false;
};
