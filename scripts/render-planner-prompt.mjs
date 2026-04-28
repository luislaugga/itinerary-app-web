#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const defaults = {
  profile: "full",
  mode: "first_pass",
  version: "v1",
  prompt: "prompts/planner.poml",
  tripRequirements: "inputs/family_trip_requirements.yaml",
  routeGuide: "inputs/family_trip_route_towns_campgrounds.md",
  itinerarySchema: "itinerary/itinerary.schema.json",
  daySchema: "itinerary/day.schema.json",
  locationSchema: "itinerary/location.schema.json",
  refineRequestSchema: "itinerary/refine_request.schema.yaml",
  refineRequest: "",
  itineraryInput: "",
  out: "",
};

function parseArgs(argv) {
  const args = { ...defaults };
  const explicit = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === "--profile" && next) {
      args.profile = next;
      explicit.add("profile");
      index += 1;
      continue;
    }
    if (token === "--mode" && next) {
      args.mode = next;
      explicit.add("mode");
      index += 1;
      continue;
    }
    if (token === "--version" && next) {
      args.version = next;
      explicit.add("version");
      index += 1;
      continue;
    }
    if (token === "--prompt" && next) {
      args.prompt = next;
      explicit.add("prompt");
      index += 1;
      continue;
    }
    if (token === "--trip-requirements" && next) {
      args.tripRequirements = next;
      explicit.add("tripRequirements");
      index += 1;
      continue;
    }
    if (token === "--route-guide" && next) {
      args.routeGuide = next;
      explicit.add("routeGuide");
      index += 1;
      continue;
    }
    if (token === "--itinerary-schema" && next) {
      args.itinerarySchema = next;
      explicit.add("itinerarySchema");
      index += 1;
      continue;
    }
    if (token === "--day-schema" && next) {
      args.daySchema = next;
      explicit.add("daySchema");
      index += 1;
      continue;
    }
    if (token === "--location-schema" && next) {
      args.locationSchema = next;
      explicit.add("locationSchema");
      index += 1;
      continue;
    }
    if (token === "--refine-request-schema" && next) {
      args.refineRequestSchema = next;
      explicit.add("refineRequestSchema");
      index += 1;
      continue;
    }
    if (token === "--refine-request" && next) {
      args.refineRequest = next;
      explicit.add("refineRequest");
      index += 1;
      continue;
    }
    if (token === "--itinerary-input" && next) {
      args.itineraryInput = next;
      explicit.add("itineraryInput");
      index += 1;
      continue;
    }
    if (token === "--out" && next) {
      args.out = next;
      explicit.add("out");
      index += 1;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!["first_pass", "refinement"].includes(args.mode)) {
    throw new Error(`Unsupported mode "${args.mode}". Use "first_pass" or "refinement".`);
  }

  if (!["full", "compact"].includes(args.profile)) {
    throw new Error(`Unsupported profile "${args.profile}". Use "full" or "compact".`);
  }

  const profileDefaults = {
    full: {
      prompt: "prompts/planner.poml",
      tripRequirements: "inputs/family_trip_requirements.yaml",
      routeGuide: "inputs/family_trip_route_towns_campgrounds.md",
      itinerarySchema: "itinerary/itinerary.schema.json",
      daySchema: "itinerary/day.schema.json",
      locationSchema: "itinerary/location.schema.json",
      refineRequestSchema: "itinerary/refine_request.schema.yaml",
    },
    compact: {
      prompt: "prompts/planner.poml",
      tripRequirements: "inputs/family_trip_requirements.yaml",
      routeGuide: "inputs/family_trip_route_towns_campgrounds.md",
      itinerarySchema: "itinerary/itinerary.schema.json",
      daySchema: "itinerary/day.schema.json",
      locationSchema: "itinerary/location.schema.json",
      refineRequestSchema: "itinerary/refine_request.schema.yaml",
    },
  };

  for (const [key, value] of Object.entries(profileDefaults[args.profile])) {
    if (!explicit.has(key)) {
      args[key] = value;
    }
  }

  return args;
}

