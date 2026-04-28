#!/usr/bin/env node

import fs from "fs";
import path from "path";

function printUsage() {
  console.error(
    [
      "Usage:",
      "  node scripts/convert-itinerary-schema.mjs <input.json> [output.json]",
      "",
      "If no output path is provided, the input file is overwritten.",
    ].join("\n")
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function hashString(value) {
  return String(value || "").split("").reduce((accumulator, character) => {
    return (accumulator * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function buildSyntheticGooglePlaceId(url, location) {
  const basis = [
    url,
    location?.id,
    location?.name,
    location?.coordinates?.lat,
    location?.coordinates?.lng,
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim())
    .join("|");

  return `synthetic_gmaps_${hashString(basis).toString(36)}`;
}

function extractGooglePlaceId(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const directParams = [
      "query_place_id",
      "destination_place_id",
      "origin_place_id",
      "place_id",
      "cid",
      "ftid",
    ];

    for (const key of directParams) {
      const match = parsed.searchParams.get(key);
      if (match) {
        return match;
      }
    }

    const pathMatch =
      parsed.pathname.match(/!1s([^!/?]+)/) ||
      parsed.pathname.match(/\/place\/.*?\/data=.*?!1s([^!/?]+)/) ||
      parsed.pathname.match(/\/maps\/place\/([^/?]+)/);
    if (pathMatch?.[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
  } catch (error) {
    return "";
  }

  return "";
}

function mapLegacyTypeToTypes(location) {
  const type = normalizeText(location?.type).toLowerCase();
  const searchText = [location?.name, location?.description, location?.address]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(supercharger|fastned|ionity|charger|charging|\bev\b)/i.test(searchText)) {
    return ["electric_vehicle_charging_station"];
  }

  const lookup = {
    restaurant: ["restaurant"],
    hotel: ["hotel"],
    campground: ["campground"],
    bakery: ["bakery"],
    coffee: ["coffee_shop"],
    beach: ["beach"],
    "natural park": ["nature_reserve"],
    playground: ["park"],
    supermarket: ["supermarket"],
    "local food store": ["market"],
    store: ["store"],
    "sightseeing/miradouro/place-with-view": ["viewpoint"],
    "ice cream shop": ["ice_cream_shop"],
  };

  if (lookup[type]) {
    return lookup[type];
  }

  if (/\bhome\b/i.test(location?.name || "")) {
    return ["address"];
  }

  return ["store"];
}

function mapLegacyEditorial(editorial) {
  const priority = normalizeText(editorial?.priority);
  if (!priority) {
    return undefined;
  }

  const popularityByPriority = {
    hidden_gem: "hidden_gem",
    worth_a_stop: "known_place",
    anchor: "known_place",
    practical: "known_place",
    unmissable: "touristic",
    optional: "known_place",
  };

  return {
    popularity: popularityByPriority[priority] || "known_place",
  };
}

function mapLegacyAccommodation(location) {
  const features = Array.isArray(location?.accommodation?.features)
    ? location.accommodation.features
    : [];
  if (!features.length) {
    return undefined;
  }

  const amenities = [];
  const campingStyles = [];

  if (features.includes("van_ok")) {
    campingStyles.push("campervan");
  }
  if (features.includes("rooftop_tent_ok")) {
    campingStyles.push("tent");
  }
  if (!campingStyles.length) {
    campingStyles.push("tent");
  }

  if (features.includes("playground")) {
    amenities.push("playground");
  }
  if (features.includes("pool")) {
    amenities.push("pool");
  }
  if (features.includes("laundry")) {
    amenities.push("laundry");
  }
  if (features.includes("bike_rental")) {
    amenities.push("bike_rental");
  }
  if (features.includes("ev_charging")) {
    amenities.push("ev_charging");
  }

  return {
    campground: {
      camping_styles: [...new Set(campingStyles)],
      surface: features.includes("soft_pitch") ? "soft_pitch" : "unknown",
      shade: features.includes("shade") ? "good" : "unknown",
      sanitary: {
        hot_showers: features.includes("hot_showers") ? true : null,
        clean_toilets: features.includes("clean_toilets") ? true : null,
      },
      quiet_hours: {
        enforced: features.includes("quiet_after_22") ? true : null,
        starts_at: features.includes("quiet_after_22") ? "22:00" : null,
      },
      amenities,
      notes: null,
    },
  };
}

function convertLocation(oldLocation) {
  const googleUrl = normalizeText(oldLocation.google_maps_url);
  const googlePlaceId = extractGooglePlaceId(googleUrl) || buildSyntheticGooglePlaceId(googleUrl, oldLocation);
  const description = firstNonEmpty(oldLocation.description);
  const editorial = mapLegacyEditorial(oldLocation.editorial);
  const locationDetails = mapLegacyAccommodation(oldLocation);

  const nextLocation = {
    id: oldLocation.id,
    name: firstNonEmpty(oldLocation.name, oldLocation.id, "Unnamed location"),
    description: description || null,
    geo: {
      main: {
        lat: Number(oldLocation.coordinates?.lat),
        lng: Number(oldLocation.coordinates?.lng),
      },
    },
    location: {
      address: normalizeText(oldLocation.address) || null,
      formatted_address: normalizeText(oldLocation.address) || null,
      locality: normalizeText(oldLocation.locality) || null,
      region: normalizeText(oldLocation.region) || null,
      postcode: normalizeText(oldLocation.postcode) || null,
      country: normalizeText(oldLocation.country) || null,
    },
    types: mapLegacyTypeToTypes(oldLocation),
  };

  if (editorial) {
    nextLocation.editorial = editorial;
  }

  if (oldLocation.photo_url) {
    nextLocation.photo = {
      url: oldLocation.photo_url,
      alt: normalizeText(oldLocation.photo_alt) || nextLocation.name,
      source: null,
    };
  }

  if (googleUrl) {
    nextLocation.provider_refs = {
      google_maps: {
        place_id: googlePlaceId,
        url: googleUrl,
        rating: null,
      },
    };
  }

  if (locationDetails) {
    nextLocation.location_details = locationDetails;
  }

  return nextLocation;
}

function mapRouteVariant(style) {
  const normalized = normalizeText(style).toLowerCase();
  if (normalized === "fast" || normalized === "fastest") {
    return "fastest";
  }
  if (normalized === "scenic") {
    return "scenic";
  }
  return "custom";
}

function mapRouteConstraints(style) {
  const normalized = normalizeText(style).toLowerCase();
  const constraints = [];
  if (normalized === "no_highways") {
    constraints.push("avoid_highways");
  }
  return constraints;
}

function uniqueLocationIds(values) {
  const seen = new Set();
  const ids = [];
  for (const value of values || []) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

function convertRoute(oldRoute, movement, index) {
  const styleSlug = normalizeText(oldRoute.style).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const routeId = firstNonEmpty(oldRoute.id, `${movement.id}_${styleSlug || `route_${index + 1}`}`);
  const waypointLocations = uniqueLocationIds((oldRoute.waypoints || []).map((waypoint) => waypoint.location_id)).filter(
    (locationId) => locationId && locationId !== movement.start_location_id && locationId !== movement.end_location_id
  );

  return {
    id: routeId,
    variant: mapRouteVariant(oldRoute.style),
    constraints: mapRouteConstraints(oldRoute.style),
    note: normalizeText(oldRoute.summary || oldRoute.note) || null,
    distance_km: Number.isFinite(oldRoute.distance_km) ? oldRoute.distance_km : null,
    duration_minutes: Number.isFinite(oldRoute.duration_minutes) ? oldRoute.duration_minutes : null,
    external_maps: {
      google_maps: normalizeText(oldRoute.open_route_url) || null,
      apple_maps: null,
      abrp: null,
    },
    waypoint_locations: waypointLocations,
  };
}

function buildFallbackRouteFromMovement(oldMovement) {
  const waypointLocations = uniqueLocationIds((oldMovement.route?.waypoints || []).map((waypoint) => waypoint.location_id)).filter(
    (locationId) => locationId && locationId !== oldMovement.start_location_id && locationId !== oldMovement.end_location_id
  );

  return {
    id: `${oldMovement.id}_default`,
    variant: "custom",
    constraints: [],
    note: normalizeText(oldMovement.summary) || null,
    distance_km: Number.isFinite(oldMovement.distance_km) ? oldMovement.distance_km : null,
    duration_minutes: Number.isFinite(oldMovement.duration_minutes) ? oldMovement.duration_minutes : null,
    external_maps: {
      google_maps: normalizeText(oldMovement.route?.open_route_url) || null,
      apple_maps: null,
      abrp: null,
    },
    waypoint_locations: waypointLocations,
  };
}

function convertMovement(oldMovement) {
  const oldRoutes = Array.isArray(oldMovement.route_options) ? oldMovement.route_options : [];
  const routes = oldRoutes.length ? oldRoutes.map((route, index) => convertRoute(route, oldMovement, index)) : [buildFallbackRouteFromMovement(oldMovement)];
  const explicitDefaultIndex = oldRoutes.findIndex((route) => route.is_selected);
  const explicitDefault = explicitDefaultIndex >= 0 ? routes[explicitDefaultIndex]?.id : "";
  const defaultRouteId = explicitDefault || routes[0]?.id || null;

  return {
    id: oldMovement.id,
    mode: oldMovement.mode || "car",
    start_location_id: oldMovement.start_location_id,
    end_location_id: oldMovement.end_location_id,
    note: normalizeText(oldMovement.summary) || null,
    default_route_id: defaultRouteId,
    routes,
  };
}

function convertDay(oldDay, index) {
  const nearbyLocations = uniqueLocationIds(
    (oldDay.nearby_suggestions || []).map((suggestion) => suggestion.location_id)
  );

  const nextDay = {
    id: oldDay.id || `day_${index + 1}`,
    date: oldDay.date,
    wake_location_id: oldDay.wake_location_id,
    sleep_location_id: oldDay.sleep_location_id,
    note: normalizeText(oldDay.summary || oldDay.note) || null,
    base: nearbyLocations.length
      ? {
          anchor:
            oldDay.wake_location_id &&
            oldDay.sleep_location_id &&
            oldDay.wake_location_id !== oldDay.sleep_location_id
              ? "sleep"
              : "sleep",
          nearby_locations: nearbyLocations,
        }
      : null,
    movements: (oldDay.movements || []).map(convertMovement),
  };

  return nextDay;
}

function isAlreadyNewSchema(itinerary) {
  return Boolean(
    Array.isArray(itinerary?.locations) &&
      itinerary.locations.every(
        (location) =>
          location &&
          typeof location === "object" &&
          location.geo &&
          Array.isArray(location.types)
      )
  );
}

function convertItinerary(oldItinerary) {
  if (isAlreadyNewSchema(oldItinerary)) {
    return oldItinerary;
  }

  return {
    schema_version: "4.0.0",
    version_id: firstNonEmpty(oldItinerary.version_id, "v1"),
    locations: (oldItinerary.locations || []).map(convertLocation),
    days: (oldItinerary.days || []).map(convertDay),
    note: normalizeText(oldItinerary.note) || null,
  };
}

const [, , inputArg, outputArg] = process.argv;
if (!inputArg) {
  printUsage();
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
const outputPath = path.resolve(process.cwd(), outputArg || inputArg);
const inputJson = readJson(inputPath);
const converted = convertItinerary(inputJson);
writeJson(outputPath, converted);

console.log(`Converted itinerary schema: ${path.relative(process.cwd(), inputPath)} -> ${path.relative(process.cwd(), outputPath)}`);
