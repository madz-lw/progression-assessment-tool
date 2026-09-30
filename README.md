# LEVEL UP

Turns a completed TPXimpact Progression Assessment 2026 into a retro game: partially met areas become boss levels, met areas become bonus stages, and each framework objective you tick off becomes assessment evidence.

## Run it

You need Node.js 18 or later.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Click "Play as Julia" for the demo, or drop in a completed assessment .xlsx.

`npm run build` produces a static site in `dist/` you can host anywhere.

## How it's organised

| File | What it does |
| --- | --- |
| `index.html` | Page shell: header and an empty `<main>` the app renders into |
| `src/app.js` | All screens and the game: start screen, player card, world map, boss cards, bonus stages, XP, achievements, and the Deadline Dash runner |
| `src/lib/framework.js` | Framework helpers: finds a role's skills at a level, and the descriptors for that level and the next |
| `src/lib/scoring.js` | Same scoring as the template: Partially Met 2, Met 3, Exceeding 4; under 3 is Partially Met, under 3.75 Met |
| `src/lib/parseAssessment.js` | Reads the uploaded .xlsx in the browser (SheetJS) from the template's fixed cells |
| `src/lib/sound.js` | 8-bit sound effects (Web Audio) |
| `src/lib/sprites.js` | Pixel-art sprites drawn as SVG |
| `standalone/level-up.html` | The same app as one self-contained file: double-click to open, no install |
| `src/data/framework.json` | Roles, skills, level descriptors and behaviours, generated from the template |
| `src/data/examples.json` | Hand-written walkthrough examples, keyed by `"Role|Level"` then item |
| `src/data/sampleJulia.js` | The fictional demo player |
| `src/style.css` | All styling, including light and dark themes |
| `scripts/extract_framework.py` | Regenerates `framework.json` from a new template version |

## Common changes

- **New template version:** `pip install openpyxl`, then `python3 scripts/extract_framework.py path/to/template.xlsx`.
- **Examples for another role:** add a `"Role|Level"` block to `src/data/examples.json`, same shape as the Software Engineer one.
- **Template layout changes:** update the cell references in `src/lib/parseAssessment.js`.

## Claude features

The "Another example" button and generated examples for roles without hand-written content use `window.claude`, which only exists when the page runs inside claude.ai. Here they're skipped automatically. To bring them back, pre-generate examples with the Anthropic API into `examples.json`, or add a small backend that holds the API key.

## Data

Assessments are parsed in the browser and progress is stored in localStorage; nothing is sent anywhere. Check with People and InfoSec before using real assessments.
