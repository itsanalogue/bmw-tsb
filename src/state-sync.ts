import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import log from './log.js';
import {
  readSharedStore,
  SHARED_SECTIONS,
  sharedStorePath,
  stateDir,
  writeSharedStore,
  type SharedDataStore,
} from './database.js';
import { isGithubActions, runModeLabel } from './run-mode.js';

const STATE_BRANCH = process.env.STATE_BRANCH ?? 'state';
const REMOTE_REF = `origin/${STATE_BRANCH}`;
const MAX_PUSH_ATTEMPTS = 5;

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

const git = (args: string[], cwd = repoRoot): string => {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new Error(`git ${args.join(' ')} failed: ${stderr ?? error}`, {
      cause: error,
    });
  }
};

const fetchState = () =>
  git([
    'fetch',
    '--quiet',
    'origin',
    `+refs/heads/${STATE_BRANCH}:refs/remotes/${REMOTE_REF}`,
  ]);

/** Check out the latest remote state branch into the state worktree, discarding local edits. */
const resetWorktree = () => {
  if (!fs.existsSync(path.join(stateDir, '.git'))) {
    if (fs.existsSync(stateDir) && fs.readdirSync(stateDir).length > 0) {
      throw new Error(
        `${stateDir} exists but is not a git worktree; move it aside so the ${STATE_BRANCH} branch can be checked out there.`,
      );
    }
    git(['worktree', 'prune']);
    git([
      'worktree',
      'add',
      '--force',
      '-B',
      STATE_BRANCH,
      stateDir,
      REMOTE_REF,
    ]);
  } else {
    git(['checkout', '--force', '-B', STATE_BRANCH, REMOTE_REF], stateDir);
  }
};

export const pullState = () => {
  fetchState();
  resetWorktree();
  const last = git(['log', '-1', '--format=%cI %s'], stateDir);
  log.info(
    `Loaded shared state from ${STATE_BRANCH} branch (last commit ${last}).`,
  );
};

/** Apply the keys this run added, changed or removed (relative to baseline) onto latest. */
export const applyChanges = (
  latest: SharedDataStore,
  baseline: SharedDataStore,
  current: SharedDataStore,
): SharedDataStore => {
  const merged = structuredClone(latest);
  for (const section of SHARED_SECTIONS) {
    const base = baseline[section] as Record<string, unknown>;
    const cur = current[section] as Record<string, unknown>;
    const out = merged[section] as Record<string, unknown>;
    for (const key of new Set([...Object.keys(base), ...Object.keys(cur)])) {
      if (!(key in cur)) {
        delete out[key];
      } else if (JSON.stringify(cur[key]) !== JSON.stringify(base[key])) {
        out[key] = cur[key];
      }
    }
  }
  return merged;
};

const commitMessage = () => {
  const origin = isGithubActions()
    ? `github-actions run ${process.env.GITHUB_RUN_ID ?? '?'}`
    : 'local';
  return `state: ${runModeLabel()} from ${origin}`;
};

/**
 * Commit this run's changes to the shared state branch. Each attempt starts
 * from the latest remote state and re-applies only the keys this run changed,
 * so a concurrent push from another runner is merged rather than overwritten.
 */
export const pushState = async (
  baseline: SharedDataStore,
  current: SharedDataStore,
) => {
  for (let attempt = 1; ; attempt++) {
    fetchState();
    resetWorktree();
    await writeSharedStore(applyChanges(readSharedStore(), baseline, current));

    if (!git(['status', '--porcelain'], stateDir)) {
      log.info('Shared state unchanged; nothing to push.');
      return;
    }
    git(['add', path.basename(sharedStorePath)], stateDir);
    git(['commit', '--quiet', '-m', commitMessage()], stateDir);
    try {
      git(
        ['push', '--quiet', 'origin', `HEAD:refs/heads/${STATE_BRANCH}`],
        stateDir,
      );
      log.info(`Pushed shared state to ${STATE_BRANCH} branch.`);
      return;
    } catch (error) {
      if (attempt >= MAX_PUSH_ATTEMPTS) {
        throw error;
      }
      log.warn(
        `Push of shared state rejected (attempt ${attempt}/${MAX_PUSH_ATTEMPTS}); merging with latest and retrying. ${(error as Error).message}`,
      );
    }
  }
};
