# bmw-tsb

Quick start

1. Install dependencies

```bash
pnpm install
```

2. Build

```bash
pnpm run build
```

3. Run tests

```bash
pnpm test
```

4. Run (after build)

```bash
pnpm start                 # dry run: pull shared state, log what would be posted/emailed, change nothing
pnpm start:post            # real run: post to the forums, send email, push shared state (also used by CI)
pnpm start:mark-posted     # record changed posts as sent without calling the forums, then push shared state
```

All three pull the latest shared state from the `state` branch first. Outside
GitHub Actions, a run that is not a dry run is refused unless shared state sync
is on (`STATE_SYNC=1`), so a local run can never post from a stale copy that
CI would later post again.

When posting interactively, missing `FORUM_USERNAME`, `FORUM_PASSWORD` and
`HV_COOKIE` (the `human_verify` cookie from a browser session that passed the
ALTCHA check) are prompted for.
