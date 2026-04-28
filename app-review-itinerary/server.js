const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 8000);
const GOOGLE_MAPS_API_KEY = String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
const ROOT_DIR = path.resolve(__dirname, "..");
const REVIEW_APP_DIR = path.resolve(ROOT_DIR, "app-review-itinerary");
const ITINERARY_VERSIONS_DIR = path.resolve(ROOT_DIR, "itinerary", "versions");
const CURATED_LOCATIONS_PATH = path.resolve(ROOT_DIR, "itinerary", "curated_locations.json");
const PLACEHOLDER_PHOTO_PATH = "/app-review-itinerary/assets/location-placeholder.svg";

const KNOWN_LOCATION_TYPES = new Set([
  "hotel",
  "campground",
  "restaurant",
  "bakery",
  "coffee",
  "beach",
  "natural park",
  "playground",
  "supermarket",
  "local food store",
  "store",
  "sightseeing/miradouro/place-with-view",
  "ice cream shop",
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".yaml": "application/yaml; charset=utf-8",
  ".yml": "application/yaml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
};

function send(response, statusCode, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(body);
}

function sendJson(response, statusCode, payload) {
  send(response, statusCode, JSON.stringify(payload, null, 2));
}

function resolveStaticRequestPath(requestUrl) {
  const pathname = decodeURIComponent((requestUrl || "/").split("?")[0]);
  if (pathname === "/") {
    return "/app-review-itinerary/index.html";
  }
  if (pathname === "/app-review-itinerary" || pathname === "/app-review-itinerary/") {
    return "/app-review-itinerary/index.html";
  }
  return pathname;
}

function sortVersionIds(versionIds) {
  return versionIds.sort((left, right) => {
    const leftNumber = Number(left.replace(/^v/i, ""));
    const rightNumber = Number(right.replace(/^v/i, ""));

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right, undefined, { numeric: true });
  });
}

