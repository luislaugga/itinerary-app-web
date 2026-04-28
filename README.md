# Trip Planning Workflow

This repo now uses a two-step trip-planning flow:

- step 1 builds a Google-grounded `baseline_route.json`
- step 2 builds a single-file `itinerary.json`
- refinement happens by re-running step 2 with `refine_request.yaml`

## Directory layout

```text
inputs/
  family_trip_requirements.yaml
  family_trip_route_towns_campgrounds.md
  baseline_route.json
  baseline_route.example.json

prompts/
  baseline-route.poml
  planner.poml

scripts/
  render-baseline-route-prompt.mjs
  render-planner-prompt.mjs

itinerary/
  baseline_route.schema.yaml
  itinerary.schema.yaml
  refine_request.schema.yaml
  versions/
    v1/
      itinerary.json
      refine_request.yaml

app-review-itinerary/
  index.html
  styles.css
  app.js
  server.js
```

## Flow

1. Render the baseline-route prompt:

```bash
node scripts/render-baseline-route-prompt.mjs --out tmp/baseline-route-prompt.poml
```

2. Use a model with Google Maps grounding to generate `inputs/baseline_route.json`.

3. Render the itinerary prompt:

```bash
node scripts/render-planner-prompt.mjs --profile compact --mode first_pass --version v1 --out tmp/planner-v1.poml
```

4. Use a model to generate `itinerary/versions/v1/itinerary.json`.

5. Review in the app and save refinement feedback as `refine_request.yaml`.

## Notes

- The `.schema.yaml` files are descriptive schemas, not strict JSON Schema documents.
- `baseline_route.json` is a step-1 handoff, not the final itinerary.
- `itinerary.json` is the single runtime source of truth for the review app.

## Review App

The repo also contains a local review UI at `app-review-itinerary/index.html`.

- It auto-discovers itinerary bundles from `itinerary/versions/`.
- It loads the newest itinerary version by default.
- It reads and writes `refine_request.yaml` inside the selected version folder.
- It lets you browse the itinerary as a schedule or as a route map.
- It lets you assign feedback decisions to itinerary places.
- It uses a real slippy map with the itinerary drawn as an overlay.

Version folder convention:

- Each itinerary version lives in its own folder, for example `itinerary/versions/v1/`.
- The review app expects `itinerary.json` there and optionally `refine_request.yaml`.
- When you review a version, the app auto-saves `refine_request.yaml` into that same folder.

Example local server:

```bash
node app-review-itinerary/server.js
```

Then open:

```text
http://localhost:8000/
```
