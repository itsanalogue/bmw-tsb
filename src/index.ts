import { getTsbs, readTsbFiles, type Tsb } from './tsb.js';
import { readDatabase, saveDatabase, snapshotSharedStore } from './database.js';
import {
  isDryRun,
  isMarkForumPosted,
  isStateSync,
  logRunMode,
} from './run-mode.js';
import { pullState, pushState } from './state-sync.js';
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
import { clearOutput } from './output.js';
import { promptForMissingCredentials } from './credentials.js';

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
  logRunMode();
  await promptForMissingCredentials();
  const sync = isStateSync();
  const push = sync && !isDryRun();
  if (
    push &&
    !isMarkForumPosted() &&
    !(process.env.FORUM_USERNAME && process.env.FORUM_PASSWORD)
  ) {
    throw new Error(
      'Forum credentials are not set, so new bulletins would be marked as seen in shared state without being posted. Set FORUM_USERNAME/FORUM_PASSWORD, or use DRY_RUN=1 or MARK_FORUM_POSTED=1.',
    );
  }
  clearOutput();
  if (sync) {
    pullState();
  }

  const dataStore = readDatabase();
  const baseline = snapshotSharedStore(dataStore);

  // tsbDates decides which bulletins are "new" and so what the NEW forum
  // replies contain. Only record them once the forum update succeeds, so a
  // failed run regenerates the same NEW content and retries it.
  let forumDelivered = false;
  const persist = async () => {
    const toSave = forumDelivered
      ? dataStore
      : { ...dataStore, tsbDates: baseline.tsbDates };
    await saveDatabase(toSave);
    if (push) {
      await pushState(baseline, toSave);
    }
  };

  let failed = false;
  try {
    const records = await readTsbFiles(dataStore, make);
    await saveDatabase({ ...dataStore, tsbDates: baseline.tsbDates });

    const tsbs = await getTsbs(dataStore, records, models);
    const { unmappedModels } = await getTsbStats(tsbs, make, models);

    await processTsbsForForums(tsbs, make, models);

    await processTsbsForGithubPages(tsbs, make, models);

    try {
      const updateCount = await updateForumPosts(dataStore);
      forumDelivered = true;
      if (updateCount === 0) {
        log.info('No forum updates were necessary.');
      } else if (isDryRun()) {
        log.info(
          `[DRY_RUN] ${updateCount} forum post(s) would be updated or replied to.`,
        );
      } else if (isMarkForumPosted()) {
        log.info(
          `[MARK_FORUM_POSTED] Marked ${updateCount} forum post(s) as posted without sending.`,
        );
      } else {
        log.info(`Updated or replied to ${updateCount} forum post(s).`);
      }
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
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    // Always persist, so hashes of forum posts that were already sent are
    // shared even when a later step fails.
    await persist().catch((error: unknown) => {
      if (!failed) {
        throw error;
      }
      log.error('Failed to persist state after an earlier failure', error);
    });
  }
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
