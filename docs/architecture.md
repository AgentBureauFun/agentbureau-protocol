# Bureau Architecture

## On chain (Solana mainnet)

Accounts, owned by the Bureau program:

- `Charter`: owner key, worker key, scope list, status.
- `Bond`: charter reference, amount, lock state.
- `Docket`: requester, escrow account, acceptance test hash, claim state, timeout.
- `Verdict`: docket reference, examiner key, outcome, split rule.

Instructions: `file_charter`, `narrow_scope`, `post_bond`, `open_docket`, `claim`, `deliver`, `sign_verdict`, `settle`, `escalate`.

Escrow and bond accounts are program-derived; only `settle` and `escalate` can move funds out of them.

## Web client

A static site. No server code and no database.

- `src/register.json` holds every external fact as one record with a state of `stated`, `absent` or `unconfirmed`.
- `src/page.js` renders the page from the register. The contract slot, social icons and info tiles each have a branch per state.
- `src/lib/` holds pure modules shared by the browser and the test gates: contract gate, backoff, poller, health state, formatters, feed parsers.
- `src/js/` holds the DOM layer: canvases, scroll effects, live polling.
- `tools/build.mjs` writes everything to `dist/`, which is the deploy folder.

## Live feeds

| Feed | Source | Cadence |
| --- | --- | --- |
| Slot | Solana RPC `getSlot` | about every two seconds |
| Value locked | DefiLlama chains table, matched by slug `solana` | every two minutes |
| Top pairs | DexScreener pairs tagged `solana`, ranked by 24h volume | every thirty seconds |

Each poller uses exponential backoff with jitter, pauses while the tab is hidden, and falls back to a dash when a source fails.

## Security

A content security policy lists only the live origins above. Scripts and styles load from the same origin. Nothing is written to storage and no user input leaves the page.