function printHelp() {
  console.log(
    [
      "Render the planner POML with real workspace inputs.",
      "",
      "Usage:",
      "  node scripts/render-planner-prompt.mjs --profile compact --mode first_pass --version v1 --out tmp/planner-v1.poml",
      "  node scripts/render-planner-prompt.mjs --profile compact --mode refinement --version v1 --out tmp/planner-v2.poml",
      "  node scripts/render-planner-prompt.mjs --mode refinement --version v3-claude-opus-4.7 --refine-request /abs/path/refine_request.yaml --out tmp/planner-v3-refine.poml",
      "",
      "Options:",
      "  --profile           full | compact",
      "  --mode              first_pass | refinement",
      "  --version           source version folder to read, for example v1",
      "  --prompt            path to planner.poml",
      "  --trip-requirements path to family_trip_requirements.yaml",
      "  --route-guide       path to family_trip_route_towns_campgrounds.md",
      "  --itinerary-schema  path to itinerary.schema.json",
      "  --day-schema        path to day.schema.json",
      "  --location-schema   path to location.schema.json",
      "  --refine-request-schema path to refine_request.schema.yaml",
      "  --refine-request    optional explicit path to refine_request.yaml for refinement mode",
      "  --itinerary-input   optional explicit path to itinerary.json for refinement mode",
      "  --out               write rendered prompt to a file instead of stdout",
    ].join("\n")
  );
}

function readText(relativePath) {
  const absolutePath = path.resolve(ROOT, relativePath);
  return fs.readFileSync(absolutePath, "utf8").trimEnd();
}

function readOptional(relativePath, fallback) {
  const absolutePath = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return fallback;
  }
  return fs.readFileSync(absolutePath, "utf8").trimEnd();
}

function replaceToken(template, token, value) {
  return template.split(`{{ ${token} }}`).join(value);
}

function getTemplateTokens(template) {
  const matches = [...template.matchAll(/{{\s*([^}]+?)\s*}}/g)];
  return new Set(matches.map((match) => match[1]));
}

function assertNoUnresolvedTokens(text) {
  const matches = [...text.matchAll(/{{\s*([^}]+?)\s*}}/g)];
  if (matches.length === 0) {
    return;
  }

  const unresolved = [...new Set(matches.map((match) => match[1]))].sort();
  throw new Error(`Rendered prompt still contains unresolved template tokens: ${unresolved.join(", ")}`);
}

function buildFirstPassDocs(version) {
  const nowIso = new Date().toISOString();
  return {
    "refine_request.yaml": "null",
    "itinerary.json": "null",
    modeBanner: [
      "<!-- Rendered by scripts/render-planner-prompt.mjs -->",
      `<!-- mode: first_pass -->`,
      `<!-- target_version: ${version} -->`,
      `<!-- rendered_at: ${nowIso} -->`,
    ].join("\n"),
  };
}

function buildRefinementDocs(version, args) {
  const versionDir = path.join("itinerary", "versions", version);
  const refineRequestPath = args.refineRequest || path.join(versionDir, "refine_request.yaml");
  const itineraryInputPath = args.itineraryInput || path.join(versionDir, "itinerary.json");
  const nowIso = new Date().toISOString();
  return {
    "refine_request.yaml": readOptional(refineRequestPath, "null"),
    "itinerary.json": readOptional(itineraryInputPath, "null"),
    modeBanner: [
      "<!-- Rendered by scripts/render-planner-prompt.mjs -->",
      `<!-- mode: refinement -->`,
      `<!-- source_version: ${version} -->`,
      `<!-- refine_request: ${refineRequestPath} -->`,
      `<!-- itinerary_input: ${itineraryInputPath} -->`,
      `<!-- rendered_at: ${nowIso} -->`,
    ].join("\n"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let template = readText(args.prompt);
  const templateTokens = getTemplateTokens(template);
  const sharedDocs = {};

  if (templateTokens.has("trip_requirements.yaml")) {
    sharedDocs["trip_requirements.yaml"] = readText(args.tripRequirements);
  }
  if (templateTokens.has("route_guide.md")) {
    sharedDocs["route_guide.md"] = readText(args.routeGuide);
  }
  if (templateTokens.has("itinerary.schema.yaml")) {
    sharedDocs["itinerary.schema.yaml"] = readText(args.itinerarySchema);
  }
  if (templateTokens.has("itinerary.schema.json")) {
    sharedDocs["itinerary.schema.json"] = readText(args.itinerarySchema);
  }
  if (templateTokens.has("day.schema.json")) {
    sharedDocs["day.schema.json"] = readText(args.daySchema);
  }
  if (templateTokens.has("location.schema.json")) {
    sharedDocs["location.schema.json"] = readText(args.locationSchema);
  }
  if (templateTokens.has("refine_request.schema.yaml")) {
    sharedDocs["refine_request.schema.yaml"] = readText(args.refineRequestSchema);
  }

  const modeDocs =
    args.mode === "first_pass" ? buildFirstPassDocs(args.version) : buildRefinementDocs(args.version, args);

  for (const [token, value] of Object.entries({ ...sharedDocs, ...modeDocs })) {
    if (token === "modeBanner") {
      continue;
    }
    template = replaceToken(template, token, value);
  }

  const rendered = `${modeDocs.modeBanner}\n${template}\n`;
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

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