function listVersions() {
  if (!fs.existsSync(ITINERARY_VERSIONS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(ITINERARY_VERSIONS_DIR, { withFileTypes: true });
  const versions = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^v[\w.-]+$/i.test(name));

  return sortVersionIds(versions);
}

function getVersionDir(versionId) {
  return path.resolve(ITINERARY_VERSIONS_DIR, versionId);
}

function assertVersionDir(versionId) {
  const versionDir = getVersionDir(versionId);
  if (!versionDir.startsWith(ITINERARY_VERSIONS_DIR)) {
    throw new Error("Invalid version path.");
  }
  return versionDir;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeLocationType(value) {
  return KNOWN_LOCATION_TYPES.has(value) ? value : "store";
}

function hashString(value) {
  return String(value || "").split("").reduce((accumulator, character) => {
    return (accumulator * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function inferLocationVisualCategory(location) {
  const type = normalizeLocationType(location.type);
  const searchableText = `${location.name || ""} ${location.description || ""}`.toLowerCase();

  if (/tesla|supercharger|fastned|ionity|charger|charging|ev\b/.test(searchableText)) {
    return "charger";
  }
  if (type === "hotel") {
    return "hotel";
  }
  if (type === "campground") {
    return "campground";
  }
  if (["restaurant", "bakery", "coffee", "ice cream shop"].includes(type)) {
    return "restaurant";
  }
  if (["supermarket", "local food store", "store"].includes(type)) {
    return "groceries";
  }
  if (type === "beach") {
    return "beach";
  }
  if (["natural park", "playground"].includes(type)) {
    return "park";
  }
  return "things_to_do";
}

function deriveLocationPhotoUrl(location) {
  const visualCategory = inferLocationVisualCategory(location);
  const photoLibrary = {
    campground: [
      "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    ],
    hotel: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    ],
    restaurant: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
    ],
    charger: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80",
    ],
    groceries: [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
    ],
    beach: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
    ],
    park: [
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    ],
    things_to_do: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80",
    ],
  };

  const options = photoLibrary[visualCategory] || photoLibrary.things_to_do;
  return options[hashString(location.id || location.name) % options.length];
}

function deriveLocationWebsiteUrl(location) {
  const name = `${location.name || ""}`.toLowerCase();

  if (name.includes("huttopia")) {
    return "https://europe.huttopia.com/en/";
  }
  if (name.includes("wecamp")) {
    return "https://wecamp.net/en/";
  }
  if (name.includes("orbitur")) {
    return "https://www.orbitur.pt/en/";
  }
  if (name.includes("tesla")) {
    return "https://www.tesla.com/findus";
  }
  if (name.includes("fastned")) {
    return "https://www.fastnedcharging.com/en/locations";
  }
  if (name.includes("ionity")) {
    return "https://www.ionity.eu/";
  }
  if (name.includes("carrefour")) {
    return "https://www.carrefour.com/";
  }
  if (name.includes("intermarch")) {
    return "https://www.intermarche.com/";
  }
  if (name.includes("pingo doce")) {
    return "https://www.pingodoce.pt/";
  }
  if (name.includes("bon preu")) {
    return "https://www.bonpreuesclat.cat/";
  }
  if (name.includes("covir")) {
    return "https://www.coviran.com/";
  }

  return "";
}

function normalizeLocationPhotoUrl(location) {
  const directPhotoUrl = location.photo_url || location.photo?.url || "";
  if (directPhotoUrl && directPhotoUrl !== PLACEHOLDER_PHOTO_PATH) {
    return directPhotoUrl;
  }
  return deriveLocationPhotoUrl(location);
}

function getGooglePlaceId(location) {
  const placeId = location?.provider_refs?.google_maps?.place_id;
  return typeof placeId === "string" ? placeId.trim() : "";
}

function sanitizeLocationIdComponent(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function deriveCuratedLocationId(location) {
  const placeId = getGooglePlaceId(location);
  if (placeId) {
    return `location_${sanitizeLocationIdComponent(placeId)}`;
  }

  const rawId = typeof location?.id === "string" ? location.id.trim() : "";
  if (rawId) {
    const normalizedRawId = sanitizeLocationIdComponent(rawId);
    return normalizedRawId.startsWith("location_")
      ? normalizedRawId
      : `location_curated_${normalizedRawId}`;
  }

  return `location_curated_${hashString(location?.name || JSON.stringify(location))}`;
}

function normalizeRuntimeLocation(location, options = {}) {
  const placeId = getGooglePlaceId(location);
  const normalizedId =
    typeof options.idOverride === "string" && options.idOverride.trim()
      ? options.idOverride.trim()
      : deriveCuratedLocationId(location);

  return {
    id: normalizedId,
    google_place_id: placeId || "",
    type: getPrimaryLocationType(location),
    types: Array.isArray(location.types) ? location.types.filter((value) => typeof value === "string") : [],
    name: location.name || normalizedId || "Unnamed place",
    address: location.address || location.location?.address || location.location?.formatted_address || "",
    region: location.region || location.location?.region || "",
    country: location.country || location.location?.country || "",
    coordinates: {
      lat: Number.isFinite(location.coordinates?.lat)
        ? location.coordinates.lat
        : Number.isFinite(location.geo?.main?.lat)
          ? location.geo.main.lat
          : null,
      lng: Number.isFinite(location.coordinates?.lng)
        ? location.coordinates.lng
        : Number.isFinite(location.geo?.main?.lng)
          ? location.geo.main.lng
          : null,
    },
    google_maps_url: location.google_maps_url || location.provider_refs?.google_maps?.url || "",
    website_url: "",
    photo_url: normalizeLocationPhotoUrl(location),
    photo_alt: location.photo_alt || location.photo?.alt || location.name || "Location photo",
    description: location.description || location.editorial?.summary || "",
    editorial: normalizeEditorial(location.editorial),
    accommodation: mergeAccommodationData(
      normalizeAccommodation(location.accommodation),
      normalizeLocationDetails(location.location_details)
    ),
  };
}

function mergeUniqueStrings(...groups) {
  return [...new Set(groups.flat().filter((value) => typeof value === "string" && value.trim()))];
}

function mergeNormalizedLocations(primary, secondary) {
  if (!primary) {
    return secondary;
  }
  if (!secondary) {
    return primary;
  }

  return {
    ...primary,
    google_place_id: primary.google_place_id || secondary.google_place_id || "",
    type: primary.type || secondary.type || "store",
    types: mergeUniqueStrings(primary.types || [], secondary.types || []),
    name: primary.name || secondary.name,
    address: primary.address || secondary.address,
    region: primary.region || secondary.region,
    country: primary.country || secondary.country,
    coordinates: {
      lat: Number.isFinite(primary.coordinates?.lat) ? primary.coordinates.lat : secondary.coordinates?.lat ?? null,
      lng: Number.isFinite(primary.coordinates?.lng) ? primary.coordinates.lng : secondary.coordinates?.lng ?? null,
    },
    google_maps_url: primary.google_maps_url || secondary.google_maps_url || "",
    website_url: primary.website_url || secondary.website_url || "",
    photo_url: primary.photo_url || secondary.photo_url || "",
    photo_alt: primary.photo_alt || secondary.photo_alt || "",
    description: primary.description || secondary.description || "",
    editorial: primary.editorial || secondary.editorial || null,
    accommodation: mergeAccommodationData(primary.accommodation, secondary.accommodation),
  };
}

function mergeLocationCollections(primaryLocations, secondaryLocations) {
  const merged = primaryLocations.slice();
  const indexByPlaceId = new Map();
  const indexById = new Map();

  merged.forEach((location, index) => {
    if (location?.google_place_id) {
      indexByPlaceId.set(location.google_place_id, index);
    }
    if (location?.id) {
      indexById.set(location.id, index);
    }
  });

  secondaryLocations.forEach((location) => {
    if (!location?.id) {
      return;
    }

    const targetIndex =
      (location.google_place_id && indexByPlaceId.has(location.google_place_id)
        ? indexByPlaceId.get(location.google_place_id)
        : null) ??
      (indexById.has(location.id) ? indexById.get(location.id) : null);

    if (Number.isInteger(targetIndex) && targetIndex >= 0) {
      merged[targetIndex] = mergeNormalizedLocations(merged[targetIndex], location);
      return;
    }

    const nextIndex = merged.length;
    merged.push(location);
    if (location.google_place_id) {
      indexByPlaceId.set(location.google_place_id, nextIndex);
    }
    indexById.set(location.id, nextIndex);
  });

  return merged;
}

function loadCuratedLocations() {
  if (!fs.existsSync(CURATED_LOCATIONS_PATH)) {
    return [];
  }

  const payload = readJsonFile(CURATED_LOCATIONS_PATH);
  const locations = Array.isArray(payload?.locations) ? payload.locations : [];
  return locations.map((location) => normalizeRuntimeLocation(location));
}

function normalizeWaypoint(waypoint) {
  return {
    id: waypoint.id,
    order: Number.isFinite(waypoint.order) ? waypoint.order : 0,
    location_id: waypoint.location_id,
    role: waypoint.role || "waypoint",
    notes: waypoint.notes || "",
    stay_duration_minutes: Number.isFinite(waypoint.stay_duration_minutes)
      ? waypoint.stay_duration_minutes
      : null,
  };
}

function getPrimaryLocationType(location) {
  const legacyType = typeof location?.type === "string" ? location.type.trim() : "";
  if (legacyType) {
    return normalizeLocationType(legacyType);
  }

  const types = Array.isArray(location?.types) ? location.types.filter((value) => typeof value === "string") : [];
  const byPriority = [
    "campground",
    "hotel",
    "restaurant",
    "bakery",
    "coffee_shop",
    "ice_cream_shop",
    "supermarket",
    "grocery_store",
    "market",
    "electric_vehicle_charging_station",
    "beach",
    "park",
    "nature_reserve",
    "hiking_area",
    "wildlife_refuge",
    "viewpoint",
    "historical_landmark",
    "cultural_landmark",
    "landmark",
    "visitor_center",
    "store",
    "city",
    "town",
    "village",
    "region",
    "locality",
    "neighborhood",
    "address",
    "route",
    "parking",
  ];

  const nextType = byPriority.find((entry) => types.includes(entry)) || types[0] || "store";
  const map = {
    coffee_shop: "coffee",
    ice_cream_shop: "ice cream shop",
    grocery_store: "local food store",
    market: "local food store",
    park: "natural park",
    nature_reserve: "natural park",
    hiking_area: "natural park",
    wildlife_refuge: "natural park",
    viewpoint: "sightseeing/miradouro/place-with-view",
    historical_landmark: "sightseeing/miradouro/place-with-view",
    cultural_landmark: "sightseeing/miradouro/place-with-view",
    landmark: "sightseeing/miradouro/place-with-view",
    visitor_center: "sightseeing/miradouro/place-with-view",
    electric_vehicle_charging_station: "store",
    city: "store",
    town: "store",
    village: "store",
    region: "store",
    locality: "store",
    neighborhood: "store",
    address: "store",
    route: "store",
    parking: "store",
  };

  return normalizeLocationType(map[nextType] || nextType);
}

function normalizeEditorial(editorial) {
  if (!editorial || typeof editorial !== "object") {
    return null;
  }

  const priority =
    typeof editorial.priority === "string"
      ? editorial.priority
      : typeof editorial.popularity === "string"
        ? editorial.popularity
        : "";
  if (!priority) {
    return null;
  }

  return {
    priority: priority || "optional",
  };
}

function normalizeAccommodation(accommodation) {
  if (!accommodation || typeof accommodation !== "object") {
    return null;
  }

  const legacyFeatureMap = {
    van_ok: "van",
    rooftop_tent_ok: "van",
    ev_charging: "ev_charging",
    playground: "playground",
    pool: "pool",
    bike_rental: "bike_rental",
    laundry: "laundry",
  };

  const features = Array.isArray(accommodation.features)
    ? accommodation.features
        .map((feature) => legacyFeatureMap[feature] || feature)
        .filter((feature) => typeof feature === "string" && feature.trim())
    : [];
  if (!features.length) {
    return null;
  }

  return {
    features: [...new Set(features)],
  };
}

function normalizeLocationDetails(locationDetails) {
  const campground = locationDetails?.campground;
  if (!campground || typeof campground !== "object") {
    return null;
  }

  const features = [];
  const campingStyles = Array.isArray(campground.camping_styles) ? campground.camping_styles : [];
  const amenities = Array.isArray(campground.amenities) ? campground.amenities : [];

  if (amenities.includes("ev_charging")) {
    features.push("ev_charging");
  }
  if (amenities.includes("playground")) {
    features.push("playground");
  }
  if (amenities.includes("pool")) {
    features.push("pool");
  }
  if (amenities.includes("bike_rental")) {
    features.push("bike_rental");
  }
  if (amenities.includes("laundry")) {
    features.push("laundry");
  }

  const sanitary = campground.sanitary && typeof campground.sanitary === "object"
    ? {
        hot_showers:
          typeof campground.sanitary.hot_showers === "boolean" ? campground.sanitary.hot_showers : null,
        clean_toilets:
          typeof campground.sanitary.clean_toilets === "boolean" ? campground.sanitary.clean_toilets : null,
      }
    : null;

  const quiet_hours = campground.quiet_hours && typeof campground.quiet_hours === "object"
    ? {
        enforced:
          typeof campground.quiet_hours.enforced === "boolean" ? campground.quiet_hours.enforced : null,
        starts_at:
          typeof campground.quiet_hours.starts_at === "string" ? campground.quiet_hours.starts_at : null,
      }
    : null;

  const details = {
    features: [...new Set(features)],
    camping_styles: campingStyles.filter((value) => typeof value === "string" && value.trim()),
    shade: typeof campground.shade === "string" && campground.shade.trim() ? campground.shade : null,
    surface: typeof campground.surface === "string" && campground.surface.trim() ? campground.surface : null,
    sanitary,
    quiet_hours,
    amenities: amenities.filter((value) => typeof value === "string" && value.trim()),
    notes: typeof campground.notes === "string" ? campground.notes.trim() : "",
  };

  const hasUsefulData =
    details.features.length ||
    details.camping_styles.length ||
    details.shade ||
    details.surface ||
    details.amenities.length ||
    details.notes ||
    details.sanitary?.hot_showers != null ||
    details.sanitary?.clean_toilets != null ||
    details.quiet_hours?.enforced != null ||
    details.quiet_hours?.starts_at;

  return hasUsefulData ? details : null;
}

function mergeAccommodationData(primary, secondary) {
  if (!primary && !secondary) {
    return null;
  }

  const features = [
    ...(Array.isArray(primary?.features) ? primary.features : []),
    ...(Array.isArray(secondary?.features) ? secondary.features : []),
  ].filter((value) => typeof value === "string" && value.trim());

  const camping_styles = [
    ...(Array.isArray(primary?.camping_styles) ? primary.camping_styles : []),
    ...(Array.isArray(secondary?.camping_styles) ? secondary.camping_styles : []),
  ].filter((value) => typeof value === "string" && value.trim());

  const amenities = [
    ...(Array.isArray(primary?.amenities) ? primary.amenities : []),
    ...(Array.isArray(secondary?.amenities) ? secondary.amenities : []),
  ].filter((value) => typeof value === "string" && value.trim());

  const merged = {
    features: [...new Set(features)],
    camping_styles: [...new Set(camping_styles)],
    shade: primary?.shade || secondary?.shade || null,
    surface: primary?.surface || secondary?.surface || null,
    sanitary: primary?.sanitary || secondary?.sanitary || null,
    quiet_hours: primary?.quiet_hours || secondary?.quiet_hours || null,
    amenities: [...new Set(amenities)],
    notes: primary?.notes || secondary?.notes || "",
  };

  const hasUsefulData =
    merged.features.length ||
    merged.camping_styles.length ||
    merged.shade ||
    merged.surface ||
    merged.amenities.length ||
    merged.notes ||
    merged.sanitary?.hot_showers != null ||
    merged.sanitary?.clean_toilets != null ||
    merged.quiet_hours?.enforced != null ||
    merged.quiet_hours?.starts_at;

  return hasUsefulData ? merged : null;
}

function normalizeRouteVariant(variant, constraints = []) {
  const normalizedVariant = typeof variant === "string" ? variant : "";
  if (normalizedVariant === "fastest") {
    return "fast";
  }
  if (normalizedVariant === "scenic") {
    return "scenic";
  }
  if (constraints.includes("avoid_highways")) {
    return "no_highways";
  }
  return "route";
}

function normalizeRouteOption(option) {
  const constraints = Array.isArray(option.constraints) ? option.constraints.filter((value) => typeof value === "string") : [];
  const waypointLocations = Array.isArray(option.waypoint_locations)
    ? option.waypoint_locations.filter((value) => typeof value === "string" && value.trim())
    : [];
  const optionId =
    option.id ||
    (typeof option.style === "string" && option.style.trim() ? `route_${option.style.trim()}` : "");

  return {
    id: optionId,
    style: normalizeRouteVariant(option.variant || option.style, constraints),
    summary: option.summary || option.note || "",
    distance_km: Number.isFinite(option.distance_km) ? option.distance_km : null,
    duration_minutes: Number.isFinite(option.duration_minutes) ? option.duration_minutes : null,
    open_route_url: option.open_route_url || option.external_maps?.google_maps || option.external_maps?.apple_maps || "",
    is_selected: Boolean(option.is_selected),
    waypoints: waypointLocations.map((locationId, index) =>
      normalizeWaypoint({
        id: `${optionId || "route"}_wp_${index + 1}`,
        order: index + 1,
        location_id: locationId,
        role: "waypoint",
      })
    ),
  };
}

function normalizeMovement(movement) {
  const routeOptions = Array.isArray(movement.route_options)
    ? movement.route_options.map(normalizeRouteOption)
    : Array.isArray(movement.routes)
      ? movement.routes.map(normalizeRouteOption)
      : [];
  routeOptions.forEach((option) => {
    option.waypoints = option.waypoints.filter(
      (waypoint) =>
        waypoint.location_id &&
        waypoint.location_id !== movement.start_location_id &&
        waypoint.location_id !== movement.end_location_id
    );
  });
  const selectedRouteId =
    movement.default_route_id ||
    movement.selected_route_id ||
    routeOptions.find((option) => option.is_selected)?.id ||
    "";

  routeOptions.forEach((option, index) => {
    option.is_selected = selectedRouteId
      ? option.id === selectedRouteId
      : index === 0;
  });

  const selectedRoute = routeOptions.find((option) => option.is_selected) || routeOptions[0] || null;

  return {
    id: movement.id,
    mode: movement.mode,
    summary: movement.summary || movement.note || "",
    start_location_id: movement.start_location_id || null,
    end_location_id: movement.end_location_id || null,
    distance_km: Number.isFinite(movement.distance_km)
      ? movement.distance_km
      : Number.isFinite(selectedRoute?.distance_km)
        ? selectedRoute.distance_km
        : null,
    duration_minutes: Number.isFinite(movement.duration_minutes)
      ? movement.duration_minutes
      : Number.isFinite(selectedRoute?.duration_minutes)
        ? selectedRoute.duration_minutes
        : null,
    route_options: routeOptions,
    route: {
      open_route_url: selectedRoute?.open_route_url || movement.route?.open_route_url || "",
      waypoints:
        (selectedRoute?.waypoints || (movement.route?.waypoints || []).map(normalizeWaypoint)).filter(
          (waypoint) =>
            waypoint.location_id &&
            waypoint.location_id !== movement.start_location_id &&
            waypoint.location_id !== movement.end_location_id
        ),
    },
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRuntimeDays(days = []) {
  return (Array.isArray(days) ? days : []).map((day, index) => {
    const baseNearbyLocations = Array.isArray(day.base?.nearby_locations)
      ? day.base.nearby_locations.filter((locationId) => typeof locationId === "string" && locationId.trim())
      : Array.isArray(day.nearby_suggestions)
        ? day.nearby_suggestions.map((suggestion) => suggestion.location_id).filter(Boolean)
        : [];

    return {
      id: day.id || `day_${index + 1}`,
      day_number: Number.isFinite(day.day_number) ? day.day_number : index + 1,
      date: day.date || "",
      note: day.note || day.summary || "",
      summary: day.summary || day.note || "",
      wake_location_id: day.wake_location_id || null,
      sleep_location_id: day.sleep_location_id || null,
      locked: Boolean(day.locked),
      base: day.base
        ? {
            anchor: ["wake", "sleep", "custom"].includes(day.base.anchor) ? day.base.anchor : "sleep",
            ...(day.base.anchor_location_id ? { anchor_location_id: day.base.anchor_location_id } : {}),
            nearby_locations: baseNearbyLocations,
          }
        : {
            anchor: "sleep",
            nearby_locations: baseNearbyLocations,
          },
      nearby_suggestions: baseNearbyLocations.map((locationId) => ({
        location_id: locationId,
        note: "",
      })),
      movements: (day.movements || []).map(normalizeMovement),
    };
  });
}

function buildStayId(locationId, index) {
  return `stay_${String(index + 1).padStart(2, "0")}_${String(locationId || "unknown")
    .replace(/^location_/, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 48)}`;
}

function deriveStaysFromDays(days = []) {
  const stays = [];
  let currentStay = null;

  days.forEach((day) => {
    const overnightLocationId = day.sleep_location_id || day.wake_location_id;
    if (!overnightLocationId) {
      return;
    }

    if (
      currentStay &&
      currentStay.overnight_location_id === overnightLocationId &&
      currentStay.status === "active"
    ) {
      currentStay.nights += 1;
      currentStay.nearby_location_ids = [
        ...new Set([
          ...(currentStay.nearby_location_ids || []),
          ...(day.nearby_suggestions || []).map((suggestion) => suggestion.location_id).filter(Boolean),
        ]),
      ];
      return;
    }

    currentStay = {
      id: buildStayId(overnightLocationId, stays.length),
      title: "",
      base_location_id: overnightLocationId,
      overnight_location_id: overnightLocationId,
      campground_location_id: null,
      start_day: day.day_number || stays.length + 1,
      start_date: day.date || "",
      nights: 1,
      status: "active",
      locked: Boolean(day.locked),
      nearby_location_ids: (day.nearby_suggestions || [])
        .map((suggestion) => suggestion.location_id)
        .filter(Boolean),
      notes: "",
    };
    stays.push(currentStay);
  });

  return stays;
}

function normalizeStay(stay, index, fallbackDayNumber = index + 1) {
  return {
    id: stay.id || buildStayId(stay.overnight_location_id || stay.base_location_id, index),
    title: stay.title || "",
    base_location_id: stay.base_location_id || stay.overnight_location_id || null,
    overnight_location_id: stay.overnight_location_id || stay.base_location_id || null,
    campground_location_id: stay.campground_location_id || null,
    start_day: Number.isFinite(stay.start_day) ? stay.start_day : fallbackDayNumber,
    start_date: stay.start_date || "",
    nights: Math.max(1, Number.isFinite(stay.nights) ? Math.round(stay.nights) : 1),
    status: ["active", "candidate", "removed"].includes(stay.status) ? stay.status : "active",
    locked: Boolean(stay.locked),
    nearby_location_ids: Array.isArray(stay.nearby_location_ids)
      ? [...new Set(stay.nearby_location_ids.filter((locationId) => typeof locationId === "string" && locationId.trim()))]
      : [],
    notes: stay.notes || "",
  };
}

function buildPlanningMetadata(days = [], stays = []) {
  const activeStays = stays.filter((stay) => stay.status !== "removed");
  return {
    total_nights: activeStays.reduce((sum, stay) => sum + (Number.isFinite(stay.nights) ? stay.nights : 0), 0),
    total_days: days.length,
    drive_days: days.filter((day) => (day.movements || []).some((movement) => movement.mode === "car")).length,
  };
}

function normalizeLocks(locks = {}) {
  return {
    days: Array.isArray(locks.days) ? locks.days : [],
    stays: Array.isArray(locks.stays) ? locks.stays : [],
  };
}

function normalizeBaseItinerary(itinerary, normalizedDays) {
  const rawBase = itinerary.base_itinerary || {};
  return {
    id: rawBase.id || `${itinerary.version_id || "v1"}_base`,
    days: normalizeRuntimeDays(rawBase.days || normalizedDays),
  };
}

function normalizeWorkingItinerary(itinerary, baseItinerary) {
  const rawWorking = itinerary.working_itinerary || {};
  const workingDays = normalizeRuntimeDays(rawWorking.days || itinerary.days || baseItinerary.days);
  const stays = Array.isArray(rawWorking.stays) && rawWorking.stays.length
    ? rawWorking.stays.map((stay, index) => normalizeStay(stay, index))
    : deriveStaysFromDays(workingDays);

  return {
    id: rawWorking.id || `${itinerary.version_id || "v1"}_working`,
    based_on_itinerary_id: rawWorking.based_on_itinerary_id || baseItinerary.id,
    stays,
    days: workingDays,
    locks: normalizeLocks(rawWorking.locks),
    metadata: {
      ...buildPlanningMetadata(workingDays, stays),
      ...(rawWorking.metadata || {}),
    },
  };
}

function normalizeItinerary(itinerary) {
  const normalizedDays = normalizeRuntimeDays(itinerary.days || []);
  const baseItinerary = normalizeBaseItinerary(itinerary, normalizedDays);
  const workingItinerary = normalizeWorkingItinerary(itinerary, baseItinerary);

  return {
    schema_version: itinerary.schema_version || "5.0.0",
    version_id: itinerary.version_id || "v1",
    locations: (itinerary.locations || []).map((location) =>
      normalizeRuntimeLocation(location, { idOverride: location.id })
    ),
    base_itinerary: baseItinerary,
    working_itinerary: workingItinerary,
    itinerary_versions: Array.isArray(itinerary.itinerary_versions) ? itinerary.itinerary_versions : [],
    days: workingItinerary.days,
  };
}

function decodeYamlValue(rawValue) {
  if (rawValue == null) {
    return "";
  }

  const value = rawValue.trim();
  if (value === "null") {
    return null;
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return value;
}

function parseRefineRequestYaml(rawYaml) {
  const lines = rawYaml.split(/\r?\n/);
  const parsed = {
    schema_version: "2.0.0",
    itinerary: {
      version_id: "v1",
      file: "itinerary.json",
    },
    decisions: [],
  };

  let currentDecision = null;
  let mode = null;
  let skipBlockScalar = false;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    if (skipBlockScalar && line.startsWith("  ")) {
      continue;
    }
    if (skipBlockScalar) {
      skipBlockScalar = false;
    }

    if (line.startsWith("schema_version:")) {
      parsed.schema_version = decodeYamlValue(line.split(":").slice(1).join(":")) || "1.0.0";
      continue;
    }

    if (line.startsWith("working_itinerary_json:") || line.startsWith("locks_json:")) {
      mode = null;
      currentDecision = null;
      skipBlockScalar = line.trim().endsWith("|");
      continue;
    }

    if (line.startsWith("base_itinerary_version:")) {
      parsed.itinerary.version_id = decodeYamlValue(line.split(":").slice(1).join(":"));
      continue;
    }

    if (line === "itinerary:") {
      mode = "itinerary";
      currentDecision = null;
      continue;
    }

    if (line === "decisions: []" || line === "location_feedback: []") {
      parsed.decisions = [];
      mode = null;
      currentDecision = null;
      continue;
    }

    if (mode === "itinerary" && line.startsWith("  ")) {
      const [key, ...rest] = line.trim().split(":");
      parsed.itinerary[key.trim()] = decodeYamlValue(rest.join(":"));
      continue;
    }

    if (line === "decisions:" || line === "location_feedback:") {
      mode = "decisions";
      currentDecision = null;
      continue;
    }

    if (mode === "decisions" && line.startsWith("  - ")) {
      currentDecision = {};
      parsed.decisions.push(currentDecision);
      const [key, ...rest] = line.slice(4).split(":");
      const normalizedKey = key.trim() === "location_id" ? "target_id" : key.trim();
      currentDecision[normalizedKey] = decodeYamlValue(rest.join(":"));
      continue;
    }

    if (mode === "decisions" && currentDecision && line.startsWith("    ")) {
      const [key, ...rest] = line.trim().split(":");
      const normalizedKey = key.trim() === "location_id" ? "target_id" : key.trim();
      currentDecision[normalizedKey] = decodeYamlValue(rest.join(":"));
      continue;
    }

    if (!line.startsWith(" ")) {
      mode = null;
      currentDecision = null;
    }
  }

  return parsed;
}

function getDefaultRefineRequest(versionId) {
  return {
    schema_version: "2.0.0",
    itinerary: {
      version_id: versionId,
      file: "itinerary.json",
    },
    decisions: [],
  };
}

function loadRefineRequest(versionDir, versionId) {
  const filePath = path.join(versionDir, "refine_request.yaml");
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      raw: null,
      parsed: getDefaultRefineRequest(versionId),
      exists: false,
    };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return {
    path: filePath,
    raw,
    parsed: parseRefineRequestYaml(raw),
    exists: true,
  };
}

function buildVersionSummary(versionId) {
  const versionDir = assertVersionDir(versionId);
  const itineraryPath = path.join(versionDir, "itinerary.json");
  const refineRequestPath = path.join(versionDir, "refine_request.yaml");

  let schemaVersion = null;
  let bundleSignals = {
    has_driving_days: false,
    has_nearby_suggestions: false,
    has_route_lines: false,
  };
  let dayCount = 0;
  let locationCount = 0;

  if (!fs.existsSync(itineraryPath)) {
    return {
      id: versionId,
      schema_version: null,
      day_count: 0,
      location_count: 0,
      bundle_signals: bundleSignals,
      has_refine_request: fs.existsSync(refineRequestPath),
    };
  }

  try {
    const itinerary = normalizeItinerary(readJsonFile(itineraryPath));
    schemaVersion = itinerary.schema_version || null;
    dayCount = itinerary.days?.length || 0;
    locationCount = itinerary.locations?.length || 0;
    bundleSignals.has_driving_days = itinerary.days?.some((day) =>
      (day.movements || []).some((movement) => movement.mode === "car")
    ) || false;
    bundleSignals.has_nearby_suggestions = itinerary.days?.some(
      (day) => (day.nearby_suggestions || []).length > 0
    ) || false;
    bundleSignals.has_route_lines = false;
  } catch (error) {
    bundleSignals = {
      has_driving_days: false,
      has_nearby_suggestions: false,
      has_route_lines: false,
    };
  }

  return {
    id: versionId,
    schema_version: schemaVersion,
    day_count: dayCount,
    location_count: locationCount,
    bundle_signals: bundleSignals,
    has_refine_request: fs.existsSync(refineRequestPath),
  };
}

function loadVersionBundle(versionId) {
  const versionDir = assertVersionDir(versionId);
  const refineRequest = loadRefineRequest(versionDir, versionId);
  const itineraryPath = path.join(versionDir, "itinerary.json");
  if (!fs.existsSync(itineraryPath)) {
    throw new Error(`Could not load itinerary.json for ${versionId}.`);
  }
  const itinerary = normalizeItinerary(readJsonFile(itineraryPath));
  itinerary.locations = mergeLocationCollections(itinerary.locations, loadCuratedLocations());

  return {
    version_id: versionId,
    version_dir: path.relative(ROOT_DIR, versionDir),
    itinerary,
    refine_request: refineRequest,
  };
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleApiRequest(request, response) {
  const pathname = decodeURIComponent((request.url || "").split("?")[0]);

  if (request.method === "GET" && pathname === "/api/runtime-config") {
    sendJson(response, 200, {
      google_maps_api_key: GOOGLE_MAPS_API_KEY || null,
    });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/versions") {
    const versions = listVersions().map(buildVersionSummary);
    sendJson(response, 200, {
      versions,
      default_version_id: versions.length ? versions[versions.length - 1].id : null,
    });
    return true;
  }

  const bundleMatch = pathname.match(/^\/api\/versions\/([^/]+)$/);
  if (request.method === "GET" && bundleMatch) {
    try {
      const bundle = loadVersionBundle(bundleMatch[1]);
      sendJson(response, 200, bundle);
    } catch (error) {
      sendJson(response, 404, { error: `Could not load itinerary version ${bundleMatch[1]}.` });
    }
    return true;
  }

  const saveMatch = pathname.match(/^\/api\/versions\/([^/]+)\/refine-request$/);
  if (request.method === "PUT" && saveMatch) {
    sendJson(response, 410, { error: "Refine requests are exported by the browser and are no longer saved to itinerary files." });
    return true;
  }

  const workingMatch = pathname.match(/^\/api\/versions\/([^/]+)\/working-itinerary$/);
  if (request.method === "PUT" && workingMatch) {
    sendJson(response, 410, { error: "Working itinerary edits are stored in browser local storage and are no longer written to itinerary files." });
    return true;
  }

  return false;
}

function handleStaticRequest(request, response) {
  const requestPath = resolveStaticRequestPath(request.url);
  const absolutePath = path.resolve(ROOT_DIR, `.${requestPath}`);

  if (!absolutePath.startsWith(ROOT_DIR)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.stat(absolutePath, (statError, stats) => {
    if (statError) {
      send(response, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }

    const filePath = stats.isDirectory() ? path.join(absolutePath, "index.html") : absolutePath;
    fs.readFile(filePath, (readError, contents) => {
      if (readError) {
        send(response, 404, "Not found", "text/plain; charset=utf-8");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      send(response, 200, contents, mimeType);
    });
  });
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const handled = await handleApiRequest(request, response);
      if (!handled) {
        handleStaticRequest(request, response);
      }
    } catch (error) {
      sendJson(response, 500, { error: error.message || "Unexpected server error." });
    }
  });
}

function startServer() {
  const server = createServer();
  server.on("error", (error) => {
    if (error.code === "EPERM" || error.code === "EACCES") {
      console.error(`Could not bind to http://${HOST}:${PORT}/app-review-itinerary/ in this environment.`);
      console.error("Try running the server directly on your machine instead of inside the sandbox.");
      process.exit(1);
    }
    throw error;
  });

  server.listen(PORT, HOST, () => {
    const versions = listVersions();
    console.log(`Review app server running at http://${HOST}:${PORT}/app-review-itinerary/`);
    console.log(
      versions.length
        ? `Detected itinerary versions: ${versions.join(", ")}`
        : "No itinerary versions found yet in itinerary/versions/."
    );
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  ROOT_DIR,
  ITINERARY_VERSIONS_DIR,
  createServer,
  startServer,
  listVersions,
  loadVersionBundle,
  parseRefineRequestYaml,
};
