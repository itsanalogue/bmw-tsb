const MODEL_VARIANTS = new Map([
  ['XB7', 'X7'],
  ['ALPINA XB7', 'X7'],
]);

const IGNORE_MODEL_VARIANTS = new Set(['IX M60']);

export const isModelMatch = (
  models: { model: string }[],
  modelsToMatch: Set<string>,
) => {
  return models.some((m) => {
    if (modelsToMatch.has(m.model)) {
      return true;
    }

    if (IGNORE_MODEL_VARIANTS.has(m.model)) {
      return false;
    }

    const normalized = MODEL_VARIANTS.get(m.model);
    if (normalized && modelsToMatch.has(normalized)) {
      return true;
    }

    if (modelsToMatch.has(m.model.split(' ')[0])) {
      return true;
    }

    return false;
  });
};
