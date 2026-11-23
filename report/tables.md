# Results

## Every run

| Run | Model | Functional /12 | Judge eng / UX / creativity / Conductor | Human UX / creativity | Ended | Active min | Cost |
|---|---|---|---|---|---|---|---|
| carbon-r1 | Gemini 4 Carbon | 10.5 | 4/4/5/4 | 2 / 2 | finished | 46.0 | $1.9115 |
| carbon-r2 | Gemini 4 Carbon | 10.5 | 4/4/5/4 | 2 / 1 | finished | 38.4 | $1.7703 |
| carbon-r3 | Gemini 4 Carbon | 11.5 | 4/4/5/4 | 1 / 1 | finished | 24.6 | $1.7962 |
| fable-r1b | Fable 5.2 | 11.5 | 4/4/5/4 | 3 / 3 | finished | 40.8 | $13.756 |
| fable-r2b | Fable 5.2 | 10.5 | 4/4/5/4 | 2 / 2 | finished | 37.2 | $12.8951 |
| fable-r3b | Fable 5.2 | 11.0 | 4/4/5/4 | 2 / 3 | finished | 35.7 | $10.959 |
| neon-r1 | Gemini 4 Neon | 10.5 | 4/4/5/4 | 2 / 1 | finished | 16.6 | $3.5922 |
| neon-r2 | Gemini 4 Neon | 11.0 | 4/4/5/4 | 3 / 4 | finished | 19.7 | $4.0622 |
| neon-r3 | Gemini 4 Neon | 10.5 | 3/4/5/4 | 4 / 3 | finished | 15.0 | $2.9179 |

## Per model: median (range) over 3 runs

| Metric | Gemini 4 Neon | Gemini 4 Carbon | Fable 5.2 |
|---|---|---|---|
| Functional score /12 | 10.5 (10.5-11) | 10.5 (10.5-11.5) | 11 (10.5-11.5) |
| Judge: engineering | 4 (3-4) | 4 (4-4) | 4 (4-4) |
| Judge: product and UX | 4 (4-4) | 4 (4-4) | 4 (4-4) |
| Judge: creativity | 5 (5-5) | 5 (5-5) | 5 (5-5) |
| Judge: Conductor usage | 4 (4-4) | 4 (4-4) | 4 (4-4) |
| Human: UX | 3 (2-4) | 2 (1-2) | 2 (2-3) |
| Human: creativity | 3 (1-4) | 1 (1-2) | 3 (2-3) |
| Active minutes | 16.6 (15-19.7) | 38.4 (24.6-46) | 37.2 (35.7-40.8) |
| Model steps | 31 (26-31) | 38 (33-39) | 67 (54-72) |
| Output tokens | 68190 (62996-80049) | 71915 (71004-77552) | 118442 (104134-122393) |
| Cost (USD) | 3.5922 (2.9179-4.0622) | 1.7962 (1.7703-1.9115) | 12.8951 (10.959-13.756) |
