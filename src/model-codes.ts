interface ModelDefinition {
  models: Map<
    string,
    { startYear: number; endYear?: number; strictMatch?: boolean }
  >;
}

export const MODEL_CODE_MAP = new Map<string, ModelDefinition>([
  [
    'F15',
    {
      models: new Map([['X5', { startYear: 2014, endYear: 2018 }]]),
    },
  ],
  [
    'F16',
    {
      models: new Map([['X6', { startYear: 2014, endYear: 2018 }]]),
    },
  ],
  [
    'F30',
    {
      models: new Map([
        ['320I', { startYear: 2012, endYear: 2018 }],
        ['328I', { startYear: 2012, endYear: 2018 }],
        ['328D', { startYear: 2014, endYear: 2018 }],
        ['330I', { startYear: 2012, endYear: 2018 }],
        ['335I', { startYear: 2012, endYear: 2018 }],
        ['340I', { startYear: 2012, endYear: 2018 }],
      ]),
    },
  ],
  [
    'F32',
    {
      models: new Map([
        ['430I', { startYear: 2012, endYear: 2018 }],
        ['440I', { startYear: 2012, endYear: 2018 }],
      ]),
    },
  ],
  [
    'F39',
    {
      models: new Map([['X2', { startYear: 2016, endYear: 2022 }]]),
    },
  ],
  [
    'F48',
    {
      models: new Map([['X1', { startYear: 2014, endYear: 2022 }]]),
    },
  ],
  [
    'F74',
    {
      models: new Map([
        ['228I', { startYear: 2022, endYear: 2028 }],
        ['M235I', { startYear: 2022, endYear: 2028 }],
      ]),
    },
  ],
  [
    'F80',
    {
      models: new Map([
        ['M3', { startYear: 2013, endYear: 2020, strictMatch: true }],
      ]),
    },
  ],
  [
    'F82',
    {
      models: new Map([
        ['M4', { startYear: 2013, endYear: 2020, strictMatch: true }],
      ]),
    },
  ],
  [
    'F85',
    {
      models: new Map([['X5M', { startYear: 2013, endYear: 2018 }]]),
    },
  ],
  [
    'F86',
    {
      models: new Map([['X6M', { startYear: 2013, endYear: 2019 }]]),
    },
  ],

  [
    'F87',
    {
      models: new Map([
        ['M2', { startYear: 2014, endYear: 2022, strictMatch: true }],
      ]),
    },
  ],

  [
    'F90',
    {
      models: new Map([
        ['M5', { startYear: 2017, endYear: 2023, strictMatch: true }],
      ]),
    },
  ],
  [
    'F91',
    {
      models: new Map([
        ['M8', { startYear: 2019, endYear: 2026, strictMatch: true }],
      ]),
    },
  ],
  [
    'F95',
    {
      models: new Map([['X5M', { startYear: 2018, endYear: 2024 }]]),
    },
  ],
  [
    'F96',
    {
      models: new Map([['X6M', { startYear: 2018, endYear: 2026 }]]),
    },
  ],
  [
    'F97',
    {
      models: new Map([['X3M', { startYear: 2018, endYear: 2024 }]]),
    },
  ],
  [
    'F98',
    {
      models: new Map([['X4M', { startYear: 2018, endYear: 2026 }]]),
    },
  ],
  [
    'G01',
    {
      models: new Map([['X3', { startYear: 2018, endYear: 2024 }]]),
    },
  ],
  [
    'G02',
    {
      models: new Map([['X4', { startYear: 2018, endYear: 2026 }]]),
    },
  ],
  [
    'G05',
    {
      models: new Map([['X5', { startYear: 2019, endYear: 2026 }]]),
    },
  ],
  [
    'G06',
    {
      models: new Map([['X6', { startYear: 2019, endYear: 2026 }]]),
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
    'G08',
    {
      models: new Map([['X3', { startYear: 2017, endYear: 2024 }]]),
    },
  ],
  [
    'G09',
    {
      models: new Map([['XM', { startYear: 2023, endYear: 2027 }]]),
    },
  ],
  [
    'G11',
    {
      models: new Map([['740I', { startYear: 2017, endYear: 2022 }]]),
    },
  ],
  [
    'G14',
    {
      models: new Map([
        ['ALPINA B8', { startYear: 2020, endYear: 2026 }],
        ['M850I', { startYear: 2020, endYear: 2026 }],
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
      ]),
    },
  ],
  [
    'G22',
    {
      models: new Map([
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
    'G30',
    {
      models: new Map([
        ['530I', { startYear: 2017, endYear: 2023 }],
        ['540I', { startYear: 2017, endYear: 2023 }],
      ]),
    },
  ],
  [
    'G32',
    {
      models: new Map([['650I', { startYear: 2017, endYear: 2024 }]]),
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
        ['550E', { startYear: 2024, endYear: 2030 }],
        ['540I', { startYear: 2024, endYear: 2030 }],
        ['530I', { startYear: 2024, endYear: 2030 }],
        ['5 SERIES', { startYear: 2024, endYear: 2030 }],
      ]),
    },
  ],
  [
    'G65',
    {
      models: new Map([['X5', { startYear: 2027, endYear: 2033 }]]),
    },
  ],
  [
    'G66',
    {
      models: new Map([['X6', { startYear: 2027, endYear: 2033 }]]),
    },
  ],

  [
    'G70',
    {
      models: new Map([
        ['I7', { startYear: 2023, endYear: 2029 }],
        ['760I', { startYear: 2023, endYear: 2029 }],
        ['740I', { startYear: 2023, endYear: 2029 }],
        ['750E', { startYear: 2023, endYear: 2029 }],
      ]),
    },
  ],
  [
    'G80',
    {
      models: new Map([
        ['M3', { startYear: 2021, endYear: 2027, strictMatch: true }],
      ]),
    },
  ],
  [
    'G82',
    {
      models: new Map([
        ['M4', { startYear: 2021, endYear: 2027, strictMatch: true }],
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
        ['M5', { startYear: 2024, endYear: 2031, strictMatch: true }],
      ]),
    },
  ],
  [
    'G99',
    {
      models: new Map([
        [
          'M5 SPORTSWAGON',
          { startYear: 2024, endYear: 2031, strictMatch: true },
        ],
      ]),
    },
  ],
  [
    'I01',
    {
      models: new Map([['I3', { startYear: 2013, endYear: 2022 }]]),
    },
  ],
  [
    'I12',
    {
      models: new Map([['I8', { startYear: 2013, endYear: 2020 }]]),
    },
  ],
  [
    'I15',
    {
      models: new Map([['I8', { startYear: 2017, endYear: 2020 }]]),
    },
  ],
  [
    'I20',
    {
      models: new Map([['IX', { startYear: 2021, endYear: 2028 }]]),
    },
  ],
  [
    'U10',
    {
      models: new Map([['X2', { startYear: 2023, endYear: 2033 }]]),
    },
  ],
  [
    'U11',
    {
      models: new Map([['X1', { startYear: 2023, endYear: 2033 }]]),
    },
  ],
  [
    'MOTORRAD',
    {
      models: new Map([
        ['C 400', { startYear: 2020 }],
        ['F 800', { startYear: 2020 }],
        ['F 900', { startYear: 2020 }],
        ['G 310', { startYear: 2020 }],
        ['K 1600', { startYear: 2020 }],
        ['M 1000', { startYear: 2020 }],
        ['R 1250', { startYear: 2020 }],
        ['R 1300', { startYear: 2020 }],
        ['R 18', { startYear: 2020 }],
        ['S 1000', { startYear: 2020 }],
      ]),
    },
  ],
]);

export const getModelCode = (tsbModelInfo: {
  model: string;
  years: Set<string>;
}): string | undefined => {
  for (const [code, def] of MODEL_CODE_MAP.entries()) {
    let partialMatch: string | undefined = undefined;
    for (const [modelName, modelDef] of def.models) {
      const exact = modelName === tsbModelInfo.model;
      const partial =
        tsbModelInfo.model.startsWith(modelName) && !modelDef.strictMatch;

      if (exact || partial) {
        for (const tsbYear of tsbModelInfo.years.values()) {
          if (
            Number(tsbYear) >= modelDef.startYear &&
            (!modelDef.endYear || Number(tsbYear) <= modelDef.endYear)
          ) {
            if (exact) {
              return code;
            }
            if (partial) {
              partialMatch = code;
            }
          }
        }
      }
    }
    if (partialMatch) {
      return partialMatch;
    }
  }
  return undefined;
};
