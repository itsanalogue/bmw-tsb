import log from './log.js';

const isTruthy = (value: string | undefined) =>
  !!value && !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());

export const isGithubActions = () => process.env.GITHUB_ACTIONS === 'true';

/** Skip forum posts and email; never push shared state. */
export const isDryRun = () => isTruthy(process.env.DRY_RUN);

/** Mark changed forum posts as posted (record their hashes) without calling the forums. */
export const isMarkForumPosted = () =>
  !isDryRun() && isTruthy(process.env.MARK_FORUM_POSTED);

/** Pull/push the shared state branch. Defaults on in GitHub Actions. */
export const isStateSync = () =>
  process.env.STATE_SYNC !== undefined
    ? isTruthy(process.env.STATE_SYNC)
    : isGithubActions();

export const isAllowEmptyState = () => isTruthy(process.env.ALLOW_EMPTY_STATE);

export const runModeLabel = () =>
  isDryRun()
    ? 'dry run (DRY_RUN)'
    : isMarkForumPosted()
      ? 'mark forum posted (MARK_FORUM_POSTED)'
      : 'update';

export const logRunMode = () => {
  if (
    isTruthy(process.env.DRY_RUN) &&
    isTruthy(process.env.MARK_FORUM_POSTED)
  ) {
    log.warn('DRY_RUN and MARK_FORUM_POSTED are both set; DRY_RUN wins.');
  }
  const sync = isStateSync()
    ? isDryRun()
      ? 'pull only'
      : 'pull and push'
    : 'off (local .state only)';
  log.info(`Run mode: ${runModeLabel()}. Shared state sync: ${sync}.`);
};
