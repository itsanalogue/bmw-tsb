import { getTsbs, readTsbFiles, type Tsb } from './tsb.js';
import { readDatabase, saveDatabase } from './database.js';
import { createEmailNotification, sendMessage } from './email.js';
import log from './log.js';
import {
  FORUM_MODEL_GROUPS,
  isForumMatch,
  updateForumPosts,
} from './forum-update.js';
import { processTsbsForGithubPages } from './gh-pages.js';
import { getModelCode } from './model-codes.js';
import { processTsbsForForums } from './forum-writer.js';

async function getTsbStats(tsbs: Tsb[], make: string, models: string[]) {
  let newCount = 0;
  const modelCounts = new Map<string, number>();
  const mappedModels = new Map<string, string | undefined>();

  // Build stats and check for new unmapped models in bulletins
  for (const tsb of tsbs) {
    if (tsb.newData) {
      newCount++;
    }
    for (const model of models) {
      const modelSlice = new Set([model]);
      if (isForumMatch(tsb.models, modelSlice)) {
        modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
      }
    }
    for (const model of tsb.models) {
      for (const year of model.years) {
        if (Number(year) >= 2024 && Number(year) < 9999) {
          const modelAndYear = `${year} ${make} ${model.model}`;
          if (!mappedModels.has(modelAndYear)) {
            mappedModels.set(modelAndYear, getModelCode(model));
          }
        }
      }
    }
  }

  const unmappedModels = new Set<string>();
  for (const [model, code] of [...mappedModels.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (!code) {
      log.info(`Unmapped model: ${model}`);
      unmappedModels.add(model);
    }
  }

  log.info(
    `Found ${tsbs.length - newCount} existing and ${newCount} new ${make} service bulletins or recalls in NHTSA dataset.`,
  );

  log.info(
    `Service bulletins by forum group:\n${[...new Set(models).values()].map((model) => `  ${model}: ${modelCounts.get(model)}`).join('\n')}`,
  );

  return {
    unmappedModels,
  };
}

export async function processTsbs(make: string, models: string[]) {
  const dataStore = readDatabase();
  const records = await readTsbFiles(dataStore, make);
  await saveDatabase(dataStore);

  const tsbs = await getTsbs(dataStore, records, models);
  const { unmappedModels } = await getTsbStats(tsbs, make, models);

  await processTsbsForForums(tsbs, make, models);

  await processTsbsForGithubPages(tsbs, make, models);

  try {
    const updateCount = await updateForumPosts(dataStore);
    if (updateCount > 0) {
      log.info(`Updated or replied to ${updateCount} forum post(s).`);
    } else {
      log.info('No forum updates were necessary.');
    }
    await saveDatabase(dataStore);
  } catch (error) {
    const errorMsg = `Failed to update forums for ${make} ${models}`;
    log.error(errorMsg, error);
    const errorWithCause = error as Error & { cause?: { message: string } };
    await sendMessage({
      subject: errorMsg,
      bodyText: `Failed to post updates to the forums: ${errorWithCause.cause?.message ?? errorWithCause.message}`,
    });
  }

  await createEmailNotification(tsbs, make, models, unmappedModels);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const make = 'BMW';
  let models = (process.argv[2] ?? '').split(',').filter((s) => s.length > 0);
  if (models.length === 0) {
    models = [...FORUM_MODEL_GROUPS.keys()];
  }
  try {
    await processTsbs(make, models);
  } catch (error) {
    const errorMsg = `Failed to process TSBs for ${make} ${models}`;
    log.error(errorMsg, error);
    await sendMessage({
      subject: errorMsg,
      bodyText: `The process failed with error ${(error as Error).message}`,
    });
    throw error;
  }
}
