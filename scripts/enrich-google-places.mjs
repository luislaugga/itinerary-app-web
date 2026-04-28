#!/usr/bin/env node

import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const GOOGLE_API_KEY = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_ITINERARY_GLOB_DIR = path.join(ROOT_DIR, "itinerary", "versions");
const SYNTHETIC_PLACE_ID_PREFIX = "synthetic_gmaps_";

function printUsage() {
  console.log(
    [
      "Enrich itinerary locations with real Google place ids and photo URIs.",
      "",
      "Usage:",
      "  node scripts/enrich-google-places.mjs [file-or-dir ...] [--write] [--limit=N] [--force-photo] [--force-place-id]",
      "",
      "Examples:",
      "  node scripts/enrich-google-places.mjs itinerary/versions/v1-codex-gpt-5.4/itinerary.json --write",
      "  node scripts/enrich-google-places.mjs itinerary/versions --write --limit=20",
      "",
      "Requires:",
      "  GOOGLE_MAPS_API_KEY",
      "  Places API (New) enabled",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const options = {
    write: false,
    limit: Infinity,
    forcePhoto: false,
    forcePlaceId: false,
    targets: [],
  };

  for (const arg of argv) {
    if (arg === "--write") {
      options.write = true;
      continue;
    }
    if (arg === "--force-photo") {
      options.forcePhoto = true;
      continue;
    }
    if (arg === "--force-place-id") {
      options.forcePlaceId = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=").slice(1).join("="));
      if (Number.isFinite(value) && value >= 0) {
        options.limit = value;
      }
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
    options.targets.push(arg);
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isSyntheticPlaceId(placeId) {
  return normalizeText(placeId).startsWith(SYNTHETIC_PLACE_ID_PREFIX);
}

function buildGoogleMapsSearchQuery(location) {
  const query =
    extractGoogleMapsQuery(location?.provider_refs?.google_maps?.url) ||
    [normalizeText(location?.name), normalizeText(location?.location?.formatted_address), normalizeText(location?.location?.address)]
      .filter(Boolean)
      .join(", ");
  return query || normalizeText(location?.name) || "";
}

function buildGoogleMapsPlaceUrl(placeId, location) {
  const normalized = normalizeText(placeId);
  const query = buildGoogleMapsSearchQuery(location);
  if (!normalized || !query) {
    return "";
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(normalized)}`;
}

function collectItineraryFiles(targets) {
  const resolvedTargets = targets.length ? targets : [DEFAULT_ITINERARY_GLOB_DIR];
  const files = [];

  for (const target of resolvedTargets) {
    const absoluteTarget = path.resolve(process.cwd(), target);
    if (!fs.existsSync(absoluteTarget)) {
      continue;
    }

    const stats = fs.statSync(absoluteTarget);
    if (stats.isDirectory()) {
      const entries = fs.readdirSync(absoluteTarget, { withFileTypes: true });
      for (const entry of entries) {
        const childPath = path.join(absoluteTarget, entry.name);
        if (entry.isDirectory()) {
          const itineraryPath = path.join(childPath, "itinerary.json");
          if (fs.existsSync(itineraryPath)) {
            files.push(itineraryPath);
          }
          continue;
        }
        if (entry.isFile() && entry.name === "itinerary.json") {
          files.push(childPath);
        }
      }
      continue;
    }

    if (stats.isFile()) {
      files.push(absoluteTarget);
    }
  }

  return [...new Set(files)].sort();
}

function getLocationCoordinates(location) {
  const lat = Number.isFinite(location?.geo?.main?.lat)
    ? location.geo.main.lat
    : Number.isFinite(location?.coordinates?.lat)
      ? location.coordinates.lat
      : null;
  const lng = Number.isFinite(location?.geo?.main?.lng)
    ? location.geo.main.lng
    : Number.isFinite(location?.coordinates?.lng)
      ? location.coordinates.lng
      : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function buildTextQuery(location) {
  const name = normalizeText(location?.name);
  const address =
    normalizeText(location?.location?.formatted_address) ||
    normalizeText(location?.location?.address);
  const locality = normalizeText(location?.location?.locality);
  const region = normalizeText(location?.location?.region);
  const country = normalizeText(location?.location?.country);
  const queryFromUrl = extractGoogleMapsQuery(location?.provider_refs?.google_maps?.url);

  return (
    queryFromUrl ||
    [name, address, locality, region, country]
      .filter(Boolean)
      .join(", ")
  );
}

function extractGoogleMapsQuery(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return normalizeText(parsed.searchParams.get("query"));
  } catch (error) {
    return "";
  }
}

function scoreCandidate(location, candidate) {
  let score = 0;
  const queryName = normalizeText(location?.name).toLowerCase();
  const displayName = normalizeText(candidate?.displayName?.text).toLowerCase();
  const formattedAddress = normalizeText(candidate?.formattedAddress).toLowerCase();
  const types = Array.isArray(location?.types) ? location.types : [];
  const primaryType = normalizeText(candidate?.primaryType);
  const coords = getLocationCoordinates(location);
  const candidateLat = Number.isFinite(candidate?.location?.latitude) ? candidate.location.latitude : null;
  const candidateLng = Number.isFinite(candidate?.location?.longitude) ? candidate.location.longitude : null;

  if (queryName && displayName === queryName) {
    score += 60;
  } else if (queryName && displayName.includes(queryName)) {
    score += 35;
  }

  if (queryName && formattedAddress.includes(queryName)) {
    score += 10;
  }

  if (types.includes("campground") && primaryType === "campground") {
    score += 15;
  }
  if (types.includes("hotel") && primaryType === "lodging") {
    score += 15;
  }
  if (types.includes("restaurant") && ["restaurant", "food"].includes(primaryType)) {
    score += 15;
  }
  if (types.includes("electric_vehicle_charging_station") && primaryType === "electric_vehicle_charging_station") {
    score += 20;
  }

  if (coords && Number.isFinite(candidateLat) && Number.isFinite(candidateLng)) {
    const distancePenalty = haversineKm(coords.lat, coords.lng, candidateLat, candidateLng);
    if (distancePenalty < 0.2) {
      score += 20;
    } else if (distancePenalty < 1) {
      score += 10;
    } else if (distancePenalty < 5) {
      score += 3;
    } else {
      score -= Math.min(distancePenalty * 2, 25);
    }
  }

  return score;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithFallback(url, options);
  const text = response.text;
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage = payload?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return payload;
}

function fetchWithFallback(url, options = {}) {
  if (typeof fetch === "function") {
    return fetch(url, options).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: await response.text(),
    }));
  }

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const request = https.request(
      parsedUrl,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode || 0,
            statusText: response.statusMessage || "",
            text: body,
          });
        });
      }
    );

    request.on("error", reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

async function searchPlace(location) {
  const query = buildTextQuery(location);
  if (!query) {
    return null;
  }

  const coords = getLocationCoordinates(location);
  const body = {
    textQuery: query,
    pageSize: 5,
    languageCode: "en",
  };

  if (coords) {
    body.locationBias = {
      circle: {
        center: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
        radius: 5000,
      },
    };
  }

  const payload = await fetchJson("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.photos",
    },
    body: JSON.stringify(body),
  });

  const candidates = Array.isArray(payload?.places) ? payload.places : [];
  if (!candidates.length) {
    return null;
  }

  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(location, candidate) }))
    .sort((left, right) => right.score - left.score)[0]?.candidate || null;
}

async function fetchPlacePhotoUri(placeId) {
  const payload = await fetchJson(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "id,photos",
    },
  });

  const photoName = payload?.photos?.[0]?.name;
  if (!photoName) {
    return null;
  }

  const photoPayload = await fetchJson(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1600&skipHttpRedirect=true&key=${encodeURIComponent(
      GOOGLE_API_KEY
    )}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return normalizeText(photoPayload?.photoUri) || null;
}

function shouldEnrichLocation(location, options) {
  const existingPlaceId = normalizeText(location?.provider_refs?.google_maps?.place_id);
  const existingPhoto = normalizeText(location?.photo?.url);
  const needsPlaceId = options.forcePlaceId || !existingPlaceId || isSyntheticPlaceId(existingPlaceId);
  const needsPhoto = options.forcePhoto || !existingPhoto || existingPhoto.includes("location-placeholder.svg");
  return needsPlaceId || needsPhoto;
}

async function enrichLocation(location, options) {
  if (!shouldEnrichLocation(location, options)) {
    return { updated: false, reason: "already_complete" };
  }

  const match = await searchPlace(location);
  if (!match?.id) {
    return { updated: false, reason: "no_match" };
  }

  location.provider_refs = {
    ...(location.provider_refs || {}),
    google_maps: {
      ...(location.provider_refs?.google_maps || {}),
      place_id: match.id,
      url: buildGoogleMapsPlaceUrl(match.id, location),
      rating: location?.provider_refs?.google_maps?.rating ?? null,
    },
  };

  const currentPhotoUrl = normalizeText(location?.photo?.url);
  const shouldFetchPhoto = options.forcePhoto || !currentPhotoUrl || currentPhotoUrl.includes("location-placeholder.svg");

  if (shouldFetchPhoto) {
    const photoUri = await fetchPlacePhotoUri(match.id);
    if (photoUri) {
      location.photo = {
        ...(location.photo || {}),
        url: photoUri,
        alt: normalizeText(location?.photo?.alt) || normalizeText(location?.name) || null,
        source: "google_places",
      };
    }
  }

  return {
    updated: true,
    reason: "matched",
    placeId: match.id,
    displayName: match.displayName?.text || "",
  };
}

async function enrichItineraryFile(filePath, options) {
  const itinerary = readJson(filePath);
  const locations = Array.isArray(itinerary?.locations) ? itinerary.locations : [];
  let processed = 0;
  let updated = 0;

  for (const location of locations) {
    if (processed >= options.limit) {
      break;
    }

    if (!shouldEnrichLocation(location, options)) {
      continue;
    }

    processed += 1;
    try {
      const result = await enrichLocation(location, options);
      if (result.updated) {
        updated += 1;
        console.log(`matched ${location.id} -> ${result.placeId} ${result.displayName ? `(${result.displayName})` : ""}`);
      } else {
        console.log(`skipped ${location.id} (${result.reason})`);
      }
    } catch (error) {
      console.warn(`failed ${location.id}: ${error.message}`);
    }

    await sleep(120);
  }

  if (options.write && updated > 0) {
    writeJson(filePath, itinerary);
  }

  return { processed, updated };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is required.");
  }

  const files = collectItineraryFiles(options.targets);
  if (!files.length) {
    throw new Error("No itinerary.json files found.");
  }

  for (const filePath of files) {
    console.log(`\n==> ${path.relative(process.cwd(), filePath)}`);
    const result = await enrichItineraryFile(filePath, options);
    console.log(`processed=${result.processed} updated=${result.updated}${options.write ? " wrote=yes" : " wrote=no"}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
