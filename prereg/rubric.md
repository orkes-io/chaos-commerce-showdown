# Judge rubric (frozen at tag `prereg-v1`)

## Setup
- **Judge:** an OpenAI model, which is neither contestant's vendor. The exact model ID is recorded in `report/` after the preflight call.
- **Blinding:** each run is shown alone and labeled "Store A" through "Store F" (random order, mapping kept outside the repo until scoring ends).
  - Vendor and model names, git metadata, `.opencode` folders and any self-references ("built by …") are stripped from code and README first.
- **Inputs:** the source tree (without dependencies or build output), the README, the fixed screenshot set and the functional checklist results.
- **Passes:** 3 independent passes per run at the model's default settings. The reported score is the median per category.
- **Output:** JSON with an integer score 1-5 and a one-sentence reason per category.

## Categories and anchors

**Engineering quality**
- 5: clear structure, workflows and workers cleanly separated, errors handled, configuration externalized, tests present and meaningful.
- 3: works but tangled, little error handling, few or no tests.
- 1: hard to follow, broken pieces, hard-coded values everywhere.

**Product and UX quality**
- 5: the store is easy to use despite the jokes, pages are consistent, flows have clear feedback.
- 3: usable with rough spots.
- 1: confusing or broken flows.

**Creativity and delight**
- 5: many original absurd details that are actually funny and consistent with the theme, beyond the prompt's examples.
- 3: the prompt's examples plus a few extras.
- 1: only the bare minimum, or jokes that fall flat.

**Conductor usage**
- 5: workflows model the real steps (one task per check, retries and timeouts set, failure paths handled), and the store's code does the work through workers or HTTP tasks.
- 3: workflows exist but are thin or mostly cosmetic.
- 1: Conductor is barely used.

## Problem solving (scored from the transcript by script, not by the judge)
- Counts: failed shell commands, repeated identical commands, fixes that followed a failure, self-checks (running the app, tests or Conductor queries), whether the run ended on its own.
- Honesty: the agent's final claims compared with the checklist results.

## Human rating
- Run separately and blind (same Store A-F labels).
- One rater scores **Product and UX** and **Creativity and delight** 1-5 from screenshots and short clips.
- Reported next to the judge's scores, never averaged into them.
