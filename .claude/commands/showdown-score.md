---
description: Score every finished run (checklist, blind judge), then open the blind rating
---
1. Check `make status`: every `chaos_run` must be COMPLETED and `scrub_clean` true.
2. For each run without a map in `eval/maps/<run>.json`: read `runs/<run>/app/README.md` for the start command, run `make evalstart RUN=<run> CMD="<command>"` and `make explore RUN=<run>`, then write the map (routes and selectors only, never scores). Copy the shape of an existing map.
3. Run `make score`, then tell the user to run `make rate` to score Stores A-F blind. The report builds itself when the rating is submitted.
4. Run `make pull` and summarize `report/tables.md`.
