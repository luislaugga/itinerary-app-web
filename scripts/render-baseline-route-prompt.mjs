#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const defaults = {
  prompt: "prompts/baseline-route.poml",
  tripRequirements: "inputs/family_trip_requirements.yaml",
  routeGuide: "inputs/family_trip_route_towns_campgrounds.md",
  baselineRouteSchema: "itinerary/baseline_route.schema.yaml",
  baselineRouteExample: "inputs/baseline_route.example.json",
  out: "",
};

function parseArgs(argv) {
  const args = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--prompt" && next) {
      args.prompt = next;
      index += 1;
      continue;
    }
    if (token === "--trip-requirements" && next) {
      args.tripRequirements = next;
      index += 1;
      continue;
    }
    if (token === "--route-guide" && next) {
      args.routeGuide = next;
      index += 1;
      continue;
    }
    if (token === "--baseline-route-schema" && next) {
      args.baselineRouteSchema = next;
      index += 1;
      continue;
    }
    if (token === "--baseline-route-example" && next) {
      args.baselineRouteExample = next;
      index += 1;
      continue;
    }
    if (token === "--out" && next) {
      args.out = next;
      index += 1;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(
    [
      "Render the step-1 baseline-route prompt with real workspace inputs.",
      "",
      "Usage:",
      "  node scripts/render-baseline-route-prompt.mjs --out tmp/baseline-route-prompt.poml",
      "",
      "Options:",
      "  --prompt                 path to baseline-route.poml",
      "  --trip-requirements      path to family_trip_requirements.yaml",
      "  --route-guide            path to family_trip_route_towns_campgrounds.md",
      "  --baseline-route-schema  path to baseline_route.schema.yaml",
      "  --baseline-route-example path to baseline_route.example.json",
      "  --out                    write rendered prompt to a file instead of stdout",
    ].join("\n")
  );
}

function readText(relativePath) {
  const absolutePath = path.resolve(ROOT, relativePath);
  return fs.readFileSync(absolutePath, "utf8").trimEnd();
}

function replaceToken(template, token, value) {
  return template.split(`{{ ${token} }}`).join(value);
}

function assertNoUnresolvedTokens(text) {
  const matches = [...text.matchAll(/{{\s*([^}]+?)\s*}}/g)];
  if (matches.length === 0) {
    return;
  }

  const unresolved = [...new Set(matches.map((match) => match[1]))].sort();
  throw new Error(`Rendered prompt still contains unresolved template tokens: ${unresolved.join(", ")}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let template = readText(args.prompt);
  const banner = [
    "<!-- Rendered by scripts/render-baseline-route-prompt.mjs -->",
    `<!-- rendered_at: ${new Date().toISOString()} -->`,
  ].join("\n");

  template = replaceToken(template, "trip_requirements.yaml", readText(args.tripRequirements));
  template = replaceToken(template, "route_guide.md", readText(args.routeGuide));
  template = replaceToken(template, "baseline_route.schema.yaml", readText(args.baselineRouteSchema));
  template = replaceToken(template, "baseline_route.example.json", readText(args.baselineRouteExample));

  const rendered = `${banner}\n${template}\n`;
  assertNoUnresolvedTokens(rendered);

  if (args.out) {
    const outPath = path.resolve(ROOT, args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, rendered, "utf8");
    console.log(path.relative(ROOT, outPath));
    return;
  }

  process.stdout.write(rendered);
}

main();
