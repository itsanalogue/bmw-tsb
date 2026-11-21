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

/**
 * Log in to the forums even when no post needs updating, to exercise the
 * login flow (e.g. the altcha verification) on every run. Skipped in DRY_RUN
 * and MARK_FORUM_POSTED modes, which never call the forums.
 */
export const isForumLoginCheck = () =>
  !isDryRun() &&
  !isMarkForumPosted() &&
  isTruthy(process.env.FORUM_LOGIN_CHECK);

export const isAllowEmptyState = () => isTruthy(process.env.ALLOW_EMPTY_STATE);

export const runModeLabel = () =>
  isDryRun()
    ? 'dry run (DRY_RUN)'
    : isMarkForumPosted()
      ? 'mark forum posted (MARK_FORUM_POSTED)'
      : 'update';

/**
 * Outside CI, only a dry run may skip shared state sync. Posting (or marking
 * posts as sent) against a local copy that is never pushed would leave the
 * shared state stale, and the next CI run would post the same replies again.
 */
export const assertSafeRunMode = () => {
  if (!isGithubActions() && !isStateSync() && !isDryRun()) {
    throw new Error(
      `Refusing to run in ${runModeLabel()} mode without shared state sync. Use "pnpm start:post" to post (or "pnpm start:mark-posted"), "pnpm start" for a dry run, or set STATE_SYNC=1 or DRY_RUN=1.`,
    );
  }
};

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
