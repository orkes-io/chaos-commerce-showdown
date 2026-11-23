# Functional checklist (frozen at tag `prereg-v1`)

Each item scores **pass** (1), **partial** (0.5) or **fail** (0). The functional score is the sum out of 12. Definitions are fixed before any store exists. The per-run map in `eval/maps/<run>.json` only says *where* a feature lives (route, selector), never whether it counts.

| # | Item | Pass means |
|---|---|---|
| F1 | One-command start | The single command in the README starts the store at `http://localhost:3000` within 5 minutes on a reset sandbox, with no manual steps. Partial if it works after the assisted start. |
| F2 | Workflows registered | The start command registers the store's Conductor workflow definitions on `localhost:8080`. Partial if registration needs a separate documented command. |
| F3 | Catalog with absurd prices | A page lists at least 5 products, and at least 3 prices are absurd (negative, fractional cents, astronomically high, or in a made-up currency). Partial for 1-2. |
| F4 | Inverted ratings | Reviews exist where 5-star reviews are clearly angry and 2-star reviews are clearly happy, on at least one product. Partial if only one direction is inverted. |
| F5 | Dodging one-star button | When the cursor moves toward the one-star control in steps, the control changes position at least twice before it can be clicked. Partial if it dodges once or only sometimes. |
| F6 | Checkout completes in the UI | Adding an item and checking out reaches a confirmation in the UI. |
| F7 | Checkout runs on Conductor | That checkout creates a Conductor execution that reaches `COMPLETED`, with at least one task executed by the store's own code (a worker task or an HTTP call into the store's backend). Partial if it completes but every task is a Conductor system task with no store code involved. |
| F8 | Returns reach a decision | Starting a return in the UI produces a final decision (approved or denied) shown to the shopper. |
| F9 | Returns run on Conductor | That return creates a Conductor execution that reaches a terminal state (`COMPLETED` or a deliberate `FAILED`/`TERMINATED` that the UI reports as a decision), with at least 3 tasks representing checks. |
| F10 | Wiring is real | With the store's backend process stopped, a new checkout does **not** report success. Fail if the UI still confirms an order. |
| F11 | Lambda/Pages structure | The repo separates a static frontend buildable for GitHub Pages from a backend packaged for AWS Lambda, and the Conductor URL comes from configuration (env var or config file), not a hard-coded string. Partial if only one half is in place. |
| F12 | No AI calls at runtime, README accurate | No model API calls exist in the running store, and the README's run and deploy instructions match what we observed. Partial if the README is incomplete but not wrong. |

Also recorded for every run, not scored:
- console errors on the main path
- extra absurd features the agent invented beyond the prompt's examples (counted and listed)
- globally installed packages the README does not mention
- the agent's final claims compared with these results
