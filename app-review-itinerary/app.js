if (typeof document === "undefined") {
  console.error(
    [
      "This file is meant to run in a browser, not directly with `node app.js`.",
      "",
      "Use this instead from app-review-itinerary/:",
      "  node server.js",
      "",
      "Then open: http://localhost:8000/app-review-itinerary/",
    ].join("\n")
  );
  process.exit(1);
}

const state = {
  versions: [],
  activeVersionId: null,
  bundle: null,
  itinerary: null,
  runtimeConfig: {
    googleMapsApiKey: "",
  },
  activeView: "schedule",
  placesById: new Map(),
  nodesById: new Map(),
  edgesById: new Map(),
  usedPlaceIds: [],
  selectedDayId: null,
  selectedDayDetailMode: "stay",
  selectedPlaceId: null,
  selectedMovementId: null,
  decisions: new Map(),
  itineraryVersions: [],
  selectedPlanningVersionId: "",
  saveTimer: null,
  isHydrating: false,
  map: null,
  mapLayers: {
    markers: [],
    polylines: [],
    markerByPlaceId: new Map(),
  },
  routeBounds: null,
  pendingMapOverview: true,
  renderedMapDayId: null,
  mapFocus: "overview",
  activeTooltipPlaceId: null,
  activeRefineNotePlaceId: null,
  googleRoutes: {
    status: "idle",
    loadPromise: null,
    requestPromises: new Map(),
    memoryCache: new Map(),
    warningShown: false,
    refreshTimer: null,
    lastResolvedSource: "",
  },
  routeSelections: new Map(),
  preserveTooltipOnNextMapMotion: false,
  tooltipSyncTimer: null,
  locationsExplorer: {
    enabled: false,
    searchDraft: "",
    searchQuery: "",
    taxonomyFilter: "all",
    searchTimer: null,
  },
};

const elements = {
  appShell: document.querySelector(".app-shell"),
  versionSelect: document.querySelector("#version-select"),
  reloadVersionButton: document.querySelector("#reload-version-button"),
  saveStatusPill: document.querySelector("#save-status-pill"),
  routeStatusPill: document.querySelector("#route-status-pill"),
  routeStatusIndicator: document.querySelector("#route-status-indicator"),
  statusBanner: document.querySelector("#status-banner"),
  locationOverlayToolbar: document.querySelector("#location-overlay-toolbar"),
  exportRefineRequestButton: document.querySelector("#export-refine-request-button"),
  scheduleView: document.querySelector("#schedule-view"),
  mapView: document.querySelector("#map-view"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
};

const ACCOMMODATION_FEATURE_META = {
  van: { icon: "🚐", label: "Van" },
  pool: { icon: "🏊", label: "Pool" },
  playground: { icon: "🛝", label: "Playground" },
  ev_charging: { icon: "⚡", label: "EV charging" },
  bike_rental: { icon: "🚲", label: "Bike rental" },
  laundry: { icon: "🧺", label: "Laundry" },
};

const CAMPGROUND_STYLE_LABELS = {
  tent: "Tent",
  campervan: "Campervan",
  motorhome: "Motorhome",
  caravan: "Caravan",
  glamping: "Glamping",
};

const CAMPGROUND_STYLE_META = {
  tent: { icon: "⛺", label: "Tent" },
  campervan: { icon: "🚐", label: "Campervan" },
  motorhome: { icon: "🚎", label: "Motorhome" },
  caravan: { icon: "🛻", label: "Caravan" },
  glamping: { icon: "✨", label: "Glamping" },
};

const CAMPGROUND_SHADE_LABELS = {
  none: "No shade",
  partial: "Partial shade",
  good: "Good shade",
  unknown: "Shade unknown",
};

const CAMPGROUND_SURFACE_LABELS = {
  soft_pitch: "Soft pitch",
  hard_pitch: "Hard pitch",
  mixed: "Mixed surface",
  unknown: "Surface unknown",
};

const CAMPGROUND_AMENITY_LABELS = {
  playground: "Playground",
  pool: "Pool",
  laundry: "Laundry",
  bike_rental: "Bike rental",
  wifi: "Wifi",
  camp_store: "Camp store",
  restaurant: "Restaurant",
  ev_charging: "EV charging",
};

const CAMPGROUND_AMENITY_META = {
  playground: { icon: "🛝", label: "Playground" },
  pool: { icon: "🏊", label: "Pool" },
  laundry: { icon: "🧺", label: "Laundry" },
  bike_rental: { icon: "🚲", label: "Bike rental" },
  wifi: { icon: "📶", label: "Wifi" },
  camp_store: { icon: "🛒", label: "Camp store" },
  restaurant: { icon: "🍽️", label: "Restaurant" },
  ev_charging: { icon: "⚡", label: "EV charging" },
};

const CAMPGROUND_SANITARY_META = {
  hot_showers: { icon: "🚿", label: "Hot showers" },
  clean_toilets: { icon: "🚻", label: "Clean toilets" },
};

const EDITORIAL_PRIORITY_META = {
  unmissable: { icon: "⭐", label: "Unmissable" },
  worth_a_stop: { icon: "📍", label: "Worth a stop" },
  hidden_gem: { icon: "💎", label: "Hidden gem" },
  anchor: { icon: "📌", label: "Anchor" },
  practical: { icon: "🧰", label: "Practical" },
  optional: { icon: "○", label: "Optional" },
};

const LOCATION_TAXONOMY = [
  { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  { id: "hotel", label: "Hotel", icon: "🛏️" },
  { id: "campground", label: "Campground", icon: "⛺" },
  { id: "charger", label: "Charger", icon: "⚡" },
  { id: "groceries", label: "Groceries", icon: "🧺" },
  { id: "beach", label: "Beach", icon: "🏖️" },
  { id: "things_to_do", label: "Things to do", icon: "📷" },
  { id: "park", label: "Park", icon: "🌳" },
];

const REFINE_REACTION_OPTIONS = [
  { vote: "love", icon: "❤️", label: "Love" },
  { vote: "upvote", icon: "👍", label: "Upvote" },
  { vote: "downvote", icon: "👎", label: "Downvote" },
  { vote: "remove", icon: "🚫", label: "Remove" },
];

const GOOGLE_ROUTE_CACHE_PREFIX = "road-trip-google-route:v1:";
const ROUTE_SELECTION_STORAGE_PREFIX = "road-trip-route-selection:v1:";
const PLANNING_DRAFT_STORAGE_PREFIX = "road-trip-planning-draft:v1:";

initialize().catch((error) => {
  setStatus(error.message || "Could not initialize the review app.", "danger");
});

async function initialize() {
  initializeMap();
  bindUi();
  await loadRuntimeConfig();
  syncRouteStatusIndicator();
  await loadVersions();
}

async function loadRuntimeConfig() {
  try {
    const payload = await fetchJson("/api/runtime-config");
    state.runtimeConfig.googleMapsApiKey = String(payload.google_maps_api_key || "").trim();
  } catch (error) {
    state.runtimeConfig.googleMapsApiKey = "";
  }
  syncRouteStatusIndicator();
}

function bindUi() {
  elements.versionSelect.addEventListener("change", async (event) => {
    const versionId = event.target.value;
    if (versionId) {
      await loadVersion(versionId);
    }
  });

  elements.reloadVersionButton.addEventListener("click", async () => {
    resetWorkingItineraryFromBase();
  });

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view, { rerender: true }));
  });

  elements.exportRefineRequestButton?.addEventListener("click", () => {
    downloadRefineRequestYaml();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("[data-close-place-tooltip]")) {
      return;
    }
    event.preventDefault();
    closeSelectedPlaceTooltip();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const reactionButton = event.target.closest("[data-refine-vote]");
    if (!reactionButton) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const placeId = reactionButton.getAttribute("data-refine-place-id");
    const vote = reactionButton.getAttribute("data-refine-vote");
    if (!placeId || !vote) {
      return;
    }
    applyVoteForPlace(placeId, vote);
  });

  document.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLTextAreaElement) || !event.target.matches("[data-refine-note]")) {
      return;
    }
    const placeId = event.target.getAttribute("data-refine-place-id");
    if (!placeId) {
      return;
    }
    updateDecisionReasonForPlace(placeId, event.target.value);
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const noteToggle = event.target.closest("[data-refine-note-toggle]");
    if (!noteToggle) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const placeId = noteToggle.getAttribute("data-refine-place-id");
    if (!placeId) {
      return;
    }
    toggleRefineNote(placeId);
  });
}

function initializeMap() {
  if (!window.L) {
    setStatus("Leaflet did not load, so the map view is unavailable.", "warning");
    return;
  }

  state.map = L.map("leaflet-map", {
    zoomControl: false,
    preferCanvas: true,
  }).setView([46.5, 6.5], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);

  L.control.zoom({ position: "bottomleft" }).addTo(state.map);

  state.map.on("dragstart", () => {
    if (state.preserveTooltipOnNextMapMotion) {
      closeSelectedPlaceTooltip({ clearSelection: false });
      return;
    }
    closeSelectedPlaceTooltip();
  });
  state.map.on("zoomstart", () => {
    if (state.preserveTooltipOnNextMapMotion) {
      closeSelectedPlaceTooltip({ clearSelection: false });
      return;
    }
    closeSelectedPlaceTooltip();
  });
  state.map.on("moveend zoomend", () => {
    if (!state.preserveTooltipOnNextMapMotion) {
      return;
    }
    state.preserveTooltipOnNextMapMotion = false;
    clearTimeout(state.tooltipSyncTimer);
    state.tooltipSyncTimer = null;
    syncSelectedPlaceTooltip();
  });
}

function hasGoogleMapsRuntimeRouting() {
  return Boolean(state.runtimeConfig.googleMapsApiKey);
}

function syncRouteStatusIndicator() {
  if (!elements.routeStatusPill || !elements.routeStatusIndicator) {
    return;
  }

  let label = "Idle";
  let tone = "neutral";
  let spinning = false;

  if (!hasGoogleMapsRuntimeRouting()) {
    label = "No key";
    tone = "warning";
  } else if (state.googleRoutes.status === "error") {
    label = "Failed";
    tone = "danger";
  } else if (state.googleRoutes.requestPromises.size > 0) {
    label = "Fetching";
    tone = "active";
    spinning = true;
  } else if (state.googleRoutes.status === "loading") {
    label = "Loading";
    tone = "active";
    spinning = true;
  } else if (state.googleRoutes.lastResolvedSource === "cache") {
    label = "Cached";
    tone = "success";
  } else if (state.googleRoutes.lastResolvedSource === "google") {
    label = "Ready";
    tone = "success";
  } else if (state.googleRoutes.status === "ready") {
    label = "Ready";
    tone = "success";
  }

  elements.routeStatusPill.textContent = label;
  elements.routeStatusPill.parentElement?.setAttribute("data-route-tone", tone);
  elements.routeStatusIndicator.classList.toggle("is-spinning", spinning);
}

function showGoogleRoutesUnavailableWarning() {
  if (state.googleRoutes.warningShown || hasGoogleMapsRuntimeRouting()) {
    return;
  }
  state.googleRoutes.warningShown = true;
  setStatus(
    "Drive routes need a Google Maps API key when itinerary polylines are not stored in the JSON.",
    "warning"
  );
}

function buildRouteCacheKey(movement, option, waypoints = []) {
  const style = option?.style || "route";
  const waypointIds = (waypoints || []).map((waypoint) => waypoint?.location_id).filter(Boolean).join(">");
  return [
    state.activeVersionId || "v1",
    movement?.id || "movement",
    style,
    movement?.start_location_id || "",
    movement?.end_location_id || "",
    waypointIds,
  ].join("|");
}

function getRouteCacheStorageKey(cacheKey) {
  return `${GOOGLE_ROUTE_CACHE_PREFIX}${cacheKey}`;
}

function getRouteSelectionStorageKey(versionId = state.activeVersionId || "v1") {
  return `${ROUTE_SELECTION_STORAGE_PREFIX}${versionId}`;
}

function getPlanningDraftStorageKey(versionId = state.activeVersionId || "v1") {
  return `${PLANNING_DRAFT_STORAGE_PREFIX}${versionId}`;
}

function readSavedRouteSelections(versionId = state.activeVersionId || "v1") {
  try {
    const raw = window.localStorage?.getItem(getRouteSelectionStorageKey(versionId));
    if (!raw) {
      return new Map();
    }
    const parsed = JSON.parse(raw);
    const entries = Object.entries(parsed || {}).filter(
      ([movementId, style]) => movementId && typeof style === "string" && style.trim()
    );
    return new Map(entries);
  } catch (error) {
    return new Map();
  }
}

function writeSavedRouteSelections(versionId = state.activeVersionId || "v1") {
  const payload = Object.fromEntries(
    Array.from(state.routeSelections.entries()).filter(
      ([movementId, style]) => movementId && typeof style === "string" && style.trim()
    )
  );

  try {
    window.localStorage?.setItem(getRouteSelectionStorageKey(versionId), JSON.stringify(payload));
  } catch (error) {
    // Ignore storage quota/localStorage availability failures.
  }
}

function readPlanningDraft(versionId = state.activeVersionId || "v1") {
  try {
    const raw = window.localStorage?.getItem(getPlanningDraftStorageKey(versionId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writePlanningDraft(versionId = state.activeVersionId || "v1") {
  const payload = {
    saved_at: new Date().toISOString(),
    working_itinerary: serializeWorkingItineraryForLocalDraft(),
    itinerary_versions: state.itineraryVersions || [],
    location_feedback: getOrderedDecisions().map((decision) => ({
      location_id: decision.target_id,
      vote: formatDecisionVoteForExport(decision.vote),
      note: normalizeOptionalText(decision.note),
    })),
  };

  try {
    const storageKey = getPlanningDraftStorageKey(versionId);
    window.localStorage?.removeItem(storageKey);
    window.localStorage?.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch (error) {
    try {
      pruneGoogleRouteCacheFromStorage();
      const storageKey = getPlanningDraftStorageKey(versionId);
      window.localStorage?.removeItem(storageKey);
      window.localStorage?.setItem(storageKey, JSON.stringify(payload));
      return true;
    } catch (retryError) {
      return false;
    }
  }
}

function pruneGoogleRouteCacheFromStorage() {
  try {
    const storage = window.localStorage;
    if (!storage) {
      return;
    }
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(GOOGLE_ROUTE_CACHE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => storage.removeItem(key));
    state.googleRoutes.memoryCache.clear();
  } catch (error) {
    // Ignore storage availability failures; the caller handles retry failure.
  }
}

function clearPlanningDraft(versionId = state.activeVersionId || "v1") {
  try {
    window.localStorage?.removeItem(getPlanningDraftStorageKey(versionId));
  } catch (error) {
    // Ignore localStorage availability failures.
  }
}

function pickDefaultRouteOptionStyle(movement) {
  const options = Array.isArray(movement?.route_options) ? movement.route_options : [];
  if (!options.length) {
    return "";
  }

  const savedStyle = state.routeSelections.get(movement.id);
  if (savedStyle && options.some((option) => option.style === savedStyle)) {
    return savedStyle;
  }

  if (options.some((option) => option.style === "fast")) {
    return "fast";
  }

  const explicitlySelected = options.find((option) => option.is_selected)?.style;
  if (explicitlySelected) {
    return explicitlySelected;
  }

  return options[0]?.style || "";
}

function applyRouteOptionSelection(movement, style, { persist = false } = {}) {
  if (!movement || !Array.isArray(movement.route_options) || !movement.route_options.length) {
    return false;
  }

  const nextStyle = style && movement.route_options.some((option) => option.style === style)
    ? style
    : pickDefaultRouteOptionStyle(movement);

  if (!nextStyle) {
    return false;
  }

  let didChange = false;
  movement.route_options.forEach((option) => {
    const nextSelected = option.style === nextStyle;
    if (option.is_selected !== nextSelected) {
      didChange = true;
    }
    option.is_selected = nextSelected;
  });

  const selectedOption = movement.route_options.find((option) => option.is_selected) || null;
  if (selectedOption?.open_route_url) {
    movement.route.open_route_url = selectedOption.open_route_url;
  }

  if (persist && selectedOption?.style) {
    state.routeSelections.set(movement.id, selectedOption.style);
    writeSavedRouteSelections();
  }

  return didChange;
}

function readRouteCacheEntry(cacheKey) {
  if (!cacheKey) {
    return null;
  }

  if (state.googleRoutes.memoryCache.has(cacheKey)) {
    return state.googleRoutes.memoryCache.get(cacheKey) || null;
  }

  try {
    const raw = window.localStorage?.getItem(getRouteCacheStorageKey(cacheKey));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    const line = Array.isArray(parsed?.line)
      ? parsed.line.filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
      : [];
    if (line.length < 2) {
      return null;
    }
    const entry = {
      line,
      distance_km: Number.isFinite(parsed?.distance_km) ? parsed.distance_km : null,
      duration_minutes: Number.isFinite(parsed?.duration_minutes) ? parsed.duration_minutes : null,
    };
    state.googleRoutes.memoryCache.set(cacheKey, entry);
    state.googleRoutes.lastResolvedSource = "cache";
    syncRouteStatusIndicator();
    return entry;
  } catch (error) {
    return null;
  }
}

function writeRouteCacheEntry(cacheKey, entry) {
  const line = Array.isArray(entry?.line)
    ? entry.line.filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
    : [];
  if (!cacheKey || line.length < 2) {
    return;
  }

  const payload = {
    line,
    distance_km: Number.isFinite(entry?.distance_km) ? entry.distance_km : null,
    duration_minutes: Number.isFinite(entry?.duration_minutes) ? entry.duration_minutes : null,
    saved_at: new Date().toISOString(),
  };

  state.googleRoutes.memoryCache.set(cacheKey, payload);
  state.googleRoutes.lastResolvedSource = "google";
  state.googleRoutes.status = "ready";
  syncRouteStatusIndicator();

  try {
    window.localStorage?.setItem(getRouteCacheStorageKey(cacheKey), JSON.stringify(payload));
  } catch (error) {
    // Ignore storage quota/localStorage availability failures and keep the in-memory cache.
  }
}

function scheduleGoogleRouteRefresh() {
  clearTimeout(state.googleRoutes.refreshTimer);
  state.googleRoutes.refreshTimer = setTimeout(() => {
    renderSchedule();
    renderMap();
  }, 40);
  syncRouteStatusIndicator();
}

function parseGoogleMapsQueryValue(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const query = parsed.searchParams.get("query");
    if (query) {
      return query.replace(/\+/g, " ");
    }
    const origin = parsed.searchParams.get("origin");
    const destination = parsed.searchParams.get("destination");
    if (origin && destination) {
      return "";
    }
  } catch (error) {
    return "";
  }

  return "";
}

function buildGoogleRouteLocationInput(locationId) {
  const location = getItineraryLocation(locationId);
  const place = state.placesById.get(locationId);
  const lat = location?.coordinates?.lat;
  const lng = location?.coordinates?.lng;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat: lat, lng: lng };
  }

  const fromMapsQuery = parseGoogleMapsQueryValue(location?.google_maps_url || place?.googleMapsUrl || "");
  if (fromMapsQuery) {
    return fromMapsQuery;
  }

  const fallbackText = [
    location?.name || place?.name || "",
    location?.address || place?.address || "",
    location?.region || place?.region || "",
    location?.country || place?.country || "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

  return fallbackText || null;
}

function toGoogleWaypointInput(locationInput) {
  if (!locationInput) {
    return null;
  }

  if (typeof locationInput === "string") {
    return { location: locationInput };
  }

  if (Number.isFinite(locationInput.lat) && Number.isFinite(locationInput.lng)) {
    return {
      location: new google.maps.LatLng(locationInput.lat, locationInput.lng),
    };
  }

  return null;
}

function decodeGoogleRoutePath(path) {
  if (!Array.isArray(path)) {
    return [];
  }

  return path
    .map((point) => {
      const lat =
        typeof point?.lat === "function" ? point.lat() : Number.isFinite(point?.lat) ? point.lat : null;
      const lng =
        typeof point?.lng === "function" ? point.lng() : Number.isFinite(point?.lng) ? point.lng : null;
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })
    .filter(Boolean);
}

async function loadGoogleMapsRoutesApi() {
  if (!hasGoogleMapsRuntimeRouting()) {
    return null;
  }

  if (window.google?.maps?.importLibrary) {
    state.googleRoutes.status = "ready";
    syncRouteStatusIndicator();
    return window.google.maps;
  }

  if (state.googleRoutes.loadPromise) {
    return state.googleRoutes.loadPromise;
  }

  state.googleRoutes.status = "loading";
  syncRouteStatusIndicator();
  state.googleRoutes.loadPromise = new Promise((resolve, reject) => {
    const callbackName = "__roadTripGoogleMapsInit";
    window[callbackName] = () => {
      delete window[callbackName];
      state.googleRoutes.status = "ready";
      syncRouteStatusIndicator();
      resolve(window.google.maps);
    };

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(state.runtimeConfig.googleMapsApiKey) +
      "&v=weekly&loading=async&callback=" +
      callbackName;
    script.async = true;
    script.onerror = () => {
      delete window[callbackName];
      state.googleRoutes.status = "error";
      syncRouteStatusIndicator();
      reject(new Error("Could not load Google Maps JavaScript API."));
    };
    document.head.appendChild(script);
  });

  return state.googleRoutes.loadPromise;
}

async function computeGoogleRouteLine(movement, option, waypoints = []) {
  const maps = await loadGoogleMapsRoutesApi();
  if (!maps?.importLibrary) {
    return [];
  }

  const { Route } = await maps.importLibrary("routes");

  const originInput = buildGoogleRouteLocationInput(movement?.start_location_id);
  const destinationInput = buildGoogleRouteLocationInput(movement?.end_location_id);
  const origin =
    typeof originInput === "string"
      ? originInput
      : Number.isFinite(originInput?.lat) && Number.isFinite(originInput?.lng)
        ? { lat: originInput.lat, lng: originInput.lng }
        : null;
  const destination =
    typeof destinationInput === "string"
      ? destinationInput
      : Number.isFinite(destinationInput?.lat) && Number.isFinite(destinationInput?.lng)
        ? { lat: destinationInput.lat, lng: destinationInput.lng }
        : null;
  const intermediates = (waypoints || [])
    .map((waypoint) => toGoogleWaypointInput(buildGoogleRouteLocationInput(waypoint?.location_id)))
    .filter(Boolean);

  if (!origin || !destination) {
    return [];
  }

  const request = {
    origin,
    destination,
    intermediates,
    travelMode: "DRIVING",
    fields: ["path", "distanceMeters", "durationMillis"],
  };

  const { routes = [] } = await Route.computeRoutes(request);
  const primaryRoute = routes[0];
  const distanceKm = Number.isFinite(primaryRoute?.distanceMeters)
    ? primaryRoute.distanceMeters / 1000
    : null;
  const durationMinutes = Number.isFinite(primaryRoute?.durationMillis)
    ? Math.round(primaryRoute.durationMillis / 60000)
    : null;
  return {
    line: decodeGoogleRoutePath(primaryRoute?.path),
    distance_km: distanceKm,
    duration_minutes: durationMinutes,
  };
}

function ensureGoogleRouteForOption(movement, option, waypoints = []) {
  const cacheKey = buildRouteCacheKey(movement, option, waypoints);
  const cachedEntry = readRouteCacheEntry(cacheKey);
  if (cachedEntry?.line?.length >= 2) {
    applyGoogleRouteMetrics(movement, option, cachedEntry);
    return cachedEntry.line;
  }

  if (!hasGoogleMapsRuntimeRouting()) {
    showGoogleRoutesUnavailableWarning();
    syncRouteStatusIndicator();
    return [];
  }

  if (state.googleRoutes.requestPromises.has(cacheKey)) {
    syncRouteStatusIndicator();
    return [];
  }

  const requestPromise = computeGoogleRouteLine(movement, option, waypoints)
    .then((entry) => {
      if (entry?.line?.length >= 2) {
        applyGoogleRouteMetrics(movement, option, entry);
        writeRouteCacheEntry(cacheKey, entry);
        scheduleGoogleRouteRefresh();
      }
    })
    .catch((error) => {
      state.googleRoutes.status = "error";
      syncRouteStatusIndicator();
      setStatus(error.message || "Could not fetch Google Maps route geometry.", "warning");
    })
    .finally(() => {
      state.googleRoutes.requestPromises.delete(cacheKey);
      syncRouteStatusIndicator();
    });

  state.googleRoutes.requestPromises.set(cacheKey, requestPromise);
  syncRouteStatusIndicator();
  return [];
}

function applyGoogleRouteMetrics(movement, option, entry) {
  if (!movement || !option || !entry) {
    return;
  }

  if (Number.isFinite(entry.distance_km)) {
    option.distance_km = Math.round(entry.distance_km * 10) / 10;
    if (option.is_selected) {
      movement.distance_km = option.distance_km;
    }
  }

  if (Number.isFinite(entry.duration_minutes)) {
    option.duration_minutes = Math.round(entry.duration_minutes);
    if (option.is_selected) {
      movement.duration_minutes = option.duration_minutes;
    }
  }
}

function resolveSelectedRouteOption(edge) {
  if (!edge || !Array.isArray(edge.route_options) || !edge.selected_option_id) {
    return null;
  }
  return edge.route_options.find((option) => option.id === edge.selected_option_id) || null;
}

function toLeafletCoordinatesFromLineString(geometry) {
  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const coordinates = geometry.coordinates
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) {
        return null;
      }

      const longitude = Number(coordinate[0]);
      const latitude = Number(coordinate[1]);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return [latitude, longitude];
    })
    .filter(Boolean);

  return coordinates.length >= 2 ? coordinates : null;
}

function resolveEdgeMapCoordinates(edge, fromPlace, toPlace) {
  const selectedOption = resolveSelectedRouteOption(edge);
  const selectedGeometry = toLeafletCoordinatesFromLineString(selectedOption?.geometry);
  if (selectedGeometry) {
    return selectedGeometry;
  }

  const edgeGeometry = toLeafletCoordinatesFromLineString(edge?.geometry);
  if (edgeGeometry) {
    return edgeGeometry;
  }

  if (
    !fromPlace ||
    !toPlace ||
    fromPlace.latitude === null ||
    toPlace.latitude === null ||
    fromPlace.longitude === null ||
    toPlace.longitude === null
  ) {
    return null;
  }

  return [
    [fromPlace.latitude, fromPlace.longitude],
    [toPlace.latitude, toPlace.longitude],
  ];
}

async function loadVersions() {
  setStatus("Loading itinerary versions from the workspace…", "neutral");
  const payload = await fetchJson("/api/versions");
  state.versions = payload.versions || [];

  renderVersionOptions();

  if (!state.versions.length) {
    elements.saveStatusPill.textContent = "No versions";
    setStatus("No itinerary versions were found in itinerary/versions/.", "warning");
    renderAll();
    return;
  }

  const defaultVersionId = payload.default_version_id || state.versions[state.versions.length - 1].id;
  await loadVersion(defaultVersionId);
}

async function loadVersion(versionId) {
  state.isHydrating = true;
  state.pendingMapOverview = true;
  state.renderedMapDayId = null;
  state.mapFocus = "overview";
  state.activeTooltipPlaceId = null;
  state.googleRoutes.lastResolvedSource = "";
  if (state.googleRoutes.status !== "error") {
    state.googleRoutes.status = "idle";
  }
  syncRouteStatusIndicator();
  setStatus(`Loading itinerary ${versionId}…`, "neutral");
  setSaveStatus("Loading");

  const bundle = await fetchJson(`/api/versions/${encodeURIComponent(versionId)}`);
  state.activeVersionId = bundle.version_id;
  state.routeSelections = readSavedRouteSelections(bundle.version_id);
  state.bundle = bundle;

  hydrateBundle();
  renderVersionOptions();
  renderAll();

  setSaveStatus(readPlanningDraft(bundle.version_id) ? "Saved locally" : "No local edits");
  setStatus(`Loaded itinerary ${versionId}.`, "success");
  state.isHydrating = false;
}

function hydrateBundle() {
  state.itinerary = state.bundle?.itinerary || null;
  ensurePlanningDocument();
  hydrateLocalPlanningDraft();
  state.selectedPlanningVersionId =
    state.itineraryVersions[state.itineraryVersions.length - 1]?.id || "";
  state.placesById = buildPlacesById(state.itinerary?.locations || []);
  state.nodesById = new Map();
  state.edgesById = new Map();
  state.usedPlaceIds = buildUsedPlaceIds();
  const days = state.itinerary?.days || [];

  days.forEach((day) => {
    (day.movements || [])
      .filter((movement) => movement.mode === "car")
      .forEach((movement) => {
        applyRouteOptionSelection(movement, pickDefaultRouteOptionStyle(movement));
      });
  });

  hydrateRefineRequest(state.bundle.refine_request?.parsed);
  hydrateLocalFeedback();

  if (!state.selectedDayId || !days.some((day) => day.id === state.selectedDayId)) {
    state.selectedDayId = days[0]?.id || null;
  }

  if (!state.selectedPlaceId || !state.placesById.has(state.selectedPlaceId)) {
    state.selectedPlaceId = state.usedPlaceIds[0] || null;
  }
  if (!movementExistsInDay(getSelectedItineraryDay(), state.selectedMovementId)) {
    state.selectedMovementId = null;
  }
  syncDayDetailMode(getSelectedItineraryDay(), { forceDefault: true });

  syncSelectedPlaceForDay(getSelectedItineraryDay(), {
    force: Boolean(state.itinerary?.days?.length),
  });

  if (!state.itinerary?.days?.length) {
    state.mapFocus = "overview";
  }
  state.activeTooltipPlaceId = null;
}

function hydrateLocalPlanningDraft() {
  state.itineraryVersions = Array.isArray(state.itinerary?.itinerary_versions)
    ? state.itinerary.itinerary_versions
    : [];

  const draft = readPlanningDraft(state.activeVersionId);
  if (!draft?.working_itinerary || !state.itinerary) {
    return;
  }

  const existingWorking = state.itinerary.working_itinerary || {};
  state.itinerary.working_itinerary = {
    ...existingWorking,
    id: draft.working_itinerary.id || existingWorking.id,
    based_on_itinerary_id: draft.working_itinerary.based_on_itinerary_id || existingWorking.based_on_itinerary_id,
    stays: Array.isArray(draft.working_itinerary.stays)
      ? clonePlainObject(draft.working_itinerary.stays)
      : clonePlainObject(existingWorking.stays || []),
    days: clonePlainObject(existingWorking.days || state.itinerary.days || []),
    locks: draft.working_itinerary.locks || { days: [], stays: [] },
    metadata: draft.working_itinerary.metadata || {},
  };
  state.itineraryVersions = Array.isArray(draft.itinerary_versions)
    ? draft.itinerary_versions
    : state.itineraryVersions;
  recalculateWorkingItinerary({ preserveSelectedDay: false });
}

function hydrateLocalFeedback() {
  const draft = readPlanningDraft(state.activeVersionId);
  if (!Array.isArray(draft?.location_feedback)) {
    return;
  }

  draft.location_feedback.forEach((feedback) => {
    const locationId = feedback.location_id || feedback.target_id;
    const place = state.placesById.get(locationId);
    if (!place) {
      return;
    }
    state.decisions.set(locationId, {
      target_type: "place",
      target_id: locationId,
      target_label: place.name,
      vote: normalizeDecisionVote(feedback.vote),
      note: feedback.note || "",
      applies_from_version: state.activeVersionId,
      created_at: new Date().toISOString(),
      created_by: "ui",
    });
  });
}

function ensurePlanningDocument() {
  if (!state.itinerary) {
    return;
  }

  const baseDays = Array.isArray(state.itinerary.base_itinerary?.days) && state.itinerary.base_itinerary.days.length
    ? clonePlainObject(state.itinerary.base_itinerary.days)
    : clonePlainObject(state.itinerary.days || []);

  if (!state.itinerary.base_itinerary) {
    state.itinerary.base_itinerary = {
      id: `${state.itinerary.version_id || state.activeVersionId || "v1"}_base`,
      days: baseDays,
    };
  }

  if (!state.itinerary.working_itinerary) {
    state.itinerary.working_itinerary = {
      id: `${state.itinerary.version_id || state.activeVersionId || "v1"}_working`,
      based_on_itinerary_id: state.itinerary.base_itinerary.id,
      stays: deriveWorkingStaysFromDays(state.itinerary.days || baseDays),
      days: clonePlainObject(state.itinerary.days || baseDays),
      locks: { days: [], stays: [] },
      metadata: {},
    };
  }

  const working = state.itinerary.working_itinerary;
  if (!Array.isArray(working.stays) || !working.stays.length) {
    working.stays = deriveWorkingStaysFromDays(working.days || baseDays);
  }
  if (!Array.isArray(working.days) || !working.days.length) {
    working.days = clonePlainObject(baseDays);
  }
  working.locks = working.locks || { days: [], stays: [] };
  working.locks.days = Array.isArray(working.locks.days) ? working.locks.days : [];
  working.locks.stays = Array.isArray(working.locks.stays) ? working.locks.stays : [];
  recalculateWorkingItinerary({ preserveSelectedDay: false });
}

function hydrateRefineRequest(refineRequest) {
  const parsed = refineRequest || {
    schema_version: "1.0.0",
    itinerary: {
      version_id: state.activeVersionId,
      file: "itinerary.json",
    },
    decisions: [],
  };

  state.decisions = new Map();
  parsed.decisions.forEach((decision) => {
    const place = state.placesById.get(decision.target_id);
    if (!place) {
      return;
    }
    state.decisions.set(decision.target_id, {
      target_type: "place",
      target_id: decision.target_id,
      target_label: place.name,
      vote: normalizeDecisionVote(decision.vote),
      note: decision.note || decision.reason || "",
      applies_from_version: parsed.itinerary?.version_id || state.activeVersionId,
      created_at: new Date().toISOString(),
      created_by: "ui",
    });
  });
}

function buildPlacesById(placeCatalog) {
  const places = new Map();
  const entries = Array.isArray(placeCatalog)
    ? placeCatalog
    : placeCatalog?.features || [];

  for (const entry of entries) {
    const normalized = normalizePlace(entry);
    if (normalized.id) {
      places.set(normalized.id, normalized);
    }
  }

  return places;
}

function buildNodesById(routeGraph) {
  const nodes = new Map();
  for (const node of routeGraph?.nodes || []) {
    nodes.set(node.id, node);
  }
  return nodes;
}

function buildEdgesById(routeGraph) {
  const edges = new Map();
  const edgeList = routeGraph?.edges || [];

  edgeList.forEach((edge) => edges.set(edge.id, edge));

  for (const leg of routeGraph?.legs || []) {
    edges.set(leg.id, {
      id: leg.id,
      from_node_id: leg.from_node_id,
      to_node_id: leg.to_node_id,
      edge_type: "drive",
      duration_minutes: leg.schedule_binding
        ? durationBetween(leg.schedule_binding.start_time, leg.schedule_binding.end_time)
        : null,
      summary: "Imported legacy route leg.",
      schedule_day_id: leg.schedule_binding?.day_id || null,
    });
  }

  return edges;
}

function buildUsedPlaceIds() {
  const ordered = [];
  const seen = new Set();

  const remember = (placeId) => {
    if (!placeId || seen.has(placeId) || !state.placesById.has(placeId)) {
      return;
    }
    seen.add(placeId);
    ordered.push(placeId);
  };

  for (const day of state.itinerary?.days || []) {
    remember(day.wake_location_id);
    remember(day.sleep_location_id);

    for (const suggestion of getDayNearbySuggestions(day)) {
      remember(suggestion.location_id);
    }

    for (const movement of day.movements || []) {
      remember(movement.start_location_id);
      remember(movement.end_location_id);
      for (const waypoint of movement.route?.waypoints || []) {
        remember(waypoint.location_id);
      }
    }
  }

  if (!ordered.length) {
    state.placesById.forEach((_, placeId) => remember(placeId));
  }

  return ordered;
}

function normalizePlace(feature) {
  if (feature && !feature.properties) {
    return {
      id: feature.id || "",
      name: feature.name || feature.id || "Unnamed place",
      placeType: feature.type || "place",
      category: "",
      briefDescription: feature.description || "",
      address: feature.address || "",
      country: feature.country || "",
      region: feature.region || "",
      googleMapsUrl: feature.google_maps_url || "",
      websiteUrl: feature.website_url || "",
      popularity: null,
      tags: [],
      latitude: Number.isFinite(feature.coordinates?.lat) ? feature.coordinates.lat : null,
      longitude: Number.isFinite(feature.coordinates?.lng) ? feature.coordinates.lng : null,
      photoUrl: feature.photo_url || "",
      photoAlt: feature.photo_alt || feature.name || "Location photo",
    };
  }

  const properties = feature?.properties || {};
  const coordinates = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : null;

  return {
    id: feature.id || properties.id || "",
    name: properties.name || feature.id || "Unnamed place",
    placeType: properties.place_type || properties.kind || "place",
    category: properties.category || properties.kind || "",
    briefDescription:
      properties.brief_description || properties.description || properties.planning?.notes || "",
    address: properties.location?.address || properties.address || "",
    country: properties.location?.country || properties.country || "",
    region: properties.location?.region || properties.region || "",
    googleMapsUrl: properties.location?.google_maps_url || properties.links?.google_maps_url || "",
    websiteUrl: properties.location?.website_url || properties.links?.website_url || "",
    popularity: properties.popularity || null,
    tags: properties.tags || [],
    latitude: coordinates && Number.isFinite(coordinates[1]) ? coordinates[1] : null,
    longitude: coordinates && Number.isFinite(coordinates[0]) ? coordinates[0] : null,
    photoUrl: properties.media?.photo_url || properties.location?.photo_url || "",
    photoAlt: properties.media?.photo_alt || properties.name || "Location photo",
  };
}

function renderAll() {
  renderLocationOverlayToolbar();
  renderSchedule();
  renderMap();
  setActiveView(state.activeView);
}

function renderVersionOptions() {
  const activeId = state.activeVersionId;
  elements.versionSelect.innerHTML = state.versions
    .map(
      (version) => `
        <option value="${escapeHtml(version.id)}" ${version.id === activeId ? "selected" : ""}>
          ${escapeHtml(formatVersionOptionLabel(version))}
        </option>
      `
    )
    .join("");

}

function renderSchedule() {
  if (state.activeView === "map") {
    elements.scheduleView.innerHTML = "";
    return;
  }

  const days = getItineraryDays();

  if (!days.length) {
    elements.scheduleView.innerHTML = emptyState("No merged itinerary found for this version.");
    return;
  }

  const selectedDay = getSelectedItineraryDay();
  const selectedDayIndex = Math.max(0, days.findIndex((day) => day.id === selectedDay?.id));
  const isDayFocused = state.mapFocus === "day";

  elements.scheduleView.innerHTML = `
    <div class="itinerary-browser">
      ${renderTripSummary(days)}
      ${renderDayNavigator(days, selectedDayIndex)}
      ${
        isDayFocused
          ? `
            <aside class="itinerary-day-sheet">
              <div class="itinerary-day-sheet-header">
                <div>
                  <p class="itinerary-sheet-kicker">${escapeHtml(formatDaySheetKicker(selectedDay, selectedDayIndex))}</p>
                  <h2>${escapeHtml(getDaySheetTitle(selectedDay))}</h2>
                </div>
                <div class="itinerary-sheet-actions">
                  <button class="ghost-button icon-button" type="button" data-close-day-focus aria-label="Show full itinerary map">
                    ×
                  </button>
                </div>
              </div>

              ${renderDaySheetLead(selectedDay)}
              ${renderStayPlanningEditor(selectedDay)}
              ${renderDayOverview(selectedDay)}
              ${renderDayDetailSection(selectedDay)}
            </aside>
          `
          : ""
      }
    </div>
  `;

  bindDaySelectionEvents(elements.scheduleView);
  bindTimelineControls(elements.scheduleView);
  bindSchedulePlaceSelectionEvents(elements.scheduleView);
  bindStayPlanningEvents(elements.scheduleView);
  bindRouteOptionSelectionEvents(elements.scheduleView);
  bindRouteWaypointActions(elements.scheduleView);
  bindDayFocusCloseAction(elements.scheduleView);
  bindOpenRouteActions(elements.scheduleView);
}

function renderLocationOverlayToolbar() {
  const toolbar = elements.locationOverlayToolbar;
  if (!toolbar) {
    return;
  }

  const locations = getAllExplorerLocations();
  if (!locations.length) {
    toolbar.hidden = true;
    toolbar.innerHTML = "";
    return;
  }

  const filters = getExplorerFilterOptions();
  const enabled = state.locationsExplorer.enabled === true;

  toolbar.hidden = false;
  toolbar.innerHTML = `
    <div class="location-overlay-toolbar-shell">
      <button
        type="button"
        class="location-overlay-toggle ${enabled ? "is-active" : ""}"
        data-toggle-location-overlay
        aria-pressed="${enabled ? "true" : "false"}"
      >
        <span class="location-overlay-toggle-dot" aria-hidden="true"></span>
        <span>All locations</span>
      </button>

      <label class="location-overlay-search ${enabled ? "" : "is-disabled"}">
        <span class="location-overlay-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Search places, address, description, amenities…"
          value="${escapeAttribute(state.locationsExplorer.searchDraft || state.locationsExplorer.searchQuery)}"
          data-location-overlay-search
          ${enabled ? "" : "disabled"}
        />
      </label>

      <label class="location-overlay-filter ${enabled ? "" : "is-disabled"}">
        <select data-location-overlay-filter ${enabled ? "" : "disabled"}>
          ${filters
            .map(
              (filter) => `
                <option value="${escapeAttribute(filter.id)}" ${filter.id === state.locationsExplorer.taxonomyFilter ? "selected" : ""}>
                  ${escapeHtml(`${filter.icon} ${filter.label} (${filter.count})`)}
                </option>
              `
            )
            .join("")}
        </select>
      </label>
    </div>
  `;

  bindLocationOverlayToolbarEvents(toolbar);
}

function renderTripSummary(days) {
  const driveMovements = (days || [])
    .map((day) => getDayDriveMovement(day))
    .filter(Boolean);

  if (!days?.length) {
    return "";
  }

  const totalDistanceKm = driveMovements.reduce((sum, movement) => {
    const selectedOption = getSelectedRouteOption(movement, {
      fetchSelectedGoogle: false,
      fetchUnselectedGoogle: false,
    });
    const distance = Number.isFinite(selectedOption?.distance_km)
      ? selectedOption.distance_km
      : Number.isFinite(movement.distance_km)
        ? movement.distance_km
        : 0;
    return sum + distance;
  }, 0);

  return `
    <div class="itinerary-trip-summary" aria-label="Trip summary">
      <span class="itinerary-trip-summary-pill">
        ${escapeHtml(
          `🗓️ ${days.length} ${days.length === 1 ? "day" : "days"}  🚗 ${driveMovements.length} ${driveMovements.length === 1 ? "drive leg" : "drive legs"}  📏 ${formatDistance(totalDistanceKm)}`
        )}
      </span>
    </div>
  `;
}

function renderStayPlanningEditor(day) {
  const working = getWorkingItinerary();
  const stay = getStayForDay(day);
  if (!working || !stay) {
    return "";
  }

  const stayLocation = getItineraryLocation(stay.overnight_location_id);
  const canRemove = getActiveWorkingStays().length > 1 && stay.locked !== true;
  const versionOptions = state.itineraryVersions.length
    ? `
      <label class="planning-editor-select">
        <span>Compare</span>
        <select data-planning-version-select>
          <option value="">Current draft</option>
          ${state.itineraryVersions
            .map(
              (version) => `
                <option value="${escapeAttribute(version.id)}" ${version.id === state.selectedPlanningVersionId ? "selected" : ""}>
                  ${escapeHtml(version.name || version.id)}
                </option>
              `
            )
            .join("")}
        </select>
      </label>
    `
    : "";

  return `
    <section class="planning-editor" data-stay-id="${escapeAttribute(stay.id)}">
      <div class="planning-editor-heading">
        <div>
          <strong>Planning draft</strong>
          <span>${escapeHtml(stayLocation?.name || "Select a stay")}</span>
        </div>
        <label class="planning-lock-toggle">
          <input type="checkbox" data-stay-lock-toggle ${stay.locked ? "checked" : ""} />
          <span>Locked</span>
        </label>
      </div>

      <div class="planning-editor-grid">
        <label class="planning-editor-select">
          <span>Stay</span>
          <select data-stay-location-select ${stay.locked ? "disabled" : ""}>
            ${renderStayLocationOptions(stay.overnight_location_id)}
          </select>
        </label>

        <label class="planning-editor-nights">
          <span>Nights</span>
          <input
            type="number"
            min="1"
            max="14"
            value="${escapeAttribute(String(stay.nights || 1))}"
            data-stay-nights-input
            ${stay.locked ? "disabled" : ""}
          />
        </label>
      </div>

      <div class="planning-editor-actions">
        <button class="mini-button" type="button" data-add-stay-after>Add stay</button>
        <button class="mini-button" type="button" data-remove-stay ${canRemove ? "" : "disabled"}>Remove stay</button>
        <button class="mini-button" type="button" data-save-itinerary-version>Save version</button>
        ${versionOptions}
      </div>
      ${renderPlanningVersionComparison()}
    </section>
  `;
}

function renderPlanningVersionComparison() {
  if (!state.selectedPlanningVersionId) {
    return "";
  }

  const version = state.itineraryVersions.find((entry) => entry.id === state.selectedPlanningVersionId);
  if (!version) {
    return "";
  }

  const current = getWorkingItinerary()?.metadata || {};
  const saved = version.metrics || version.working_itinerary?.metadata || {};
  const metrics = [
    ["Days", current.total_days, saved.total_days],
    ["Nights", current.total_nights, saved.total_nights],
    ["Drive days", current.drive_days, saved.drive_days],
  ];

  return `
    <div class="planning-version-compare">
      <strong>${escapeHtml(version.name || version.id)}</strong>
      ${metrics
        .map(([label, currentValue, savedValue]) => {
          const delta = Number(currentValue || 0) - Number(savedValue || 0);
          const deltaLabel = delta === 0 ? "same" : `${delta > 0 ? "+" : ""}${delta}`;
          return `<span>${escapeHtml(label)}: ${escapeHtml(String(savedValue ?? 0))} saved · ${escapeHtml(deltaLabel)}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderStayLocationOptions(selectedLocationId) {
  return Array.from(state.placesById.values())
    .filter((location) => {
      const taxonomy = getLocationTaxonomy(location).id;
      return ["campground", "hotel"].includes(taxonomy);
    })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(
      (location) => `
        <option value="${escapeAttribute(location.id)}" ${location.id === selectedLocationId ? "selected" : ""}>
          ${escapeHtml(`${getLocationTaxonomy(location).icon} ${location.name}`)}
        </option>
      `
    )
    .join("");
}

function renderDayNavigator(days, selectedDayIndex) {
  const visibleDays = getNavigatorDays(days, selectedDayIndex);
  const canStepBackward = selectedDayIndex > 0;
  const canStepForward = selectedDayIndex < days.length - 1;

  return `
    <div class="itinerary-day-tabs" role="tablist" aria-label="Trip days">
      <button
        class="itinerary-day-nav"
        type="button"
        data-day-step="-1"
        ${canStepBackward ? "" : "disabled"}
        aria-label="Previous day"
      >
        ←
      </button>
      <div class="itinerary-day-window">
        ${visibleDays
          .map(
            ({ day, index }) => `
              <button
                class="itinerary-day-tab ${day.id === days[selectedDayIndex].id ? "active" : ""}"
                type="button"
                data-day-id="${escapeHtml(day.id)}"
                role="tab"
                aria-selected="${String(day.id === days[selectedDayIndex].id)}"
                aria-label="${escapeHtml(formatItineraryDayLabel(day, index))}"
              >
                <span class="itinerary-day-tab-label">${escapeHtml(formatItineraryDayLabel(day, index))}</span>
              </button>
            `
          )
          .join("")}
      </div>
      <button
        class="itinerary-day-nav"
        type="button"
        data-day-step="1"
        ${canStepForward ? "" : "disabled"}
        aria-label="Next day"
      >
        →
      </button>
    </div>
  `;
}

function getNavigatorDays(days, selectedDayIndex) {
  const windowSize = Math.min(5, days.length);
  let start = Math.max(0, selectedDayIndex - Math.floor(windowSize / 2));
  let end = start + windowSize;
  if (end > days.length) {
    end = days.length;
    start = Math.max(0, end - windowSize);
  }

  return days.slice(start, end).map((day, offset) => ({
    day,
    index: start + offset,
  }));
}

function renderMiniMonthMap(selectedDay, days) {
  const selectedDate = parseLocalDate(selectedDay.date);
  if (!selectedDate) {
    return "";
  }

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 12, 0, 0, 0);
  const gridStart = addDays(monthStart, -getCalendarWeekdayIndex(monthStart));
  const gridEnd = addDays(monthEnd, 6 - getCalendarWeekdayIndex(monthEnd));
  const scheduledDays = new Set(
    days
      .map((day) => parseLocalDate(day.date))
      .filter((date) => date && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear())
      .map((date) => formatDateKey(date))
  );

  const cells = [];
  for (let cursor = new Date(gridStart.getTime()); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const dateKey = formatDateKey(cursor);
    cells.push(`
      <span
        class="mini-month-cell
          ${cursor.getMonth() !== selectedDate.getMonth() ? "is-outside-month" : ""}
          ${scheduledDays.has(dateKey) ? "is-scheduled" : ""}
          ${dateKey === formatDateKey(selectedDate) ? "is-active" : ""}
        "
        aria-label="${escapeHtml(formatCalendarLongDate(cursor, dateKey))}"
      ></span>
    `);
  }

  return `
    <div class="journey-mini-month" aria-label="${escapeHtml(formatCalendarMonth(selectedDate))}">
      <div class="journey-mini-grid">
        ${cells.join("")}
      </div>
    </div>
  `;
}

function renderCarouselDayCard(day, options = {}) {
  const { position = "current", isActive = false, currentIndex = 0, totalDays = 0 } = options;
  const highlight = getDayHighlight(day);
  const routeFacts = getDayRouteFacts(day);
  const date = parseLocalDate(day.date);
  const startLocation = getDayStartLocation(day, routeFacts, highlight);
  const activities = getDayActivityItems(day);
  const previewActivities = activities.slice(0, isActive ? 4 : 2);
  const dayModeLabel = formatDayMode(day.day_mode);
  const mobilityLabel = formatMobilityPlan(day.mobility_plan);
  const supplyHighlights = getSupplyHighlights(day);
  const nearbyHighlights = getNearbyActivityHighlights(day);
  const cardClasses = [
    "journey-day-card",
    `journey-day-card-${position}`,
    isActive ? "is-active" : "is-preview",
    dayIncludesPlace(day, state.selectedPlaceId) ? "is-selected-place" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article
      class="${cardClasses}"
      ${isActive ? 'data-current-day-card tabindex="0"' : `data-day-id="${escapeHtml(day.id)}" tabindex="0" role="button" aria-pressed="false"`}
    >
      <div class="journey-day-header">
        <div>
          <p class="journey-day-kicker">${escapeHtml(formatCalendarLongDate(date, day.date || day.id))}</p>
          <h3>${escapeHtml(day.title || day.id)}</h3>
          ${
            dayModeLabel || mobilityLabel
              ? `<p class="journey-day-subhead">${escapeHtml([dayModeLabel, mobilityLabel].filter(Boolean).join(" • "))}</p>`
              : ""
          }
        </div>
        ${
          isActive
            ? `<span class="count-chip">Day ${currentIndex + 1} / ${totalDays}</span>`
            : ""
        }
      </div>

      <div class="journey-highlight-row">
        ${
          startLocation
            ? `
              <div class="journey-highlight-card">
                <span class="journey-highlight-label">Here</span>
                <strong>
                  <span class="calendar-inline-icon" aria-hidden="true">${iconForPlaceRole("place")}</span>
                  ${escapeHtml(startLocation)}
                </strong>
              </div>
            `
            : ""
        }
        ${
          highlight.sleep
            ? `
              <div class="journey-highlight-card">
                <span class="journey-highlight-label">Sleep</span>
                <strong>
                  <span class="calendar-inline-icon" aria-hidden="true">${highlight.sleep.icon}</span>
                  ${escapeHtml(getSleepLocationLabel(highlight.sleep))}
                </strong>
              </div>
            `
            : ""
        }
        ${
          routeFacts.distanceLabel
            ? `
              <div class="journey-highlight-card">
                <span class="journey-highlight-label">Drive</span>
                <strong>
                  <span class="calendar-inline-icon" aria-hidden="true">${iconForItemType("route_segment")}</span>
                  ${escapeHtml(routeFacts.distanceLabel)}
                </strong>
              </div>
            `
            : `
              <div class="journey-highlight-card is-rest-day">
                <span class="journey-highlight-label">Drive</span>
                <strong>
                  <span class="calendar-inline-icon" aria-hidden="true">${iconForItemType("rest")}</span>
                  No major drive
                </strong>
              </div>
            `
        }
      </div>

      ${
        routeFacts.edge && isActive
          ? `
            <div class="journey-route-strip">
              <span class="journey-route-pill">${escapeHtml(routeFacts.fromToLabel)}</span>
              ${routeFacts.durationLabel ? `<span class="journey-route-pill">${escapeHtml(routeFacts.durationLabel)}</span>` : ""}
              ${routeFacts.selectedStyleLabel ? `<span class="journey-route-pill">${escapeHtml(routeFacts.selectedStyleLabel)}</span>` : ""}
              ${routeFacts.optionCountLabel ? `<span class="journey-route-pill">${escapeHtml(routeFacts.optionCountLabel)}</span>` : ""}
              ${routeFacts.waypointCountLabel ? `<span class="journey-route-pill">${escapeHtml(routeFacts.waypointCountLabel)}</span>` : ""}
            </div>
          `
          : ""
      }

      ${
        isActive && (supplyHighlights.length || nearbyHighlights.length)
          ? `
            <div class="journey-support-grid">
              ${
                supplyHighlights.length
                  ? `
                    <div class="journey-support-card">
                      <div class="journey-support-heading">Food and Supplies</div>
                      <div class="journey-support-list">
                        ${supplyHighlights.map((item) => renderSupportPill(item.icon, item.label)).join("")}
                      </div>
                    </div>
                  `
                  : ""
              }
              ${
                nearbyHighlights.length
                  ? `
                    <div class="journey-support-card">
                      <div class="journey-support-heading">Nearby Without Driving</div>
                      <div class="journey-support-list">
                        ${nearbyHighlights.map((item) => renderSupportPill(item.icon, item.label)).join("")}
                      </div>
                    </div>
                  `
                  : ""
              }
            </div>
          `
          : ""
      }

      <div class="journey-activities">
        <div class="journey-activities-heading">
          <span>Stops and activities</span>
          ${
            activities.length > previewActivities.length
              ? `<span class="journey-activities-more">+${activities.length - previewActivities.length} more</span>`
              : ""
          }
        </div>
        <div class="journey-activity-list">
          ${
            previewActivities.length
              ? previewActivities.map((item) => renderScheduleItem(item, { mode: isActive ? "detail" : "compact" })).join("")
              : `<div class="journey-empty-note">No extra stops planned for this day.</div>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderScheduleItem(item, options = {}) {
  const mode = options.mode || "compact";
  const edge = state.edgesById.get(item.edge_id || item.linked_leg_id);
  const title = item.title || humanize(item.type);
  const badgeType = item.type === "drive_leg" ? "route_segment" : item.type;
  const placeButtons = [];
  const icon = iconForItemType(item.type);
  const placeLabel = item.place_id ? resolvePlaceName(item.place_id) : "";
  const routeFacts = item.type === "route_segment" ? getRouteFacts(edge) : null;

  if (item.place_id) {
    placeButtons.push(renderPlaceChip(item.place_id));
  }

  if (edge) {
    const fromPlaceId = resolvePlaceIdFromNode(edge.from_node_id);
    const toPlaceId = resolvePlaceIdFromNode(edge.to_node_id);
    if (fromPlaceId) {
      placeButtons.push(renderPlaceChip(fromPlaceId));
    }
    if (toPlaceId) {
      placeButtons.push(renderPlaceChip(toPlaceId));
    }
  }

  const routeSummary = edge
    ? `${resolvePlaceNameFromNode(edge.from_node_id)} to ${resolvePlaceNameFromNode(edge.to_node_id)}`
    : "";
  const leadMeta = formatItemLead(item, edge);
  const detailMeta = formatItemSecondaryMeta(item, edge);

  return `
    <div class="calendar-item calendar-item-${escapeAttribute(mode)}">
      <div class="calendar-item-top">
        <div class="calendar-item-labels">
          <span class="calendar-item-icon" aria-hidden="true">${icon}</span>
          <span class="calendar-item-time">${escapeHtml(leadMeta)}</span>
        </div>
        <div class="calendar-item-tags">
          <span class="type-badge">${escapeHtml(humanize(badgeType))}</span>
          ${item.place_id && state.decisions.has(item.place_id)
            ? renderVoteBadge(state.decisions.get(item.place_id).vote)
            : ""}
        </div>
      </div>
      <strong class="calendar-item-title">${escapeHtml(title)}</strong>
      ${
        detailMeta
          ? `<div class="calendar-item-support">${escapeHtml(detailMeta)}</div>`
          : routeSummary
            ? `<div class="timeline-item-note">${escapeHtml(routeSummary)}</div>`
            : ""
      }
      ${
        mode === "detail" && placeLabel
          ? `
            <div class="calendar-item-support">
              <span class="calendar-inline-icon" aria-hidden="true">${iconForPlaceRole("place")}</span>
              ${escapeHtml(placeLabel)}
            </div>
          `
          : ""
      }
      ${
        mode === "detail" && routeFacts?.summary
          ? `<div class="calendar-item-note">${escapeHtml(routeFacts.summary)}</div>`
          : ""
      }
      ${
        mode === "detail" && item.notes
          ? `<div class="calendar-item-note">${escapeHtml(item.notes)}</div>`
          : ""
      }
      <div>
        ${placeButtons.length ? `<div class="timeline-place-row">${placeButtons.join("")}</div>` : ""}
      </div>
    </div>
  `;
}

function renderSupportPill(icon, label) {
  return `
    <span class="journey-support-pill">
      <span class="calendar-inline-icon" aria-hidden="true">${icon}</span>
      ${escapeHtml(label)}
    </span>
  `;
}

function renderOpenRouteButton(movement, label = "Open route") {
  const routeUrl =
    getSelectedRouteOption(movement)?.open_route_url || movement?.route?.open_route_url || "";

  if (!routeUrl) {
    return "";
  }

  return `
    <a
      class="itinerary-route-button"
      href="${escapeAttribute(routeUrl)}"
      target="_blank"
      rel="noreferrer"
      data-open-route
    >
      ${renderExternalActionIcon("route")}
      <span>${escapeHtml(label)}</span>
    </a>
  `;
}

function renderDaySheetLead(day) {
  const segments = [];
  if (day.summary) {
    segments.push(day.summary);
  }

  if (!segments.length) {
    return "";
  }

  return `<p class="itinerary-sheet-summary">${escapeHtml(segments.join(" "))}</p>`;
}

function renderDayOverview(day) {
  const wakeLocation = getItineraryLocation(day.wake_location_id);
  const sleepLocation = getItineraryLocation(day.sleep_location_id);
  const driveMovement = getDayDriveMovement(day);
  const driveFacts = getMovementRouteFacts(driveMovement);
  const isStayDay = wakeLocation && sleepLocation && wakeLocation.id === sleepLocation.id;
  const cards = [];

  if (isStayDay && wakeLocation) {
    cards.push({
      kind: "location",
      label: "Stay in",
      value: getLocationAreaLabel(wakeLocation),
      meta: getLocationTaxonomyLabel(wakeLocation),
      placeId: wakeLocation.id,
      detailMode: "stay",
    });
  } else {
    if (sleepLocation) {
      cards.push({
        kind: "location",
        label: "Sleep",
        value: getLocationAreaLabel(sleepLocation),
        meta: getLocationTaxonomyLabel(sleepLocation),
        placeId: sleepLocation.id,
        detailMode: "stay",
      });
    }
  }

  if (driveMovement) {
    cards.push({
      kind: "movement",
      label: "Drive",
      value: driveFacts.distanceLabel || "Drive day",
      meta: [driveFacts.durationLabel, driveFacts.selectedStyleLabel].filter(Boolean).join(" • "),
      movementId: driveMovement.id,
      detailMode: "drive",
    });
  }

  return `
    <div class="itinerary-overview-grid">
      ${cards
        .map(
          (card) => `
            <${card.placeId || card.movementId ? "button" : "div"}
              class="itinerary-overview-card ${card.placeId || card.movementId ? "is-clickable" : ""} ${card.detailMode && card.detailMode === state.selectedDayDetailMode ? "is-active" : ""}"
              ${
                card.placeId || card.movementId
                  ? `type="button" ${card.placeId ? `data-place-id="${escapeHtml(card.placeId)}"` : ""} ${card.movementId ? `data-movement-id="${escapeHtml(card.movementId)}"` : ""} ${card.detailMode ? `data-day-detail-mode="${escapeHtml(card.detailMode)}"` : ""}`
                  : ""
              }
            >
              <span class="itinerary-overview-label">${escapeHtml(card.label)}</span>
              <strong>${escapeHtml(card.value)}</strong>
              ${card.meta ? `<p>${escapeHtml(card.meta)}</p>` : ""}
            </${card.placeId || card.movementId ? "button" : "div"}>
          `
        )
        .join("")}
    </div>
  `;
}

function renderStaySection(day) {
  const stayLocation = getItineraryLocation(day.sleep_location_id || day.wake_location_id);
  const accommodation = stayLocation?.accommodation;

  if (!stayLocation || !accommodation) {
    return "";
  }

  const amenities = renderStayAmenityPills(accommodation.features || []);
  const campgroundFacts = renderCampgroundFacts(accommodation, { includeAmenities: false });

  if (!amenities && !campgroundFacts) {
    return "";
  }

  return `
    <section class="itinerary-section">
      <div class="itinerary-stop-section-heading">
        <div>
          <strong>Stay details</strong>
          <span>${escapeHtml(stayLocation.name)}</span>
        </div>
      </div>
      ${amenities ? `<div class="itinerary-chip-row">${amenities}</div>` : ""}
      ${campgroundFacts}
    </section>
  `;
}

function getAvailableDayDetailModes(day) {
  return getDayDriveMovement(day) ? ["stay", "drive"] : ["stay"];
}

function getDefaultDayDetailMode(day) {
  return getDayDriveMovement(day) ? "drive" : "stay";
}

function syncDayDetailMode(day, options = {}) {
  if (!day) {
    state.selectedDayDetailMode = "stay";
    return;
  }

  const availableModes = getAvailableDayDetailModes(day);
  const shouldReset =
    options.forceDefault === true || !availableModes.includes(state.selectedDayDetailMode);
  if (shouldReset) {
    state.selectedDayDetailMode = getDefaultDayDetailMode(day);
  }

  if (state.selectedDayDetailMode === "drive") {
    const driveMovement = getDayDriveMovement(day);
    if (driveMovement) {
      state.selectedMovementId = driveMovement.id;
    }
  }
}

function renderDayDetailSection(day) {
  if (state.selectedDayDetailMode === "drive" && getDayDriveMovement(day)) {
    return renderDayRouteSection(day);
  }

  return `
    ${renderStaySection(day)}
    ${renderNearbySection(day)}
  `;
}

function renderDayRouteSection(day) {
  const driveMovement = getDayDriveMovement(day);
  const stops = getDayDriveStops(day, driveMovement);
  const nearbyRouteSuggestions = getRouteNearbyLocationSuggestions(driveMovement);

  if (!driveMovement) {
    return "";
  }

  return `
    <section class="itinerary-section">
      <div class="itinerary-stop-section-heading">
        <div>
          <strong>Route options</strong>
          <span>${escapeHtml(getRenderableRouteOptions(driveMovement).length === 1 ? "1 route" : `${getRenderableRouteOptions(driveMovement).length} routes`)}</span>
        </div>
        ${renderOpenRouteButton(driveMovement)}
      </div>
      ${renderRouteOptions(driveMovement)}
    </section>

    <section class="itinerary-section">
      <div class="itinerary-stop-section-heading">
        <div>
          <strong>Suggested stops</strong>
          <span>${escapeHtml(formatStopCountLabel(stops.length))}</span>
        </div>
      </div>
      <div class="itinerary-stop-list">
        ${stops.length ? renderDayStopCards(stops, { movementId: driveMovement.id, allowWaypointRemoval: true }) : emptyState("No mapped route waypoints for this route yet.")}
      </div>
    </section>

    <section class="itinerary-section">
      <div class="itinerary-stop-section-heading">
        <div>
          <strong>Near this route</strong>
          <span>${escapeHtml(formatStopCountLabel(nearbyRouteSuggestions.length))} within 20 km</span>
        </div>
      </div>
      <div class="itinerary-stop-list">
        ${
          nearbyRouteSuggestions.length
            ? renderRouteSuggestionCards(nearbyRouteSuggestions, driveMovement.id)
            : emptyState("No extra itinerary locations found within 20 km of this route yet.")
        }
      </div>
    </section>
  `;
}

function getAllExplorerLocations() {
  return (state.itinerary?.locations || []).filter((location) => location && location.id);
}

function getExplorerFilterOptions() {
  const allLocations = getAllExplorerLocations();
  const counts = new Map();

  allLocations.forEach((location) => {
    const taxonomy = getLocationTaxonomy(location);
    counts.set(taxonomy.id, (counts.get(taxonomy.id) || 0) + 1);
  });

  return [
    {
      id: "all",
      label: "All",
      icon: "🗺️",
      count: allLocations.length,
    },
    ...LOCATION_TAXONOMY.filter((taxonomy) => counts.get(taxonomy.id) > 0).map((taxonomy) => ({
      ...taxonomy,
      count: counts.get(taxonomy.id) || 0,
    })),
  ];
}

function getLocationSearchText(location) {
  const taxonomy = getLocationTaxonomy(location);
  const accommodation = location?.accommodation || {};
  const sanitary = formatCampgroundSanitary(accommodation.sanitary).map((item) => item.label);
  const campingStyles = formatCampgroundStyles(accommodation.camping_styles || []).map((item) => item.label);
  const amenities = formatCampgroundAmenities(accommodation.amenities || []).map((item) => item.label);

  return [
    location?.name,
    location?.address,
    location?.region,
    location?.country,
    location?.description,
    location?.type,
    taxonomy.label,
    ...((accommodation.features || []).map((value) => ACCOMMODATION_FEATURE_META[value]?.label || humanize(value))),
    ...amenities,
    ...campingStyles,
    ...sanitary,
    CAMPGROUND_SHADE_LABELS[accommodation.shade] || "",
    CAMPGROUND_SURFACE_LABELS[accommodation.surface] || "",
    formatCampgroundQuietHours(accommodation.quiet_hours),
    accommodation.notes || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getFilteredExplorerLocations() {
  const query = String(state.locationsExplorer.searchQuery || "")
    .trim()
    .toLowerCase();
  const filter = state.locationsExplorer.taxonomyFilter || "all";

  return getAllExplorerLocations()
    .filter((location) => filter === "all" || getLocationTaxonomy(location).id === filter)
    .filter((location) => !query || getLocationSearchText(location).includes(query))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function renderNearbySection(day) {
  const suggestions = getDayNearbySuggestionStops(day);
  if (!suggestions.length) {
    return "";
  }

  return `
    <section class="itinerary-section">
      <div class="itinerary-stop-section-heading">
        <div>
          <strong>Nearby and suggestions</strong>
          <span>${escapeHtml(formatStopCountLabel(suggestions.length))}</span>
        </div>
      </div>
      <div class="itinerary-stop-list">
        ${renderNearbySuggestionCards(suggestions)}
      </div>
    </section>
  `;
}

function formatDaySheetKicker(day, fallbackIndex) {
  const parts = [formatItineraryDayLabel(day, fallbackIndex)];
  const date = parseLocalDate(day.date);
  if (date) {
    parts.push(formatCalendarLongDate(date, day.date || ""));
  }
  return parts.filter(Boolean).join(" • ");
}

function getDaySheetTitle(day) {
  const wakeLocation = getItineraryLocation(day.wake_location_id);
  const sleepLocation = getItineraryLocation(day.sleep_location_id);
  const wakeArea = getLocationAreaLabel(wakeLocation);
  const sleepArea = getLocationAreaLabel(sleepLocation);

  if (wakeArea && sleepArea) {
    return wakeArea === sleepArea ? wakeArea : `${wakeArea} → ${sleepArea}`;
  }

  return formatItineraryDayLabel(day, day.day_number ? day.day_number - 1 : 0);
}

function formatItineraryDayLabel(day, fallbackIndex) {
  return `Day ${day.day_number || fallbackIndex + 1}`;
}

function getDayDriveMovement(day) {
  return (day.movements || []).find((movement) => movement.mode === "car") || null;
}

function getSelectedMovementForDay(day) {
  return (day?.movements || []).find((movement) => movement.id === state.selectedMovementId) || null;
}

function movementExistsInDay(day, movementId) {
  if (!movementId || !day) {
    return false;
  }
  return (day.movements || []).some((movement) => movement.id === movementId);
}

function getMovementRouteFacts(movement) {
  if (!movement) {
    return {
      distanceLabel: "",
      durationLabel: "",
      selectedStyleLabel: "",
    };
  }

  const selectedOption = getSelectedRouteOption(movement);

  return {
    distanceLabel: formatDistance(selectedOption?.distance_km ?? movement.distance_km),
    durationLabel: formatDuration(selectedOption?.duration_minutes ?? movement.duration_minutes),
    selectedStyleLabel: selectedOption?.style
      ? `${humanize(selectedOption.style)} route`
      : "",
  };
}

function formatStopCountLabel(count) {
  return count === 1 ? "1 stop" : `${count} stops`;
}

function getSelectedRouteOption(movement, renderOptions = {}) {
  const options = getRenderableRouteOptions(movement, renderOptions);
  return options.find((option) => option.is_selected) || options[0] || null;
}

function renderRouteOptions(movement) {
  const options = getRenderableRouteOptions(movement, {
    fetchSelectedGoogle: true,
    fetchUnselectedGoogle: false,
  });
  if (!options.length) {
    return "";
  }

  return `
    <div class="itinerary-route-options">
      ${options
        .map(
          (option) => `
            <button
              type="button"
              class="itinerary-route-option ${option.is_selected ? "is-selected" : ""}"
              data-route-option-style="${escapeHtml(option.style)}"
              data-route-option-movement-id="${escapeHtml(movement.id)}"
              aria-pressed="${option.is_selected ? "true" : "false"}"
            >
              <strong>${escapeHtml(humanize(option.style))}</strong>
              <span>${escapeHtml(
                [formatDistance(option.distance_km), formatDuration(option.duration_minutes)]
                  .filter(Boolean)
                  .join(" • ") || "Route option"
              )}</span>
              ${option.summary ? `<p>${escapeHtml(option.summary)}</p>` : ""}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function selectRouteOption(movementId, style) {
  const day = getSelectedItineraryDay();
  const movement = (day?.movements || []).find((entry) => entry.id === movementId);
  if (!movement || !Array.isArray(movement.route_options) || !movement.route_options.length) {
    return;
  }

  const didChange = applyRouteOptionSelection(movement, style, { persist: true });
  if (!didChange) {
    return;
  }

  state.selectedMovementId = movement.id;
  state.selectedDayDetailMode = "drive";
  syncSelectedPlaceForDay(day, {
    force: true,
    mode: "drive",
  });
  renderSchedule();
  renderMap();
  focusMovementOnMap(movement);
}

function addLocationToSelectedRoute(movementId, locationId) {
  const day = getSelectedItineraryDay();
  const movement = (day?.movements || []).find((entry) => entry.id === movementId);
  const option = getSelectedRawRouteOption(movement);
  if (!movement || !option || !locationId || locationId === movement.start_location_id || locationId === movement.end_location_id) {
    return;
  }

  option.waypoints = Array.isArray(option.waypoints) ? option.waypoints : [];
  if (option.waypoints.some((waypoint) => waypoint.location_id === locationId)) {
    return;
  }

  option.waypoints.push({
    id: `${option.id || movement.id}_wp_${Date.now().toString(36)}`,
    order: option.waypoints.length + 1,
    location_id: locationId,
    role: "waypoint",
    notes: "Added from route suggestions",
  });
  resetRouteOptionMetrics(movement, option);
  state.selectedDayDetailMode = "drive";
  state.selectedMovementId = movement.id;
  state.selectedPlaceId = locationId;
  state.activeTooltipPlaceId = locationId;
  scheduleAutosave();
  renderSchedule();
  renderMap();
  focusMovementOnMap(movement);
}

function removeLocationFromSelectedRoute(movementId, locationId) {
  const day = getSelectedItineraryDay();
  const movement = (day?.movements || []).find((entry) => entry.id === movementId);
  const option = getSelectedRawRouteOption(movement);
  if (!movement || !option || !locationId || !Array.isArray(option.waypoints)) {
    return;
  }

  const nextWaypoints = option.waypoints.filter((waypoint) => waypoint.location_id !== locationId);
  if (nextWaypoints.length === option.waypoints.length) {
    return;
  }

  option.waypoints = nextWaypoints.map((waypoint, index) => ({
    ...waypoint,
    order: index + 1,
  }));
  resetRouteOptionMetrics(movement, option);
  state.selectedDayDetailMode = "drive";
  state.selectedMovementId = movement.id;
  scheduleAutosave();
  renderSchedule();
  renderMap();
  focusMovementOnMap(movement);
}

function resetRouteOptionMetrics(movement, option) {
  if (!movement || !option) {
    return;
  }
  option.distance_km = null;
  option.duration_minutes = null;
  movement.distance_km = null;
  movement.duration_minutes = null;
  movement.route = {
    ...(movement.route || {}),
    open_route_url: "",
  };
}

function buildSyntheticRouteOptionLine(baseLine, optionIndex) {
  const coordinates = (baseLine || []).filter(
    (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
  );
  if (coordinates.length < 2) {
    return [];
  }

  const offsetScale = optionIndex % 2 === 0 ? 0.11 : -0.11;
  return coordinates.map((point, index) => {
    if (index === 0 || index === coordinates.length - 1) {
      return { lat: point.lat, lng: point.lng };
    }

    const prev = coordinates[index - 1];
    const next = coordinates[index + 1];
    const latVector = next.lat - prev.lat;
    const lngVector = next.lng - prev.lng;
    const length = Math.hypot(latVector, lngVector) || 1;
    const normalLat = -lngVector / length;
    const normalLng = latVector / length;

    return {
      lat: point.lat + normalLat * offsetScale,
      lng: point.lng + normalLng * offsetScale,
    };
  });
}

function getRouteAnchorPoint(locationId) {
  const location = getItineraryLocation(locationId);
  if (!location || !Number.isFinite(location.coordinates?.lat) || !Number.isFinite(location.coordinates?.lng)) {
    return null;
  }

  return {
    lat: location.coordinates.lat,
    lng: location.coordinates.lng,
  };
}

function dedupeRouteLinePoints(points) {
  const deduped = [];
  const seen = new Set();

  points.forEach((point) => {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      return;
    }
    const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(point);
  });

  return deduped;
}

function buildFallbackMovementLine(movement, waypoints = []) {
  const points = [];
  const startPoint = getRouteAnchorPoint(movement?.start_location_id);
  const endPoint = getRouteAnchorPoint(movement?.end_location_id);

  if (startPoint) {
    points.push(startPoint);
  }

  (waypoints || []).forEach((waypoint) => {
    const waypointPoint = getRouteAnchorPoint(waypoint?.location_id);
    if (waypointPoint) {
      points.push(waypointPoint);
    }
  });

  if (endPoint) {
    points.push(endPoint);
  }

  const deduped = dedupeRouteLinePoints(points);
  return deduped.length >= 2 ? deduped : [];
}

function getRenderableRouteOptions(
  movement,
  {
    fetchSelectedGoogle = true,
    fetchUnselectedGoogle = false,
  } = {}
) {
  if (!movement || movement.mode !== "car") {
    return [];
  }

  const rawOptions = Array.isArray(movement.route_options) ? movement.route_options : [];
  const baseWaypoints = Array.isArray(movement.route?.waypoints) ? movement.route.waypoints : [];
  const baseLine = buildFallbackMovementLine(movement, baseWaypoints);

  if (!rawOptions.length) {
    const fallbackOption = {
      style: "route",
      summary: movement.summary || "",
      distance_km: movement.distance_km,
      duration_minutes: movement.duration_minutes,
      open_route_url: movement.route?.open_route_url || "",
      is_selected: true,
      waypoints: baseWaypoints,
    };
    const googleRouteLine = ensureGoogleRouteForOption(movement, fallbackOption, baseWaypoints);

    return [
      {
        ...fallbackOption,
        line: googleRouteLine.length >= 2 ? googleRouteLine : baseLine,
      },
    ];
  }

  return rawOptions.map((option, index) => {
    const isSelected = Boolean(option.is_selected);
    const optionWaypoints =
      Array.isArray(option.waypoints) && option.waypoints.length ? option.waypoints : baseWaypoints;
    const fallbackOptionLine = buildFallbackMovementLine(movement, optionWaypoints);
    const shouldFetchGoogle = isSelected ? fetchSelectedGoogle : fetchUnselectedGoogle;
    const googleRouteLine = shouldFetchGoogle
      ? ensureGoogleRouteForOption(movement, option, optionWaypoints)
      : [];
    const line =
      googleRouteLine.length >= 2
        ? googleRouteLine
        : fallbackOptionLine.length >= 2
          ? fallbackOptionLine
          : isSelected
            ? baseLine
            : buildSyntheticRouteOptionLine(baseLine, index + 1);
    const waypoints =
      Array.isArray(option.waypoints) && option.waypoints.length
        ? option.waypoints
        : isSelected
          ? baseWaypoints
          : [];

    return {
      ...option,
      line,
      waypoints,
    };
  });
}

function renderStayAmenityPills(features) {
  const source = new Set(features || []);
  const amenityKeys = [];

  if (source.has("van_ok") || source.has("rooftop_tent_ok") || source.has("van")) {
    amenityKeys.push("van");
  }
  if (source.has("ev_charging")) {
    amenityKeys.push("ev_charging");
  }
  if (source.has("playground")) {
    amenityKeys.push("playground");
  }
  if (source.has("pool")) {
    amenityKeys.push("pool");
  }
  if (source.has("bike_rental")) {
    amenityKeys.push("bike_rental");
  }
  if (source.has("laundry")) {
    amenityKeys.push("laundry");
  }

  return amenityKeys
    .map((feature) => {
      const meta = ACCOMMODATION_FEATURE_META[feature];
      if (!meta) {
        return "";
      }
      return renderCampgroundPill(meta.icon, meta.label);
    })
    .join("");
}

function formatFamilyFit(value) {
  if (!value) {
    return "";
  }

  const labels = {
    great: "Family fit: great",
    good: "Family fit: good",
    okay: "Family fit: okay",
  };

  return labels[value] || `Family fit: ${humanize(value)}`;
}

function renderEditorialInline(editorial) {
  if (!editorial?.priority) {
    return "";
  }

  const meta = EDITORIAL_PRIORITY_META[editorial.priority] || {
    icon: "•",
    label: humanize(editorial.priority),
  };

  return `
    <span class="journey-schema-chip">
      <span aria-hidden="true">${meta.icon}</span>
      ${escapeHtml(meta.label)}
    </span>
  `;
}

function findLocationTaxonomyById(id) {
  return LOCATION_TAXONOMY.find((entry) => entry.id === id) || {
    id: "things_to_do",
    label: "Things to do",
    icon: "📷",
  };
}

function looksLikeChargerLocation(location) {
  const text = [location?.name, location?.description, location?.address, location?.type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /(charger|charging|supercharger|ionity|fastned|tesla|electra|\bev\b)/i.test(text);
}

function getLocationTaxonomy(locationOrType) {
  if (!locationOrType) {
    return findLocationTaxonomyById("things_to_do");
  }

  if (typeof locationOrType === "string") {
    return getLocationTaxonomy({ type: locationOrType });
  }

  const location = locationOrType;
  const type = location.type || location.placeType || "";

  if (type === "campground") {
    return findLocationTaxonomyById("campground");
  }

  if (type === "hotel" || /\bhome\b/i.test(location.name || "")) {
    return findLocationTaxonomyById("hotel");
  }

  if (looksLikeChargerLocation(location)) {
    return findLocationTaxonomyById("charger");
  }

  if (["restaurant", "bakery", "coffee", "ice cream shop"].includes(type)) {
    return findLocationTaxonomyById("restaurant");
  }

  if (["supermarket", "local food store"].includes(type)) {
    return findLocationTaxonomyById("groceries");
  }

  if (type === "store") {
    return /\bmarket|grocery|food|shop\b/i.test(
      [location.name, location.description, location.address].filter(Boolean).join(" ")
    )
      ? findLocationTaxonomyById("groceries")
      : findLocationTaxonomyById("things_to_do");
  }

  if (["natural park", "playground"].includes(type)) {
    return findLocationTaxonomyById("park");
  }

  if (type === "beach") {
    return findLocationTaxonomyById("beach");
  }

  if (type === "sightseeing/miradouro/place-with-view") {
    return findLocationTaxonomyById("things_to_do");
  }

  return findLocationTaxonomyById("things_to_do");
}

function getLocationTaxonomyLabel(locationOrType) {
  return getLocationTaxonomy(locationOrType).label;
}

function iconForLocationType(locationOrType) {
  return getLocationTaxonomy(locationOrType).icon;
}

function getLocationSummaryText(location, fallback = "") {
  if (!location) {
    return fallback || "";
  }

  return fallback || location.description || location.address || "";
}

function humanList(values = []) {
  const items = values.filter(Boolean);
  if (!items.length) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatCampgroundStyles(campingStyles = []) {
  return campingStyles
    .map((value) => CAMPGROUND_STYLE_META[value] || { icon: "⛺", label: CAMPGROUND_STYLE_LABELS[value] || humanize(value) })
    .filter(Boolean);
}

function formatCampgroundSanitary(sanitary) {
  if (!sanitary || typeof sanitary !== "object") {
    return [];
  }
  const labels = [];
  if (sanitary.hot_showers === true) {
    labels.push(CAMPGROUND_SANITARY_META.hot_showers);
  }
  if (sanitary.clean_toilets === true) {
    labels.push(CAMPGROUND_SANITARY_META.clean_toilets);
  }
  return labels;
}

function formatCampgroundQuietHours(quietHours) {
  if (!quietHours || typeof quietHours !== "object") {
    return "";
  }

  if (quietHours.enforced === true && quietHours.starts_at) {
    return `Quiet hours from ${quietHours.starts_at}`;
  }
  if (quietHours.enforced === true) {
    return "Quiet hours enforced";
  }
  if (quietHours.starts_at) {
    return `Quiet from ${quietHours.starts_at}`;
  }
  return "";
}

function formatCampgroundAmenities(amenities = []) {
  return amenities
    .map((value) => CAMPGROUND_AMENITY_META[value] || { icon: "📍", label: CAMPGROUND_AMENITY_LABELS[value] || humanize(value) })
    .filter(Boolean);
}

function getCampgroundFactEntries(accommodation) {
  if (!accommodation || typeof accommodation !== "object") {
    return [];
  }

  const entries = [
    {
      label: "Shade",
      value: CAMPGROUND_SHADE_LABELS[accommodation.shade] || "",
    },
    {
      label: "Surface",
      value: CAMPGROUND_SURFACE_LABELS[accommodation.surface] || "",
    },
    {
      label: "Quiet hours",
      value: formatCampgroundQuietHours(accommodation.quiet_hours),
    },
  ];

  return entries.filter((entry) => entry.value);
}

function renderCampgroundPill(icon, label) {
  if (!label) {
    return "";
  }
  return `
    <span class="campground-pill">
      ${icon ? `<span class="campground-pill-icon" aria-hidden="true">${icon}</span>` : ""}
      ${escapeHtml(label)}
    </span>
  `;
}

function renderCampgroundPillGroup(values, formatter) {
  const items = (values || []).map(formatter).filter(Boolean);
  if (!items.length) {
    return "";
  }

  return `<div class="itinerary-chip-row">${items.map((item) => renderCampgroundPill(item.icon, item.label)).join("")}</div>`;
}

function renderCampgroundFacts(accommodation, { compact = false, includeAmenities = true } = {}) {
  const entries = getCampgroundFactEntries(accommodation);
  const amenityPills = includeAmenities
    ? renderCampgroundPillGroup(
        formatCampgroundAmenities(Array.isArray(accommodation?.amenities) ? accommodation.amenities : []),
        (value) => value
      )
    : "";
  const sanitaryPills = renderCampgroundPillGroup(
    formatCampgroundSanitary(accommodation?.sanitary),
    (value) => value
  );
  const campingStylePills = renderCampgroundPillGroup(
    formatCampgroundStyles(Array.isArray(accommodation?.camping_styles) ? accommodation.camping_styles : []),
    (value) => value
  );

  if (!entries.length && !amenityPills && !sanitaryPills && !campingStylePills) {
    return "";
  }

  return `
    <div class="campground-facts ${compact ? "is-compact" : ""}">
      ${amenityPills}
      ${sanitaryPills}
      ${campingStylePills}
      ${entries
        .map(
          (entry) => `
            <p class="campground-fact">
              <span class="campground-fact-label">${escapeHtml(entry.label)}:</span>
              <span>${escapeHtml(entry.value)}</span>
            </p>
          `
        )
        .join("")}
    </div>
  `;
}

function getLocationVisibilityLabel(location) {
  if (!location) {
    return "Known place";
  }

  if (location.editorial?.priority === "hidden_gem") {
    return "Hidden gem";
  }

  if (
    ["sightseeing/miradouro/place-with-view", "beach", "natural park"].includes(location.type) &&
    !["anchor", "practical"].includes(location.editorial?.priority)
  ) {
    return "Touristic";
  }

  return "Known place";
}

function getLocationVisibilityMeta(location) {
  const label = getLocationVisibilityLabel(location);
  const lookup = {
    "Hidden gem": { icon: "💎", tone: "hidden-gem" },
    "Known place": { icon: "📍", tone: "known-place" },
    Touristic: { icon: "✨", tone: "touristic" },
  };
  const match = lookup[label] || lookup["Known place"];
  return {
    label,
    icon: match.icon,
    tone: match.tone,
  };
}

function renderLocationCategoryLine(location, categoryOverride = "") {
  const taxonomy = getLocationTaxonomy(location);
  const icon = taxonomy.icon;
  const label = categoryOverride || taxonomy.label;

  return `
    <div class="itinerary-location-category">
      <span class="itinerary-location-category-icon" aria-hidden="true">${icon}</span>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function buildStopMeta(stop, location) {
  return [getLocationTaxonomyLabel(location), location.region || location.country]
    .filter(Boolean)
    .join(" • ");
}

function humanizeLocationType(value) {
  return value ? value.replace(/\//g, " / ") : "";
}

function getLocationAreaLabel(location) {
  if (!location) {
    return "";
  }

  const cleanedName = normalizeAreaLabel(location.name);
  const regionLabel = simplifyRegionLabel(location.region);
  const conciseName = cleanedName && cleanedName.split(/\s+/).length <= 3;
  const geographicName = /\b(coast|delta|cabo|beach|park|gorge|valley)\b/i.test(cleanedName);

  if (!cleanedName) {
    return regionLabel || location.country || "";
  }

  if (!regionLabel || cleanedName.toLowerCase().includes(regionLabel.toLowerCase())) {
    return cleanedName;
  }

  if (isLodgingType(location.type) && !conciseName && !geographicName) {
    return regionLabel;
  }

  return cleanedName;
}

function simplifyRegionLabel(region) {
  const overrides = {
    "Provence-Alpes-Cote d'Azur": "Provence",
    "Auvergne-Rhone-Alpes": "Rhone-Alpes",
    "Valencian Community": "Valencia",
    "Castile and León": "Castile and Leon",
    "Nouvelle-Aquitaine": "Atlantic France",
    "Basque Country": "Basque Country",
    Andalusia: "Andalusia",
  };

  return overrides[region] || region || "";
}

function normalizeAreaLabel(name) {
  return String(name || "")
    .replace(/\b(camping|campground|huttopia|wecamp|orbitur|hotel|home arrival)\b/gi, "")
    .replace(/\b(arrival|transfer|base|day|camp)\b/gi, "")
    .replace(/[—-].*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isLodgingType(type) {
  return ["campground", "hotel"].includes(type);
}

function renderDayStopCards(stops, options = {}) {
  const resolvedStops = Array.isArray(stops) ? stops : [];

  if (!resolvedStops.length) {
    return emptyState("No mapped stops for this day yet.");
  }

  return resolvedStops
    .map((stop, index) => {
      const location = getItineraryLocation(stop.location_id);
      if (!location) {
        return "";
      }
      const summary = getLocationSummaryText(location, stop.note || "");
      const canRemoveWaypoint =
        options.allowWaypointRemoval === true &&
        options.movementId &&
        !["wake", "sleep"].includes(stop.role) &&
        isSelectedRouteWaypoint(options.movementId, location.id);

      return `
        <article class="itinerary-stop-entry">
          <div class="itinerary-stop-row">
            ${renderLocationStopButton(location, summary)}
            ${
              canRemoveWaypoint
                ? `
                  <button
                    class="mini-button itinerary-stop-action itinerary-stop-action-icon"
                    type="button"
                    data-remove-route-waypoint
                    data-route-option-movement-id="${escapeHtml(options.movementId)}"
                    data-route-location-id="${escapeHtml(location.id)}"
                    aria-label="Remove waypoint"
                    title="Remove waypoint"
                  >
                    −
                  </button>
                `
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLocationStopButton(location, summary = "") {
  return `
    <button
      class="itinerary-stop-card ${state.selectedPlaceId === location.id ? "active" : ""}"
      type="button"
      data-place-id="${escapeHtml(location.id)}"
      data-highlight-place-id="${escapeHtml(location.id)}"
    >
      <div class="itinerary-stop-media">
        <img src="${escapeAttribute(location.photo_url)}" alt="${escapeAttribute(location.photo_alt || location.name)}" loading="lazy" />
      </div>
      <div class="itinerary-stop-copy">
        <p class="itinerary-stop-title">${escapeHtml(location.name)}</p>
        ${summary ? `<p class="itinerary-stop-description">${escapeHtml(summary)}</p>` : ""}
      </div>
    </button>
  `;
}

function renderRouteSuggestionCards(suggestions, movementId) {
  return suggestions
    .map(({ location, distance_km }) => {
      const summary = getLocationSummaryText(location, `${formatDistance(distance_km)} from route`);

      return `
        <article class="itinerary-stop-entry">
          <div class="itinerary-stop-row">
            ${renderLocationStopButton(location, summary)}
            <button
              class="mini-button itinerary-stop-action itinerary-stop-action-icon"
              type="button"
              data-add-route-waypoint
              data-route-option-movement-id="${escapeHtml(movementId)}"
              data-route-location-id="${escapeHtml(location.id)}"
              aria-label="Add to route"
              title="Add to route"
            >
              +
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderNearbySuggestionCards(suggestions) {
  return suggestions
    .map((suggestion) => {
      const location = getItineraryLocation(suggestion.location_id);
      if (!location) {
        return "";
      }
      const summary = getLocationSummaryText(location, suggestion.note || "");

      return `
        <article class="itinerary-stop-entry">
          <button
            class="itinerary-stop-card ${state.selectedPlaceId === location.id ? "active" : ""}"
            type="button"
            data-place-id="${escapeHtml(location.id)}"
          >
            <div class="itinerary-stop-media">
              <img src="${escapeAttribute(location.photo_url)}" alt="${escapeAttribute(location.photo_alt || location.name)}" loading="lazy" />
            </div>
            <div class="itinerary-stop-copy">
              <p class="itinerary-stop-title">${escapeHtml(location.name)}</p>
              ${summary ? `<p class="itinerary-stop-description">${escapeHtml(summary)}</p>` : ""}
            </div>
          </button>
        </article>
      `;
    })
    .join("");
}

function getDayDriveStops(day, movement = getDayDriveMovement(day)) {
  const driveMovement = movement;
  if (!driveMovement) {
    return [];
  }

  const stops = [];
  const seen = new Set();
  const pushStop = (stop) => {
    if (!stop?.location_id || seen.has(stop.id || `${stop.location_id}:${stop.role}`)) {
      return;
    }
    seen.add(stop.id || `${stop.location_id}:${stop.role}`);
    stops.push(stop);
  };

  if (day.wake_location_id) {
    pushStop({
      id: `${day.id}_wake_render`,
      location_id: day.wake_location_id,
      role: "wake",
      category: "wake",
      note: "Wake up here",
    });
  }

  (
    getSelectedRouteOption(driveMovement, {
      fetchSelectedGoogle: false,
      fetchUnselectedGoogle: false,
    })?.waypoints ||
    driveMovement.route?.waypoints ||
    []
  ).forEach(
    (waypoint) => {
    pushStop({
      id: waypoint.id,
      location_id: waypoint.location_id,
      role: waypoint.role,
      category: waypoint.role,
      note: waypoint.notes || waypoint.title || "",
    });
    }
  );

  if (day.sleep_location_id) {
    pushStop({
      id: `${day.id}_sleep_render`,
      location_id: day.sleep_location_id,
      role: "sleep",
      category: "sleep",
      note: "Sleep here",
    });
  }

  return stops;
}

function getSelectedRawRouteOption(movement) {
  const options = Array.isArray(movement?.route_options) ? movement.route_options : [];
  return options.find((option) => option.is_selected) || options[0] || null;
}

function isSelectedRouteWaypoint(movementId, locationId) {
  const day = getSelectedItineraryDay();
  const movement = (day?.movements || []).find((entry) => entry.id === movementId);
  const option = getSelectedRawRouteOption(movement);
  return Boolean(
    locationId &&
      Array.isArray(option?.waypoints) &&
      option.waypoints.some((waypoint) => waypoint.location_id === locationId)
  );
}

function getRouteNearbyLocationSuggestions(movement, radiusKm = 20, limit = 12) {
  if (!movement) {
    return [];
  }

  const selectedOption = getSelectedRouteOption(movement, {
    fetchSelectedGoogle: true,
    fetchUnselectedGoogle: false,
  });
  const routeLine =
    selectedOption?.line?.length >= 2
      ? selectedOption.line
      : buildFallbackMovementLine(
          movement,
          selectedOption?.waypoints?.length ? selectedOption.waypoints : movement.route?.waypoints || []
        );

  if (!routeLine.length) {
    return [];
  }

  const excludedLocationIds = new Set([
    movement.start_location_id,
    movement.end_location_id,
    ...(selectedOption?.waypoints || []).map((waypoint) => waypoint.location_id),
  ].filter(Boolean));

  return getAllExplorerLocations()
    .filter((location) => {
      if (!location?.id || excludedLocationIds.has(location.id)) {
        return false;
      }
      return Number.isFinite(location.coordinates?.lat) && Number.isFinite(location.coordinates?.lng);
    })
    .map((location) => ({
      location,
      distance_km: distanceLocationToRouteKm(location, routeLine),
    }))
    .filter((entry) => Number.isFinite(entry.distance_km) && entry.distance_km <= radiusKm)
    .sort((left, right) => left.distance_km - right.distance_km)
    .slice(0, limit);
}

function distanceLocationToRouteKm(location, routeLine = []) {
  const point = {
    lat: location.coordinates.lat,
    lng: location.coordinates.lng,
  };
  const line = (routeLine || []).filter((entry) => Number.isFinite(entry?.lat) && Number.isFinite(entry?.lng));

  if (line.length === 1) {
    return haversineDistanceKm(point, line[0]);
  }

  let bestDistance = Infinity;
  for (let index = 0; index < line.length - 1; index += 1) {
    bestDistance = Math.min(bestDistance, distancePointToSegmentKm(point, line[index], line[index + 1]));
  }
  return bestDistance;
}

function distancePointToSegmentKm(point, start, end) {
  const originLat = ((point.lat + start.lat + end.lat) / 3) * Math.PI / 180;
  const toXY = (entry) => ({
    x: entry.lng * Math.cos(originLat) * 111.32,
    y: entry.lat * 110.57,
  });
  const p = toXY(point);
  const a = toXY(start);
  const b = toXY(end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (!lengthSquared) {
    return haversineDistanceKm(point, start);
  }

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  const projection = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };
  return Math.hypot(p.x - projection.x, p.y - projection.y);
}

function haversineDistanceKm(left, right) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => value * Math.PI / 180;
  const dLat = toRadians(right.lat - left.lat);
  const dLng = toRadians(right.lng - left.lng);
  const lat1 = toRadians(left.lat);
  const lat2 = toRadians(right.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDayStayStops(day) {
  const stops = [];
  const seen = new Set();
  const pushStop = (stop) => {
    if (!stop?.location_id || seen.has(stop.id || `${stop.location_id}:${stop.role}`)) {
      return;
    }
    seen.add(stop.id || `${stop.location_id}:${stop.role}`);
    stops.push(stop);
  };

  if (day.sleep_location_id) {
    pushStop({
      id: `${day.id}_sleep_stay`,
      location_id: day.sleep_location_id,
      role: "sleep",
      category: "sleep",
      note: "Stay here",
    });
  } else if (day.wake_location_id) {
    pushStop({
      id: `${day.id}_wake_stay`,
      location_id: day.wake_location_id,
      role: "sleep",
      category: "sleep",
      note: "Stay here",
    });
  }

  getDayNearbySuggestionStops(day).forEach(pushStop);
  return stops;
}

function getDayNearbySuggestionStops(day) {
  return getDayNearbySuggestions(day)
    .map((suggestion, index) => ({
      id: `${day.id}_nearby_${index + 1}`,
      location_id: suggestion.location_id,
      role: suggestion.access_mode || "nearby",
      category: suggestion.category || "",
      note: suggestion.note || "",
      access_mode: suggestion.access_mode,
      suggested_duration_minutes: suggestion.suggested_duration_minutes || null,
    }))
    .filter((suggestion) => suggestion.location_id);
}

function getDayNearbySuggestions(day) {
  if (!day) {
    return [];
  }
  if (Array.isArray(day.nearby_suggestions) && day.nearby_suggestions.length) {
    return day.nearby_suggestions;
  }
  if (Array.isArray(day.base?.nearby_locations)) {
    return day.base.nearby_locations.map((locationId) => ({
      location_id: locationId,
      note: "",
    }));
  }
  return [];
}

function getDayRenderableStops(day, mode = "all") {
  if (mode === "drive") {
    return getDayDriveStops(day);
  }

  if (mode === "stay") {
    return getDayStayStops(day);
  }

  const stops = [];
  const seen = new Set();

  [...getDayDriveStops(day), ...getDayNearbySuggestionStops(day)].forEach((stop) => {
    const key = stop.id || `${stop.location_id}:${stop.role}`;
    if (!stop.location_id || seen.has(key)) {
      return;
    }
    seen.add(key);
    stops.push(stop);
  });

  return stops;
}

function getItineraryLocation(locationId) {
  return state.itinerary?.locations?.find((location) => location.id === locationId) || null;
}

function clonePlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function getWorkingItinerary() {
  return state.itinerary?.working_itinerary || null;
}

function getActiveWorkingStays() {
  return (getWorkingItinerary()?.stays || []).filter((stay) => stay.status !== "removed");
}

function getStayForDay(day) {
  const stays = getActiveWorkingStays();
  if (!day || !stays.length) {
    return null;
  }

  return stays.find((stay) => {
    const startDay = Number.isFinite(stay.start_day) ? stay.start_day : 1;
    const nights = Number.isFinite(stay.nights) ? stay.nights : 1;
    return day.day_number >= startDay && day.day_number < startDay + nights;
  }) || null;
}

function deriveWorkingStaysFromDays(days = []) {
  const stays = [];
  let currentStay = null;

  (days || []).forEach((day) => {
    const overnightLocationId = day.sleep_location_id || day.wake_location_id;
    if (!overnightLocationId) {
      return;
    }

    if (currentStay && currentStay.overnight_location_id === overnightLocationId) {
      currentStay.nights += 1;
      currentStay.nearby_location_ids = [
        ...new Set([
          ...(currentStay.nearby_location_ids || []),
          ...getDayNearbySuggestions(day).map((suggestion) => suggestion.location_id).filter(Boolean),
        ]),
      ];
      return;
    }

    currentStay = {
      id: `stay_${String(stays.length + 1).padStart(2, "0")}_${overnightLocationId.replace(/^location_/, "").slice(0, 48)}`,
      title: "",
      base_location_id: overnightLocationId,
      overnight_location_id: overnightLocationId,
      campground_location_id: null,
      start_day: day.day_number || stays.length + 1,
      start_date: day.date || "",
      nights: 1,
      status: "active",
      locked: Boolean(day.locked),
      nearby_location_ids: getDayNearbySuggestions(day)
        .map((suggestion) => suggestion.location_id)
        .filter(Boolean),
      notes: "",
    };
    stays.push(currentStay);
  });

  return stays;
}

function recalculateWorkingItinerary(options = {}) {
  const working = getWorkingItinerary();
  if (!working) {
    return;
  }

  const previousSelectedDayNumber = getSelectedItineraryDay()?.day_number || 1;
  const baseDays = state.itinerary?.base_itinerary?.days || working.days || [];
  const activeStays = getActiveWorkingStays();
  let nextDayNumber = 1;
  const originalStartLocationId = getBaseItineraryStartLocationId(baseDays);
  const originalEndLocationId = getBaseItineraryEndLocationId(baseDays);
  let previousSleepLocationId = originalStartLocationId || null;
  let currentDate = parseLocalDate(activeStays[0]?.start_date || baseDays[0]?.date || "");
  const nextDays = [];

  activeStays.forEach((stay) => {
    stay.start_day = nextDayNumber;
    stay.start_date = currentDate ? formatDateKey(currentDate) : stay.start_date || "";
    stay.nights = Math.max(1, Number.isFinite(stay.nights) ? Math.round(stay.nights) : 1);

    for (let offset = 0; offset < stay.nights; offset += 1) {
      const template = clonePlainObject(baseDays[nextDayNumber - 1] || {});
      const wakeLocationId = previousSleepLocationId || stay.overnight_location_id;
      const sleepLocationId = stay.overnight_location_id;
      const isTransferDay = offset === 0 && previousSleepLocationId && previousSleepLocationId !== sleepLocationId;
      const templateDrive = getDayDriveMovement(template);
      const movements = isTransferDay
        ? [buildWorkingDriveMovement(templateDrive, wakeLocationId, sleepLocationId, nextDayNumber)]
        : [];

      nextDays.push({
        ...template,
        id: template.id || `day_${String(nextDayNumber).padStart(2, "0")}`,
        day_number: nextDayNumber,
        date: currentDate ? formatDateKey(currentDate) : template.date || "",
        wake_location_id: wakeLocationId,
        sleep_location_id: sleepLocationId,
        note: stay.notes || template.note || template.summary || "",
        summary: stay.notes || template.summary || template.note || "",
        base: buildDayBase(stay, wakeLocationId, sleepLocationId),
        movements,
        locked: Boolean(stay.locked),
      });

      previousSleepLocationId = sleepLocationId;
      nextDayNumber += 1;
      if (currentDate) {
        currentDate = addDays(currentDate, 1);
      }
    }
  });

  if (
    originalEndLocationId &&
    previousSleepLocationId &&
    previousSleepLocationId !== originalEndLocationId
  ) {
    const template = clonePlainObject(baseDays[nextDayNumber - 1] || baseDays[baseDays.length - 1] || {});
    nextDays.push({
      ...template,
      id: template.id || `day_${String(nextDayNumber).padStart(2, "0")}`,
      day_number: nextDayNumber,
      date: currentDate ? formatDateKey(currentDate) : template.date || "",
      wake_location_id: previousSleepLocationId,
      sleep_location_id: originalEndLocationId,
      note: template.note || template.summary || "Return to trip endpoint.",
      summary: template.summary || template.note || "Return to trip endpoint.",
      base: {
        anchor: "sleep",
        nearby_locations: [],
      },
      movements: [
        buildWorkingDriveMovement(getDayDriveMovement(template), previousSleepLocationId, originalEndLocationId, nextDayNumber),
      ],
      locked: false,
    });
  }

  working.days = nextDays;
  working.locks = buildWorkingLocks(working);
  working.metadata = buildWorkingMetadata(working);
  state.itinerary.days = working.days;

  if (options.preserveSelectedDay !== false) {
    const nextSelectedDay =
      working.days.find((day) => day.day_number === previousSelectedDayNumber) ||
      working.days[working.days.length - 1];
    state.selectedDayId = nextSelectedDay?.id || null;
  }
}

function buildDayBase(stay, wakeLocationId, sleepLocationId) {
  const anchor = sleepLocationId === stay.overnight_location_id ? "sleep" : "wake";
  return {
    anchor,
    nearby_locations: normalizeIdList(stay.nearby_location_ids),
  };
}

function buildWorkingDriveMovement(templateDrive, startLocationId, endLocationId, dayNumber) {
  const movement = clonePlainObject(templateDrive || {});
  const keepsTemplateRoute =
    movement.mode === "car" &&
    movement.start_location_id === startLocationId &&
    movement.end_location_id === endLocationId;

  if (!keepsTemplateRoute) {
    const optionId = `day_${String(dayNumber).padStart(2, "0")}_drive_fast`;
    return {
      id: `day_${String(dayNumber).padStart(2, "0")}_drive`,
      mode: "car",
      summary: "Transfer to next stay.",
      start_location_id: startLocationId,
      end_location_id: endLocationId,
      distance_km: null,
      duration_minutes: null,
      route_options: [
        {
          id: optionId,
          style: "fast",
          summary: "Direct route between the selected stays.",
          distance_km: null,
          duration_minutes: null,
          open_route_url: "",
          is_selected: true,
          waypoints: [],
        },
      ],
      route: {
        open_route_url: "",
        waypoints: [],
      },
    };
  }

  return {
    id: movement.id || `day_${String(dayNumber).padStart(2, "0")}_drive`,
    mode: "car",
    summary: movement.summary || "Transfer to next stay.",
    start_location_id: startLocationId,
    end_location_id: endLocationId,
    distance_km: Number.isFinite(movement.distance_km) ? movement.distance_km : null,
    duration_minutes: Number.isFinite(movement.duration_minutes) ? movement.duration_minutes : null,
    route_options: Array.isArray(movement.route_options) ? movement.route_options : [],
    route: {
      open_route_url: movement.route?.open_route_url || "",
      waypoints: Array.isArray(movement.route?.waypoints) ? movement.route.waypoints : [],
    },
  };
}

function getBaseItineraryStartLocationId(baseDays = []) {
  const firstDay = (baseDays || []).find((day) => day?.wake_location_id || day?.sleep_location_id);
  return firstDay?.wake_location_id || firstDay?.sleep_location_id || null;
}

function getBaseItineraryEndLocationId(baseDays = []) {
  const days = Array.isArray(baseDays) ? baseDays : [];
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (day?.sleep_location_id || day?.wake_location_id) {
      return day.sleep_location_id || day.wake_location_id;
    }
  }
  return null;
}

function buildWorkingLocks(working) {
  return {
    days: (working.days || [])
      .filter((day) => day.locked)
      .map((day) => ({ day_id: day.id, type: "date_and_content", reason: "Locked in planning editor" })),
    stays: (working.stays || [])
      .filter((stay) => stay.locked)
      .map((stay) => ({ stay_id: stay.id, type: "date_and_content", reason: "Locked in planning editor" })),
  };
}

function buildWorkingMetadata(working) {
  const activeStays = (working.stays || []).filter((stay) => stay.status !== "removed");
  const days = working.days || [];
  return {
    total_nights: activeStays.reduce((sum, stay) => sum + (Number.isFinite(stay.nights) ? stay.nights : 0), 0),
    total_days: days.length,
    drive_days: days.filter((day) => getDayDriveMovement(day)).length,
    campground_nights: activeStays.reduce((sum, stay) => {
      const taxonomy = getLocationTaxonomy(getItineraryLocation(stay.overnight_location_id)).id;
      return sum + (taxonomy === "campground" ? stay.nights : 0);
    }, 0),
    hotel_nights: activeStays.reduce((sum, stay) => {
      const taxonomy = getLocationTaxonomy(getItineraryLocation(stay.overnight_location_id)).id;
      return sum + (taxonomy === "hotel" ? stay.nights : 0);
    }, 0),
  };
}

function updateWorkingStay(stayId, patch) {
  const stay = getWorkingItinerary()?.stays?.find((entry) => entry.id === stayId);
  const onlyLockChange = patch && Object.keys(patch).length === 1 && Object.prototype.hasOwnProperty.call(patch, "locked");
  if (!stay || (stay.locked && !onlyLockChange)) {
    return;
  }
  Object.assign(stay, patch);
  recalculateWorkingItinerary();
  state.selectedPlaceId = stay.overnight_location_id;
  scheduleAutosave();
  renderAll();
}

function addWorkingStayAfter(stayId) {
  const working = getWorkingItinerary();
  if (!working) {
    return;
  }
  const stays = working.stays || [];
  const index = Math.max(0, stays.findIndex((stay) => stay.id === stayId));
  const sourceStay = stays[index] || stays[stays.length - 1];
  const locationId = state.selectedPlaceId && state.placesById.has(state.selectedPlaceId)
    ? state.selectedPlaceId
    : sourceStay?.overnight_location_id;
  const nextStay = {
    id: `stay_${Date.now().toString(36)}`,
    title: "",
    base_location_id: locationId,
    overnight_location_id: locationId,
    campground_location_id: null,
    start_day: (sourceStay?.start_day || index + 1) + (sourceStay?.nights || 1),
    start_date: "",
    nights: 1,
    status: "candidate",
    locked: false,
    nearby_location_ids: [],
    notes: "",
  };
  stays.splice(index + 1, 0, nextStay);
  recalculateWorkingItinerary();
  state.selectedDayId = working.days.find((day) => day.day_number === nextStay.start_day)?.id || state.selectedDayId;
  state.selectedPlaceId = nextStay.overnight_location_id;
  scheduleAutosave();
  renderAll();
}

function removeWorkingStay(stayId) {
  const stay = getWorkingItinerary()?.stays?.find((entry) => entry.id === stayId);
  if (!stay || stay.locked || getActiveWorkingStays().length <= 1) {
    return;
  }
  stay.status = "removed";
  recalculateWorkingItinerary();
  scheduleAutosave();
  renderAll();
}

function saveWorkingItineraryVersion() {
  const working = getWorkingItinerary();
  if (!working) {
    return;
  }
  const version = {
    id: `draft_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    name: `Draft ${state.itineraryVersions.length + 1}`,
    created_at: new Date().toISOString(),
    based_on_version_id: state.activeVersionId || state.itinerary?.version_id || "",
    summary: "Saved from planning editor.",
    working_itinerary: clonePlainObject(working),
    metrics: clonePlainObject(working.metadata || buildWorkingMetadata(working)),
  };
  state.itineraryVersions.push(version);
  state.itinerary.itinerary_versions = state.itineraryVersions;
  state.selectedPlanningVersionId = version.id;
  scheduleAutosave();
  renderSchedule();
}

function resetWorkingItineraryFromBase() {
  if (!state.itinerary?.base_itinerary?.days?.length) {
    return;
  }

  const baseDays = clonePlainObject(state.itinerary.base_itinerary.days);
  const workingId = state.itinerary.working_itinerary?.id || `${state.itinerary.version_id || state.activeVersionId || "v1"}_working`;
  state.itinerary.working_itinerary = {
    id: workingId,
    based_on_itinerary_id: state.itinerary.base_itinerary.id,
    stays: deriveWorkingStaysFromDays(baseDays),
    days: baseDays,
    locks: { days: [], stays: [] },
    metadata: {},
  };
  state.itineraryVersions = [];
  state.itinerary.itinerary_versions = [];
  state.selectedPlanningVersionId = "";
  recalculateWorkingItinerary({ preserveSelectedDay: false });
  const firstDay = getItineraryDays()[0] || null;
  state.selectedDayId = firstDay?.id || null;
  syncDayDetailMode(firstDay, { forceDefault: true });
  syncSelectedPlaceForDay(firstDay, { force: true });
  state.pendingMapOverview = true;
  state.mapFocus = "overview";
  state.activeTooltipPlaceId = null;
  state.decisions = new Map();
  clearPlanningDraft();
  setSaveStatus("No local edits");
  renderAll();
}

function getItineraryDays() {
  return state.itinerary?.working_itinerary?.days || state.itinerary?.days || [];
}

function getSelectedItineraryDay() {
  const days = getItineraryDays();
  return days.find((day) => day.id === state.selectedDayId) || days[0] || null;
}

function syncSelectedPlaceForDay(day, options = {}) {
  const force = options.force === true;
  if (!day) {
    return;
  }

  const stopPlaceIds = getDayRenderableStops(day, options.mode || state.selectedDayDetailMode)
    .map((stop) => stop.location_id)
    .filter((placeId) => placeId && state.placesById.has(placeId));

  if (!force && stopPlaceIds.includes(state.selectedPlaceId)) {
    return;
  }

  state.selectedPlaceId =
    stopPlaceIds[0] || day.sleep_location_id || day.wake_location_id || state.selectedPlaceId;
}

function selectItineraryDay(dayId, options = {}) {
  const nextDay = getItineraryDays().find((day) => day.id === dayId);
  if (!nextDay) {
    return;
  }

  const didChange = state.selectedDayId !== nextDay.id;
  state.selectedDayId = nextDay.id;
  if (didChange) {
    state.pendingMapOverview = false;
  }
  if (options.focusMap !== false) {
    state.mapFocus = "day";
  }
  state.activeTooltipPlaceId = null;
  if (!movementExistsInDay(nextDay, state.selectedMovementId)) {
    state.selectedMovementId = null;
  }
  syncDayDetailMode(nextDay, { forceDefault: didChange });

  syncSelectedPlaceForDay(nextDay, {
    force: options.forcePlaceSelection !== false,
    mode: state.selectedDayDetailMode,
  });

  renderSchedule();
  renderMap();

  if (state.mapFocus !== "day") {
    return;
  }

  if (state.selectedDayDetailMode === "drive") {
    const driveMovement = getDayDriveMovement(nextDay);
    if (driveMovement) {
      focusMovementOnMap(driveMovement);
      return;
    }
  }

  focusDayLocationsOnMap(nextDay);
}

function selectMovement(movementId) {
  const day = getSelectedItineraryDay();
  const movement = (day?.movements || []).find((entry) => entry.id === movementId);
  if (!movement) {
    return;
  }

  state.selectedMovementId = movement.id;
  state.selectedDayDetailMode = "drive";
  state.activeTooltipPlaceId = null;
  syncSelectedPlaceForDay(day, {
    force: true,
    mode: "drive",
  });
  renderSchedule();
  renderMap();
  focusMovementOnMap(movement);
}

function renderMap() {
  if (state.itinerary?.days?.length) {
    if (state.mapFocus === "overview") {
      renderItineraryOverviewMap();
    } else {
      renderItineraryMap();
    }
    return;
  }

  const plottedPlaces = state.usedPlaceIds
    .map((placeId) => state.placesById.get(placeId))
    .filter((place) => place && place.latitude !== null && place.longitude !== null);

  if (!state.map || !plottedPlaces.length) {
    state.routeBounds = null;
    return;
  }

  clearMapLayers();

  const bounds = [];

  for (const edge of state.edgesById.values()) {
    const fromPlace = state.placesById.get(resolvePlaceIdFromNode(edge.from_node_id));
    const toPlace = state.placesById.get(resolvePlaceIdFromNode(edge.to_node_id));
    const coordinates = resolveEdgeMapCoordinates(edge, fromPlace, toPlace);
    if (!coordinates) {
      continue;
    }
    coordinates.forEach((coordinate) => bounds.push(coordinate));

    const polyline = L.polyline(coordinates, {
      color: "#1d282a",
      weight: 5,
      opacity: 0.52,
      dashArray: edge.edge_type === "scenic_detour" ? "8 8" : null,
    }).addTo(state.map);

    if (edge.summary) {
      polyline.bindTooltip(edge.summary);
    }

    state.mapLayers.polylines.push(polyline);
  }

  plottedPlaces.forEach((place) => {
    const marker = L.circleMarker([place.latitude, place.longitude], {
      radius: state.selectedPlaceId === place.id ? 9 : 7,
      color: "#ffffff",
      weight: 2,
      fillColor: markerFill(place.id),
      fillOpacity: 0.95,
    }).addTo(state.map);

    marker.on("click", () => {
      state.selectedPlaceId = place.id;
      renderSchedule();
      renderMap();
    });

    marker.bindPopup(`
      <strong>${escapeHtml(place.name)}</strong><br/>
      ${escapeHtml(place.category || getLocationTaxonomyLabel(place))}
    `);

    bounds.push([place.latitude, place.longitude]);
    state.mapLayers.markers.push(marker);
  });

  state.routeBounds = bounds.length ? L.latLngBounds(bounds) : null;

  if (state.activeView === "map" && state.pendingMapOverview) {
    fitMapToRouteOverview();
  }
}

function renderLocationOverlayMarkers() {
  if (!state.map || state.locationsExplorer.enabled !== true) {
    return;
  }

  getFilteredExplorerLocations().forEach((location) => {
    if (!Number.isFinite(location?.coordinates?.lat) || !Number.isFinite(location?.coordinates?.lng)) {
      return;
    }

    if (state.mapLayers.markerByPlaceId.has(location.id)) {
      return;
    }

    const isSelected = state.selectedPlaceId === location.id;
    const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
      icon: L.divIcon({
        className: "day-stop-marker-shell",
        html: `
          <div class="day-stop-marker is-overlay ${isSelected ? "is-selected" : ""}">
            <span class="day-stop-marker-icon" aria-hidden="true">${iconForLocationType(location)}</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    }).addTo(state.map);

    state.mapLayers.markerByPlaceId.set(location.id, marker);
    state.mapLayers.markers.push(marker);

    marker.on("click", () => {
      state.selectedPlaceId = location.id;
      state.activeTooltipPlaceId = location.id;
      renderSchedule();
      renderMap();
    });
  });
}

function renderItineraryOverviewMap() {
  const days = getItineraryDays();
  if (!state.map || !days.length) {
    state.routeBounds = null;
    state.renderedMapDayId = null;
    return;
  }

  clearMapLayers();
  closeSelectedPlaceTooltip({ clearSelection: false });

  const bounds = [];
  const overviewGroups = buildOverviewDayGroups(days);

  days.forEach((day) => {
    const driveMovement = getDayDriveMovement(day);
    const selectedOption = driveMovement
      ? getSelectedRouteOption(driveMovement, {
          fetchSelectedGoogle: true,
          fetchUnselectedGoogle: false,
        })
      : null;
    const coordinates = (selectedOption?.line || [])
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .map((point) => [point.lat, point.lng]);

    if (coordinates.length >= 2) {
      const polyline = L.polyline(coordinates, {
        color: day.id === state.selectedDayId ? "#1d4ed8" : "#4b7bec",
        weight: day.id === state.selectedDayId ? 5 : 4,
        opacity: day.id === state.selectedDayId ? 0.82 : 0.52,
      }).addTo(state.map);

      coordinates.forEach((coordinate) => bounds.push(coordinate));
      state.mapLayers.polylines.push(polyline);
    }
  });

  overviewGroups.forEach((group) => {
    const anchorLocation = group.anchorLocation;
    if (!anchorLocation || anchorLocation.coordinates.lat == null || anchorLocation.coordinates.lng == null) {
      return;
    }

    const marker = L.marker([anchorLocation.coordinates.lat, anchorLocation.coordinates.lng], {
      icon: L.divIcon({
        className: "day-stop-marker-shell",
        html: `
          <div class="trip-day-marker ${group.isSelected ? "is-selected" : ""}">
            <span class="trip-day-marker-stop-badge">${escapeHtml(group.label)}</span>
            <span class="trip-day-marker-count">${escapeHtml(String(group.days.length))}</span>
          </div>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      }),
    }).addTo(state.map);

    marker.on("click", () => {
      selectItineraryDay(group.focusDayId, { focusMap: true });
    });

    marker.bindPopup(`
      <strong>${escapeHtml(group.popupLabel)}</strong><br/>
      ${escapeHtml(getDaySheetTitle(group.popupDay))}
    `);

    bounds.push([anchorLocation.coordinates.lat, anchorLocation.coordinates.lng]);
    state.mapLayers.markers.push(marker);
  });

  renderLocationOverlayMarkers();

  state.routeBounds = bounds.length ? L.latLngBounds(bounds) : null;

  if (state.routeBounds?.isValid?.() && state.pendingMapOverview) {
    animateMapToBounds(state.routeBounds, {
      paddingTopLeft: [24, 84],
      paddingBottomRight: [24, 48],
      duration: 0.84,
    });
  }

  state.renderedMapDayId = null;
  state.pendingMapOverview = false;
  syncSelectedPlaceTooltip();
}

function renderItineraryMap() {
  const selectedDay = getSelectedItineraryDay();
  const selectedMovement = getSelectedMovementForDay(selectedDay);
  const driveMovement = getDayDriveMovement(selectedDay);

  if (!state.map || !selectedDay) {
    state.routeBounds = null;
    state.renderedMapDayId = null;
    return;
  }

  clearMapLayers();

  const bounds = [];

  if (state.selectedDayDetailMode === "drive" && driveMovement) {
    const routeOptions = getRenderableRouteOptions(driveMovement, {
      fetchSelectedGoogle: true,
      fetchUnselectedGoogle: true,
    });

    routeOptions.forEach((option) => {
      const coordinates = (option.line || [])
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .map((point) => [point.lat, point.lng]);
      if (coordinates.length < 2) {
        return;
      }

      const polyline = L.polyline(coordinates, {
        color: option.is_selected ? "#1647d1" : "#9db5ff",
        weight: option.is_selected ? 7 : 4,
        opacity: option.is_selected ? 0.96 : 0.58,
      }).addTo(state.map);

      if (option.summary) {
        polyline.bindTooltip(option.summary);
      }

      coordinates.forEach((coordinate) => bounds.push(coordinate));
      state.mapLayers.polylines.push(polyline);
    });
  } else {
    (selectedDay.movements || [])
      .filter((movement) => movement.mode !== "car")
      .forEach((movement) => {
        const coordinates = buildFallbackMovementLine(movement, movement.route?.waypoints || [])
          .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
          .map((point) => [point.lat, point.lng]);

        if (coordinates.length >= 2) {
          const polyline = L.polyline(coordinates, {
            color: "#7aa2f7",
            weight: 4,
            opacity: 0.5,
            dashArray: "8 8",
          }).addTo(state.map);

          if (movement.summary) {
            polyline.bindTooltip(movement.summary);
          }

          coordinates.forEach((coordinate) => bounds.push(coordinate));
          state.mapLayers.polylines.push(polyline);
        }
      });
  }

  getDayRenderableStops(selectedDay, state.selectedDayDetailMode).forEach((stop, index) => {
    const location = getItineraryLocation(stop.location_id);
    if (!location || location.coordinates.lat == null || location.coordinates.lng == null) {
      return;
    }

    const isSelected = state.selectedPlaceId === location.id;
    const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
      icon: L.divIcon({
        className: "day-stop-marker-shell",
        html: `
          <div class="day-stop-marker ${isSelected ? "is-selected" : ""}">
            <span class="day-stop-marker-icon" aria-hidden="true">${iconForLocationType(location)}</span>
            <span class="day-stop-marker-badge">${index + 1}</span>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      }),
    }).addTo(state.map);
    state.mapLayers.markerByPlaceId.set(location.id, marker);

    marker.on("click", () => {
      state.selectedPlaceId = location.id;
      state.activeTooltipPlaceId = location.id;
      renderSchedule();
      renderMap();
      panMapToSelectedLocation({ preserveTooltip: true });
    });

    marker.bindPopup(`
      <strong>${escapeHtml(location.name)}</strong><br/>
      ${escapeHtml(stop.note || location.address || getLocationTaxonomyLabel(location))}
    `);

    bounds.push([location.coordinates.lat, location.coordinates.lng]);
    state.mapLayers.markers.push(marker);
  });

  if (state.selectedDayDetailMode === "drive" && driveMovement) {
    renderRouteSuggestionMarkers(getRouteNearbyLocationSuggestions(driveMovement));
  }

  renderLocationOverlayMarkers();

  state.routeBounds = bounds.length ? L.latLngBounds(bounds) : null;

  if (state.routeBounds?.isValid?.() && (state.pendingMapOverview || state.renderedMapDayId !== selectedDay.id)) {
    animateMapToBounds(state.routeBounds, {
      paddingTopLeft: [24, 84],
      paddingBottomRight: window.innerWidth <= 820 ? [24, 340] : [380, 48],
      duration: 0.78,
    });
  }

  state.renderedMapDayId = selectedDay.id;
  state.pendingMapOverview = false;
  syncSelectedPlaceTooltip();
}

function renderRouteSuggestionMarkers(suggestions = []) {
  if (!state.map) {
    return;
  }

  suggestions.forEach(({ location }) => {
    if (
      !location?.id ||
      state.mapLayers.markerByPlaceId.has(location.id) ||
      !Number.isFinite(location.coordinates?.lat) ||
      !Number.isFinite(location.coordinates?.lng)
    ) {
      return;
    }

    const isSelected = state.selectedPlaceId === location.id;
    const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
      icon: L.divIcon({
        className: "day-stop-marker-shell",
        html: `
          <div class="day-stop-marker is-overlay is-route-suggestion ${isSelected ? "is-selected" : ""}">
            <span class="day-stop-marker-icon" aria-hidden="true">${iconForLocationType(location)}</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    }).addTo(state.map);

    state.mapLayers.markerByPlaceId.set(location.id, marker);
    state.mapLayers.markers.push(marker);

    marker.on("click", () => {
      state.selectedPlaceId = location.id;
      state.activeTooltipPlaceId = location.id;
      renderSchedule();
      renderMap();
      panMapToSelectedLocation({ preserveTooltip: true });
    });
  });
}

function panMapToSelectedLocation(options = {}) {
  if (!state.map || (state.mapFocus !== "day" && state.locationsExplorer.enabled !== true)) {
    return;
  }

  const location = getItineraryLocation(state.selectedPlaceId);
  if (!location || location.coordinates.lat == null || location.coordinates.lng == null) {
    return;
  }

  animateMapToLocation(location.coordinates.lat, location.coordinates.lng, {
    zoom: Math.max(Number.isFinite(state.map.getZoom?.()) ? state.map.getZoom() : 8, 11),
    duration: 0.72,
    preserveTooltip: options.preserveTooltip === true,
    verticalOffset: options.preserveTooltip === true ? 160 : 0,
  });
}

function focusDayLocationsOnMap(day) {
  if (!state.map || !day || state.mapFocus !== "day") {
    return;
  }

  const coordinates = getDayRenderableStops(day, state.selectedDayDetailMode)
    .map((stop) => getItineraryLocation(stop.location_id))
    .filter((location) => Number.isFinite(location?.coordinates?.lat) && Number.isFinite(location?.coordinates?.lng))
    .map((location) => [location.coordinates.lat, location.coordinates.lng]);

  if (!coordinates.length) {
    panMapToSelectedLocation();
    return;
  }

  if (coordinates.length === 1) {
    animateMapToLocation(coordinates[0][0], coordinates[0][1], {
      zoom: Math.max(Number.isFinite(state.map.getZoom?.()) ? state.map.getZoom() : 8, 11),
      duration: 0.72,
    });
    return;
  }

  const bounds = L.latLngBounds(coordinates);
  if (!bounds.isValid?.()) {
    panMapToSelectedLocation();
    return;
  }

  animateMapToBounds(bounds, {
    paddingTopLeft: [24, 84],
    paddingBottomRight: window.innerWidth <= 820 ? [24, 340] : [380, 48],
    duration: 0.78,
    maxZoom: 11,
  });
}

function focusMovementOnMap(movement) {
  if (!state.map || !movement) {
    return;
  }

  const selectedOption = getSelectedRouteOption(movement);
  const coordinates = (
    selectedOption?.line ||
    buildFallbackMovementLine(
      movement,
      selectedOption?.waypoints?.length ? selectedOption.waypoints : movement.route?.waypoints || []
    )
  )
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .map((point) => [point.lat, point.lng]);

  if (coordinates.length < 2) {
    return;
  }

  const bounds = L.latLngBounds(coordinates);
  if (!bounds.isValid?.()) {
    return;
  }

  animateMapToBounds(bounds, {
    paddingTopLeft: [24, 84],
    paddingBottomRight: window.innerWidth <= 820 ? [24, 340] : [380, 48],
    duration: 0.8,
  });
}

function getOverviewAnchorLocation(day) {
  return getItineraryLocation(day.sleep_location_id || day.wake_location_id);
}

function buildOverviewDayGroups(days) {
  const groups = [];

  (days || []).forEach((day) => {
    const anchorLocation = getOverviewAnchorLocation(day);
    const locationId = anchorLocation?.id || day.sleep_location_id || day.wake_location_id || day.id;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.locationId === locationId) {
      lastGroup.days.push(day);
      return;
    }

    groups.push({
      locationId,
      anchorLocation,
      days: [day],
    });
  });

  return groups.map((group, index) => {
    const firstDay = group.days[0];
    const lastDay = group.days[group.days.length - 1];
    const selectedDay = group.days.find((day) => day.id === state.selectedDayId) || null;
    const stopNumber = index + 1;
    const dayRangeLabel =
      group.days.length > 1
        ? `${firstDay.day_number || 1}\u2013${lastDay.day_number || firstDay.day_number || 1}`
        : `${firstDay.day_number || 1}`;

    return {
      ...group,
      label: `${stopNumber}`,
      isSelected: Boolean(selectedDay),
      focusDayId: selectedDay?.id || firstDay.id,
      popupDay: selectedDay || firstDay,
      popupLabel:
        group.days.length > 1
          ? `Days ${dayRangeLabel}`
          : formatItineraryDayLabel(firstDay, firstDay.day_number ? firstDay.day_number - 1 : 0),
    };
  });
}

function syncSelectedPlaceTooltip() {
  const canShowTooltip = state.locationsExplorer.enabled === true || state.mapFocus === "day";

  if (!state.map || !canShowTooltip) {
    closeSelectedPlaceTooltip();
    return;
  }

  const placeId = state.activeTooltipPlaceId;
  const marker = placeId ? state.mapLayers.markerByPlaceId.get(placeId) : null;
  if (!placeId || !marker) {
    closeSelectedPlaceTooltip();
    return;
  }

  marker.bindPopup(buildSelectedPlaceTooltip(placeId), {
    className: "selected-place-popup",
    closeButton: false,
    autoPan: true,
    autoPanPaddingTopLeft: [24, 120],
    autoPanPaddingBottomRight: [window.innerWidth <= 820 ? 24 : 420, window.innerWidth <= 820 ? 220 : 72],
    minWidth: 264,
    maxWidth: 360,
    offset: [0, -12],
  });
  marker.openPopup();
}

function highlightMapPlaceMarker(placeId) {
  const marker = placeId ? state.mapLayers.markerByPlaceId.get(placeId) : null;
  const element = marker?.getElement?.();
  if (!element) {
    return;
  }
  element.classList.add("is-list-hovered");
  marker.setZIndexOffset?.(1000);
}

function clearMapPlaceMarkerHighlight(placeId) {
  const marker = placeId ? state.mapLayers.markerByPlaceId.get(placeId) : null;
  const element = marker?.getElement?.();
  if (!element) {
    return;
  }
  element.classList.remove("is-list-hovered");
  marker.setZIndexOffset?.(0);
}

function closeSelectedPlaceTooltip(options = {}) {
  if (options.clearSelection !== false) {
    state.activeTooltipPlaceId = null;
  }
  state.map?.closePopup();
}

function buildSelectedPlaceTooltip(placeId) {
  const location = getItineraryLocation(placeId);
  const place = state.placesById.get(placeId);
  const title = location?.name || place?.name || "Location";
  const typeLabel = getLocationTaxonomyLabel(location || place);
  const descriptionParts = [
    location?.description || place?.briefDescription || location?.notes || "",
    location?.accommodation?.notes || "",
  ].filter(Boolean);
  const description = descriptionParts.join(" ");
  const regionLabel = simplifyRegionLabel(location?.region || place?.region || "") || location?.country || place?.country || "";
  const mapsUrl = location?.google_maps_url || place?.googleMapsUrl || "";
  const websiteUrl = location?.website_url || place?.websiteUrl || "";
  const photoUrl = location?.photo_url || "";
  const photoAlt = location?.photo_alt || title;
  const visibility = getLocationVisibilityMeta(location);
  const linkMarkup = [
    mapsUrl
      ? `<a class="itinerary-route-button" href="${escapeAttribute(mapsUrl)}" target="_blank" rel="noreferrer">${renderExternalActionIcon("maps")}<span>Google Maps</span></a>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="selected-place-tooltip-card">
      <button class="selected-place-tooltip-close" type="button" data-close-place-tooltip aria-label="Close location details">
        ×
      </button>
      ${
        photoUrl
          ? `<div class="selected-place-tooltip-media"><img src="${escapeAttribute(photoUrl)}" alt="${escapeAttribute(photoAlt)}" loading="lazy" /></div>`
          : ""
      }
      <div class="selected-place-tooltip-copy">
        <h3>${escapeHtml(title)}</h3>
        ${regionLabel ? `<p class="selected-place-tooltip-subtitle">${escapeHtml(regionLabel)}</p>` : ""}
        <div class="selected-place-tooltip-pill-row">
          ${renderLocationCategoryLine(location, typeLabel)}
          <span class="selected-place-visibility-pill ${escapeHtml(visibility.tone)}">
            <span aria-hidden="true">${visibility.icon}</span>
            ${escapeHtml(visibility.label)}
          </span>
        </div>
        ${
          description
            ? `<p class="selected-place-tooltip-description">${escapeHtml(description)}</p>`
            : ""
        }
        ${renderCampgroundFacts(location?.accommodation, { compact: true })}
        ${
          linkMarkup
            ? `<div class="selected-place-tooltip-links">${linkMarkup}</div>`
            : ""
        }
        ${renderRefineWidget(placeId)}
      </div>
    </article>
  `;
}

function normalizeDecisionVote(vote) {
  if (vote === "lock") {
    return "love";
  }
  if (vote === "like") {
    return "love";
  }
  if (vote === "unvote") {
    return "downvote";
  }
  return vote || "";
}

function isRefineNoteOpen(placeId) {
  const decision = getDecisionForPlace(placeId);
  return state.activeRefineNotePlaceId === placeId || Boolean(decision?.note?.trim());
}

function getDecisionForPlace(placeId) {
  return placeId ? state.decisions.get(placeId) || null : null;
}

function ensureDecisionForPlace(placeId, defaults = {}) {
  const place = state.placesById.get(placeId);
  if (!place) {
    return null;
  }
  const existing = state.decisions.get(placeId);
  if (existing) {
    return existing;
  }
  const decision = {
    target_type: "place",
    target_id: place.id,
    target_label: place.name,
    vote: normalizeDecisionVote(defaults.vote) || "love",
    note: defaults.note || defaults.reason || "",
    applies_from_version: state.activeVersionId,
    created_at: new Date().toISOString(),
    created_by: "ui",
  };
  state.decisions.set(place.id, decision);
  return decision;
}

function updateDecisionReasonForPlace(placeId, reason) {
  const nextReason = String(reason || "");
  if (!nextReason.trim() && !state.decisions.has(placeId)) {
    return;
  }
  const decision = ensureDecisionForPlace(placeId);
  if (!decision) {
    return;
  }
  decision.note = nextReason;
  decision.target_label = state.placesById.get(placeId)?.name || decision.target_label;
  decision.created_at = new Date().toISOString();
  if (!nextReason.trim()) {
    state.activeRefineNotePlaceId = null;
  }
  scheduleAutosave();
}

function applyVoteForPlace(placeId, vote) {
  const place = state.placesById.get(placeId);
  if (!place) {
    return;
  }
  const decision = ensureDecisionForPlace(placeId, { vote });
  if (!decision) {
    return;
  }
  decision.vote = normalizeDecisionVote(vote);
  decision.target_label = place.name;
  decision.applies_from_version = state.activeVersionId;
  decision.created_at = new Date().toISOString();
  state.decisions.set(place.id, decision);
  if (state.selectedPlaceId !== place.id) {
    state.selectedPlaceId = place.id;
  }
  renderSchedule();
  renderMap();
  scheduleAutosave();
}

function toggleRefineNote(placeId) {
  const isOpen = isRefineNoteOpen(placeId);
  state.activeRefineNotePlaceId = isOpen ? null : placeId;
  renderSchedule();
  renderMap();
}

function renderRefineWidget(placeId, options = {}) {
  const decision = getDecisionForPlace(placeId);
  const compactClass = options.compact ? "is-compact" : "";
  const noteOpen = isRefineNoteOpen(placeId);
  const placeholder = decision ? "Add note" : "React first, then add note";

  return `
    <div class="refine-widget ${compactClass}" data-refine-widget data-refine-place-id="${escapeHtml(placeId)}">
      <div class="refine-widget-reactions" role="group" aria-label="Refine request actions">
        ${REFINE_REACTION_OPTIONS.map((option) => renderRefineReactionButton(placeId, option, decision?.vote)).join("")}
        <button
          class="refine-reaction-button ${noteOpen ? "is-active" : ""}"
          type="button"
          data-refine-note-toggle
          data-refine-place-id="${escapeHtml(placeId)}"
          aria-label="Add note"
          title="Add note"
        >
          <span aria-hidden="true">💬</span>
        </button>
      </div>
      ${
        noteOpen
          ? `
            <textarea
              class="refine-widget-note"
              data-refine-note
              data-refine-place-id="${escapeHtml(placeId)}"
              placeholder="${escapeAttribute(placeholder)}"
              ${decision ? "" : "disabled"}
            >${escapeHtml(decision?.note || "")}</textarea>
          `
          : ""
      }
    </div>
  `;
}

function renderRefineReactionButton(placeId, option, activeVote = "") {
  const isActive = normalizeDecisionVote(activeVote) === option.vote;
  return `
    <button
      class="refine-reaction-button ${isActive ? "is-active" : ""}"
      type="button"
      data-refine-vote="${escapeHtml(option.vote)}"
      data-refine-place-id="${escapeHtml(placeId)}"
      aria-label="${escapeHtml(option.label)}"
      title="${escapeHtml(option.label)}"
    >
      <span aria-hidden="true">${option.icon}</span>
    </button>
  `;
}

function renderExternalActionIcon(kind = "route") {
  if (kind === "maps") {
    return `
      <span class="external-action-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path fill="currentColor" d="M12 2.25a6.75 6.75 0 0 0-6.75 6.75c0 4.85 5.28 10.9 6.16 11.88a.75.75 0 0 0 1.12 0c.88-.98 6.16-7.03 6.16-11.88A6.75 6.75 0 0 0 12 2.25Zm0 9.5a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5Z"/>
        </svg>
      </span>
    `;
  }

  return `
    <span class="external-action-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path fill="currentColor" d="M19.53 4.47a.75.75 0 0 0-.82-.16l-13 5.5a.75.75 0 0 0 .08 1.42l5.06 1.55 1.55 5.06a.75.75 0 0 0 1.42.08l5.5-13a.75.75 0 0 0-.16-.82l-.63.37.63-.37Zm-6.14 10.88-.99-3.23a.75.75 0 0 0-.5-.5l-3.23-.99 8.28-3.5-3.56 8.22Z"/>
      </svg>
    </span>
  `;
}

function clearMapLayers() {
  if (!state.map) {
    return;
  }

  closeSelectedPlaceTooltip({ clearSelection: false });
  state.mapLayers.markers.forEach((marker) => marker.remove());
  state.mapLayers.polylines.forEach((polyline) => polyline.remove());
  state.mapLayers.markers = [];
  state.mapLayers.polylines = [];
  state.mapLayers.markerByPlaceId = new Map();
}

function scheduleAutosave() {
  if (state.isHydrating || !state.activeVersionId) {
    return;
  }

  clearTimeout(state.saveTimer);
  setSaveStatus("Saving locally…");

  state.saveTimer = setTimeout(() => {
    try {
      saveRefineRequest();
    } catch (error) {
      setSaveStatus("Save failed");
      setStatus(error.message || "Could not save local planning draft.", "danger");
    }
  }, 450);
}

function saveRefineRequest() {
  clearTimeout(state.saveTimer);
  state.saveTimer = null;
  if (!writePlanningDraft()) {
    throw new Error("Could not save planning draft in local storage.");
  }

  setSaveStatus("Saved locally");
  setStatus(`Saved local planning draft for ${state.activeVersionId}.`, "success");
}

function downloadRefineRequestYaml() {
  const yaml = buildRefineRequestYaml();
  const versionId = state.activeVersionId || "v1";
  const blob = new Blob([yaml], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${versionId}_refine_request.yaml`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`Exported refine_request.yaml for ${versionId}.`, "success");
}

function buildRefineRequestYaml() {
  const versionId = state.activeVersionId || "v1";
  const decisions = getOrderedDecisions();
  const tripOverview = buildRefineTripOverview();
  const lines = [
    `schema_version: "2.0.0"`,
    `itinerary:`,
    `  version_id: ${yamlString(versionId)}`,
    `  file: "itinerary.json"`,
  ];

  if (!decisions.length) {
    lines.push("location_feedback: []");
  } else {
    lines.push("location_feedback:");
    decisions.forEach((decision) => {
      const note = String(decision.note || "").trim();
      lines.push(`  - location_id: ${yamlString(decision.target_id)}`);
      lines.push(`    vote: ${formatDecisionVoteForExport(decision.vote)}`);
      if (note) {
        lines.push(`    note: ${yamlString(note)}`);
      }
    });
  }

  appendTripOverviewYaml(lines, tripOverview);

  return lines.join("\n");
}

function serializeWorkingItineraryForStorage() {
  const working = getWorkingItinerary();
  if (!working) {
    return null;
  }
  return clonePlainObject({
    id: working.id,
    based_on_itinerary_id: working.based_on_itinerary_id,
    stays: working.stays || [],
    days: serializePlanningDays(working.days || []),
    locks: working.locks || { days: [], stays: [] },
    metadata: working.metadata || {},
  });
}

function serializeWorkingItineraryForLocalDraft() {
  const working = getWorkingItinerary();
  if (!working) {
    return null;
  }

  return clonePlainObject({
    id: working.id,
    based_on_itinerary_id: working.based_on_itinerary_id,
    stays: working.stays || [],
    locks: working.locks || { days: [], stays: [] },
    metadata: working.metadata || {},
  });
}

function formatDecisionVoteForExport(vote) {
  const normalized = normalizeDecisionVote(vote);
  if (normalized === "love") {
    return "like";
  }
  if (normalized === "downvote") {
    return "unvote";
  }
  return normalized || "like";
}

function buildRefineTripOverview() {
  return (getItineraryDays() || []).map((day, index) => ({
    day_id: day.id,
    day_number: day.day_number || index + 1,
    date: day.date || "",
    wake_location_id: day.wake_location_id || "",
    sleep_location_id: day.sleep_location_id || "",
    note: normalizeOptionalText(day.note || day.summary),
    locked: Boolean(day.locked),
  }));
}

function appendTripOverviewYaml(lines, days) {
  if (!days.length) {
    lines.push("trip_overview: []");
    return;
  }

  lines.push("trip_overview:");
  days.forEach((day) => {
    lines.push(`  - day_id: ${yamlString(day.day_id)}`);
    lines.push(`    day_number: ${day.day_number}`);
    lines.push(`    date: ${yamlString(day.date)}`);
    lines.push(`    wake_location_id: ${yamlString(day.wake_location_id)}`);
    lines.push(`    sleep_location_id: ${yamlString(day.sleep_location_id)}`);
    lines.push(`    locked: ${day.locked}`);
    if (day.note) {
      lines.push(`    note: ${yamlString(day.note)}`);
    }
  });
}

function normalizeIdList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeOptionalText(value) {
  return String(value || "").trim();
}

function serializePlanningDays(days) {
  return (days || []).map((day) => ({
    id: day.id,
    day_number: day.day_number,
    date: day.date || "",
    wake_location_id: day.wake_location_id || null,
    sleep_location_id: day.sleep_location_id || null,
    note: day.note || day.summary || "",
    base: day.base || {
      anchor: "sleep",
      nearby_locations: getDayNearbySuggestions(day).map((suggestion) => suggestion.location_id),
    },
    locked: Boolean(day.locked),
    movements: (day.movements || []).map(serializePlanningMovement),
  }));
}

function serializePlanningMovement(movement) {
  const routeOptions = Array.isArray(movement.route_options) ? movement.route_options : [];
  if (!routeOptions.length) {
    return clonePlainObject(movement);
  }

  const selectedOption = routeOptions.find((option) => option.is_selected) || routeOptions[0];
  const serialized = {
    id: movement.id,
    mode: movement.mode,
    start_location_id: movement.start_location_id,
    end_location_id: movement.end_location_id,
    note: movement.summary || "",
    default_route_id: selectedOption?.id || null,
    routes: routeOptions.map((option, index) => ({
      id: option.id || `${movement.id}_route_${index + 1}`,
      variant: option.style === "scenic" ? "scenic" : option.style === "fast" ? "fastest" : "custom",
      constraints: option.style === "no_highways" ? ["avoid_highways"] : [],
      note: option.summary || "",
      distance_km: Number.isFinite(option.distance_km) ? option.distance_km : null,
      duration_minutes: Number.isFinite(option.duration_minutes) ? option.duration_minutes : null,
      external_maps: option.open_route_url ? { google_maps: option.open_route_url } : null,
      waypoint_locations: (option.waypoints || [])
        .map((waypoint) => waypoint.location_id)
        .filter(Boolean),
    })),
  };

  return serialized;
}

function getOrderedDecisions() {
  const orderedPlaceIds = [
    ...state.usedPlaceIds.filter((placeId) => state.decisions.has(placeId)),
    ...Array.from(state.decisions.keys()).filter((placeId) => !state.usedPlaceIds.includes(placeId)),
  ];
  return orderedPlaceIds
    .map((placeId) => state.decisions.get(placeId))
    .map((decision) => ({
      ...decision,
      vote: normalizeDecisionVote(decision.vote),
    }));
}

function setActiveView(view, options = {}) {
  state.activeView = view;
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  elements.scheduleView.classList.toggle("active", view === "schedule");
  elements.mapView.classList.toggle("active", view === "map");

  if (options.rerender) {
    renderSchedule();
    renderMap();
  }

  if (view === "map" && state.map) {
    setTimeout(() => {
      state.map.invalidateSize();
      fitMapToRouteOverview();
    }, 20);
    return;
  }

  if (view === "schedule" && state.map) {
    setTimeout(() => {
      state.map.invalidateSize();
    }, 20);
  }
}

function fitMapToRouteOverview() {
  if (!state.map || !state.routeBounds?.isValid?.()) {
    return;
  }

  animateMapToBounds(state.routeBounds, {
    paddingTopLeft: [28, 96],
    paddingBottomRight: [400, 112],
    duration: 0.78,
  });
  state.pendingMapOverview = false;
}

function animateMapToBounds(
  bounds,
  {
    paddingTopLeft = [24, 84],
    paddingBottomRight = [24, 48],
    duration = 0.72,
    maxZoom,
    preserveTooltip = false,
  } = {}
) {
  if (!state.map || !bounds?.isValid?.()) {
    return;
  }

  state.preserveTooltipOnNextMapMotion = Boolean(preserveTooltip && state.activeTooltipPlaceId);

  const options = {
    paddingTopLeft,
    paddingBottomRight,
    duration,
    animate: true,
  };

  if (Number.isFinite(maxZoom)) {
    options.maxZoom = maxZoom;
  }

  if (typeof state.map.flyToBounds === "function") {
    state.map.flyToBounds(bounds, options);
    return;
  }

  state.map.fitBounds(bounds, options);
}

function animateMapToLocation(
  lat,
  lng,
  {
    zoom = null,
    duration = 0.72,
    preserveTooltip = false,
    verticalOffset = 0,
  } = {}
) {
  if (!state.map || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  state.preserveTooltipOnNextMapMotion = Boolean(preserveTooltip && state.activeTooltipPlaceId);
  scheduleTooltipSyncAfterMapMotion(duration);

  const currentZoom = Number.isFinite(state.map.getZoom?.()) ? state.map.getZoom() : 8;
  const nextZoom = Number.isFinite(zoom) ? zoom : Math.max(currentZoom, 10);
  let target = [lat, lng];

  if (Number.isFinite(verticalOffset) && verticalOffset && typeof state.map.project === "function") {
    const projected = state.map.project([lat, lng], nextZoom);
    projected.y -= verticalOffset;
    target = state.map.unproject(projected, nextZoom);
  }

  if (typeof state.map.flyTo === "function") {
    state.map.flyTo(target, nextZoom, {
      animate: true,
      duration,
    });
    return;
  }

  if (Number.isFinite(nextZoom) && typeof state.map.setZoom === "function" && nextZoom !== currentZoom) {
    state.map.setZoom(nextZoom, { animate: true });
  }

  state.map.panTo(target, {
    animate: true,
    duration,
  });
}

function scheduleTooltipSyncAfterMapMotion(duration = 0.72) {
  clearTimeout(state.tooltipSyncTimer);
  if (!state.preserveTooltipOnNextMapMotion || !state.activeTooltipPlaceId) {
    state.tooltipSyncTimer = null;
    return;
  }

  state.tooltipSyncTimer = setTimeout(() => {
    if (!state.activeTooltipPlaceId) {
      return;
    }
    state.preserveTooltipOnNextMapMotion = false;
    syncSelectedPlaceTooltip();
  }, Math.max(120, duration * 1000 + 160));
}

function setSaveStatus(label) {
  elements.saveStatusPill.textContent = label;
}

function bindDaySelectionEvents(scope) {
  scope.querySelectorAll("[data-day-id]").forEach((element) => {
    const selectDay = () => {
      const dayId = element.dataset.dayId;
      if (!dayId) {
        return;
      }
      if (dayId === state.selectedDayId && state.mapFocus === "day") {
        return;
      }
      selectItineraryDay(dayId, {
        focusMap: state.mapFocus === "day",
      });
    };

    element.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("[data-place-id]")) {
        return;
      }
      selectDay();
    });

    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      selectDay();
    });
  });
}

function bindTimelineControls(scope) {
  scope.querySelectorAll("[data-day-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.dayStep || 0);
      if (!step) {
        return;
      }
      shiftSelectedDay(step);
    });
  });

  const currentDayCard = scope.querySelector("[data-current-day-card]");
  currentDayCard?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      shiftSelectedDay(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      shiftSelectedDay(1);
    }
  });
}

function bindOpenRouteActions() {}

function bindSchedulePlaceSelectionEvents(scope) {
  scope.querySelectorAll("[data-place-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const placeId = element.dataset.placeId;
      if (!placeId) {
        return;
      }
      const mode = element.dataset.dayDetailMode;
      if (mode) {
        state.selectedDayDetailMode = mode;
      }
      state.selectedPlaceId = placeId;
      state.activeTooltipPlaceId = placeId;
      renderSchedule();
      renderMap();
      panMapToSelectedLocation({ preserveTooltip: true });
    });
  });

  scope.querySelectorAll("[data-highlight-place-id]").forEach((element) => {
    element.addEventListener("mouseenter", () => highlightMapPlaceMarker(element.dataset.highlightPlaceId));
    element.addEventListener("focus", () => highlightMapPlaceMarker(element.dataset.highlightPlaceId));
    element.addEventListener("mouseleave", () => clearMapPlaceMarkerHighlight(element.dataset.highlightPlaceId));
    element.addEventListener("blur", () => clearMapPlaceMarkerHighlight(element.dataset.highlightPlaceId));
  });

  scope.querySelectorAll("[data-movement-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const movementId = element.dataset.movementId;
      if (!movementId) {
        return;
      }
      selectMovement(movementId);
    });
  });
}

function bindLocationOverlayToolbarEvents(scope) {
  scope.querySelector("[data-toggle-location-overlay]")?.addEventListener("click", () => {
    state.locationsExplorer.enabled = !state.locationsExplorer.enabled;
    if (state.locationsExplorer.enabled !== true) {
      clearTimeout(state.locationsExplorer.searchTimer);
      state.locationsExplorer.searchTimer = null;
    }
    state.activeTooltipPlaceId = state.locationsExplorer.enabled ? state.activeTooltipPlaceId : null;
    renderLocationOverlayToolbar();
    renderMap();
  });

  scope.querySelector("[data-location-overlay-search]")?.addEventListener("input", (event) => {
    const nextValue = event.target instanceof HTMLInputElement ? event.target.value : "";
    if (nextValue === state.locationsExplorer.searchDraft) {
      return;
    }
    state.locationsExplorer.searchDraft = nextValue;
    clearTimeout(state.locationsExplorer.searchTimer);
    state.locationsExplorer.searchTimer = setTimeout(() => {
      state.locationsExplorer.searchTimer = null;
      if (state.locationsExplorer.searchQuery === state.locationsExplorer.searchDraft) {
        return;
      }
      state.locationsExplorer.searchQuery = state.locationsExplorer.searchDraft;
      renderMap();
    }, 220);
  });

  scope.querySelector("[data-location-overlay-filter]")?.addEventListener("change", (event) => {
    const nextValue = event.target instanceof HTMLSelectElement ? event.target.value : "all";
    if (nextValue === state.locationsExplorer.taxonomyFilter) {
      return;
    }
    state.locationsExplorer.taxonomyFilter = nextValue;
    renderLocationOverlayToolbar();
    renderMap();
  });
}

function bindStayPlanningEvents(scope) {
  scope.querySelectorAll("[data-stay-location-select]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const stayId = event.target.closest("[data-stay-id]")?.dataset.stayId;
      const locationId = event.target instanceof HTMLSelectElement ? event.target.value : "";
      updateWorkingStay(stayId, { overnight_location_id: locationId, base_location_id: locationId });
    });
  });

  scope.querySelectorAll("[data-stay-nights-input]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const stayId = event.target.closest("[data-stay-id]")?.dataset.stayId;
      const nights = event.target instanceof HTMLInputElement ? Number(event.target.value) : 1;
      updateWorkingStay(stayId, { nights: Math.max(1, Math.min(14, Math.round(nights || 1))) });
    });
  });

  scope.querySelectorAll("[data-stay-lock-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const stayId = event.target.closest("[data-stay-id]")?.dataset.stayId;
      const locked = event.target instanceof HTMLInputElement ? event.target.checked : false;
      updateWorkingStay(stayId, { locked });
    });
  });

  scope.querySelectorAll("[data-add-stay-after]").forEach((button) => {
    button.addEventListener("click", () => {
      const stayId = button.closest("[data-stay-id]")?.dataset.stayId;
      addWorkingStayAfter(stayId);
    });
  });

  scope.querySelectorAll("[data-remove-stay]").forEach((button) => {
    button.addEventListener("click", () => {
      const stayId = button.closest("[data-stay-id]")?.dataset.stayId;
      removeWorkingStay(stayId);
    });
  });

  scope.querySelectorAll("[data-save-itinerary-version]").forEach((button) => {
    button.addEventListener("click", () => saveWorkingItineraryVersion());
  });

  scope.querySelectorAll("[data-planning-version-select]").forEach((select) => {
    select.addEventListener("change", (event) => {
      state.selectedPlanningVersionId = event.target instanceof HTMLSelectElement ? event.target.value : "";
      renderSchedule();
    });
  });
}

function bindRouteOptionSelectionEvents(scope) {
  scope.querySelectorAll("[data-route-option-style][data-route-option-movement-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const style = element.dataset.routeOptionStyle;
      const movementId = element.dataset.routeOptionMovementId;
      if (!style || !movementId) {
        return;
      }
      selectRouteOption(movementId, style);
    });
  });
}

function bindRouteWaypointActions(scope) {
  scope.querySelectorAll("[data-add-route-waypoint]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      addLocationToSelectedRoute(button.dataset.routeOptionMovementId, button.dataset.routeLocationId);
    });
  });

  scope.querySelectorAll("[data-remove-route-waypoint]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      removeLocationFromSelectedRoute(button.dataset.routeOptionMovementId, button.dataset.routeLocationId);
    });
  });
}

function bindDayFocusCloseAction(scope) {
  scope.querySelectorAll("[data-close-day-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mapFocus = "overview";
      state.pendingMapOverview = true;
      closeSelectedPlaceTooltip();
      renderSchedule();
      renderMap();
    });
  });
}

function shiftSelectedDay(step) {
  const days = getItineraryDays();
  const currentIndex = days.findIndex((day) => day.id === state.selectedDayId);
  const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = Math.min(days.length - 1, Math.max(0, fallbackIndex + step));

  if (nextIndex === fallbackIndex || !days[nextIndex]) {
    return;
  }

  selectItineraryDay(days[nextIndex].id, {
    focusMap: state.mapFocus === "day",
  });
}

function renderPlaceChip(placeId) {
  const place = state.placesById.get(placeId);
  if (!place) {
    return "";
  }

  const classes = [
    "place-chip",
    state.selectedPlaceId === placeId ? "selected" : "",
    state.decisions.has(placeId) ? "has-decision" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<button class="${classes}" data-place-id="${escapeHtml(placeId)}" type="button">${escapeHtml(
    place.name
  )}</button>`;
}

function renderVoteBadge(vote) {
  const emojiByVote = {
    love: "❤️",
    lock: "❤️",
    upvote: "👍",
    downvote: "👎",
    remove: "🚫",
  };
  const normalizedVote = normalizeDecisionVote(vote);
  const label = normalizedVote === "love" ? "Love" : humanize(normalizedVote);
  return `<span class="vote-badge" data-vote="${escapeHtml(normalizedVote)}">${emojiByVote[normalizedVote] || ""} ${escapeHtml(
    label
  )}</span>`;
}

function formatVersionOptionLabel(version) {
  const suffix = [version.schema_version, version.day_count ? `${version.day_count} days` : ""]
    .filter(Boolean)
    .join(" · ");
  return suffix ? `${version.id} (${suffix})` : version.id;
}

function getDayHighlight(day) {
  const overnightItem = (day.items || []).find((item) => item.type === "overnight" || item.type === "check_in");
  const townPlaceId =
    overnightItem?.place_id ||
    (day.items || []).find((item) => item.place_id)?.place_id ||
    null;
  const townPlace = townPlaceId ? state.placesById.get(townPlaceId) : null;

  return {
    sleep: overnightItem
      ? {
          icon: iconForItemType(overnightItem.type),
          label: overnightItem.title || resolvePlaceName(overnightItem.place_id),
          placeName: overnightItem.place_id ? resolvePlaceName(overnightItem.place_id) : "",
        }
      : null,
    location: townPlace?.name || "",
  };
}

function getDayActivityItems(day) {
  return (day.items || []).filter(
    (item) => !["overnight", "check_in", "check_out"].includes(item.type)
  );
}

function getSupplyHighlights(day) {
  const supplyPlan = day.food_supply_plan || {};
  const entries = [
    ...(supplyPlan.restaurant_stop_ids || []).slice(0, 1).map((placeId) => ({
      icon: iconForItemType("meal"),
      label: resolvePlaceName(placeId),
    })),
    ...(supplyPlan.grocery_stop_ids || []).slice(0, 1).map((placeId) => ({
      icon: "🛒",
      label: resolvePlaceName(placeId),
    })),
    ...(supplyPlan.market_stop_ids || []).slice(0, 1).map((placeId) => ({
      icon: "🧺",
      label: resolvePlaceName(placeId),
    })),
    ...(supplyPlan.bakery_stop_ids || []).slice(0, 1).map((placeId) => ({
      icon: "🥐",
      label: resolvePlaceName(placeId),
    })),
  ];

  return dedupeHighlights(entries);
}

function getNearbyActivityHighlights(day) {
  const activitiesNearby = day.activities_nearby || [];
  return dedupeHighlights(
    activitiesNearby.slice(0, 3).map((item) => ({
      icon: accessModeIcon(item.access_mode),
      label: resolvePlaceName(item.place_id),
    }))
  );
}

function dedupeHighlights(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.icon}|${entry.label}`;
    if (!entry.label || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getDayRouteFacts(day) {
  const routeItem = (day.items || []).find((item) => item.type === "route_segment" || item.edge_id || item.linked_leg_id);
  const edge = routeItem ? state.edgesById.get(routeItem.edge_id || routeItem.linked_leg_id) : null;
  const routeFacts = getRouteFacts(edge);
  return {
    edge,
    routeItem,
    ...routeFacts,
  };
}

function getDayStartLocation(day, routeFacts, highlight) {
  if (routeFacts.fromToLabel) {
    return resolvePlaceNameFromNode(routeFacts.edge.from_node_id);
  }

  const firstPlaceItem = (day.items || []).find((item) => item.place_id);
  if (firstPlaceItem?.place_id) {
    return resolvePlaceName(firstPlaceItem.place_id);
  }

  return highlight.location || "";
}

function getSleepLocationLabel(sleepHighlight) {
  if (sleepHighlight?.placeName) {
    return sleepHighlight.placeName;
  }

  if (!sleepHighlight?.label) {
    return "";
  }

  return sleepHighlight.label
    .replace(/^check in (to|at)\s+/i, "")
    .replace(/^settle into\s+/i, "")
    .replace(/^single-night\s+/i, "")
    .trim();
}

function getRouteFacts(edge) {
  if (!edge) {
    return {
      edge: null,
      distanceLabel: "",
      durationLabel: "",
      fromToLabel: "",
      summary: "",
      selectedStyleLabel: "",
      optionCountLabel: "",
      waypointCountLabel: "",
    };
  }

  const selectedOption =
    (edge.route_options || []).find((option) => option.id === edge.selected_option_id) ||
    edge.scenic_route ||
    edge.fast_route ||
    null;
  const waypointCount = (edge.waypoints?.length || 0) + (edge.ev_stops?.length || 0);

  return {
    edge,
    distanceLabel: formatDistance(edge.distance_km),
    durationLabel: formatDuration(edge.duration_minutes),
    fromToLabel: `${resolvePlaceNameFromNode(edge.from_node_id)} to ${resolvePlaceNameFromNode(edge.to_node_id)}`,
    summary: edge.summary || "",
    selectedStyleLabel: selectedOption?.style ? `${humanize(selectedOption.style)} route` : "",
    optionCountLabel: edge.route_options?.length ? `${edge.route_options.length} route options` : "",
    waypointCountLabel: waypointCount ? `${waypointCount} route stops` : "",
  };
}

function formatDayMode(dayMode) {
  return dayMode ? humanize(dayMode) : "";
}

function formatMobilityPlan(mobilityPlan) {
  if (!mobilityPlan) {
    return "";
  }

  if (mobilityPlan.base_walk_or_bike_only) {
    return "Walk / bike base";
  }

  if (mobilityPlan.vehicle_moves_allowed === false) {
    return "Vehicle parked";
  }

  return mobilityPlan.primary_transport ? humanize(mobilityPlan.primary_transport) : "";
}

function accessModeIcon(accessMode) {
  const icons = {
    walk: "🚶",
    bike: "🚲",
    walk_or_bike: "🚶",
  };
  return icons[accessMode] || "📍";
}

function formatItemLead(item, edge) {
  if (item.type === "route_segment" && edge?.distance_km) {
    return formatDistance(edge.distance_km);
  }
  return formatItemTime(item);
}

function formatItemSecondaryMeta(item, edge) {
  if (item.type === "route_segment" && edge) {
    const bits = [getRouteFacts(edge).fromToLabel, formatDuration(edge.duration_minutes)].filter(Boolean);
    return bits.join(" • ");
  }

  if (item.place_id) {
    return resolvePlaceName(item.place_id);
  }

  return "";
}

function formatDistance(value) {
  if (!Number.isFinite(value)) {
    return "";
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} km`;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);

  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  }
  if (hours) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

function iconForItemType(type) {
  const icons = {
    route_segment: "🚗",
    visit: "📍",
    walk: "🚶",
    beach_time: "🏖️",
    meal: "🍽️",
    rest: "☕",
    check_in: "🛎️",
    check_out: "🧳",
    overnight: "🛏️",
    custom: "✨",
  };

  return icons[type] || "•";
}

function iconForPlaceRole(role) {
  const icons = {
    town: "📌",
    place: "📍",
    activity: "🗂️",
  };
  return icons[role] || "•";
}

function buildCalendarMonths(days) {
  const sortedDays = days
    .map((day, index) => ({
      day,
      date: parseLocalDate(day.date),
      index,
    }))
    .sort((left, right) => {
      if (left.date && right.date) {
        return left.date - right.date || left.index - right.index;
      }
      if (left.date) {
        return -1;
      }
      if (right.date) {
        return 1;
      }
      return left.index - right.index;
    });

  const months = new Map();

  sortedDays.forEach((entry) => {
    const key = entry.date
      ? `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, "0")}`
      : "unscheduled";

    if (!months.has(key)) {
      months.set(key, {
        key,
        label: entry.date ? formatCalendarMonth(entry.date) : "Unscheduled",
        referenceDate: entry.date,
        days: [],
      });
    }

    months.get(key).days.push(entry);
  });

  return Array.from(months.values()).map((month) => {
    if (!month.referenceDate) {
      return {
        ...month,
        weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        cells: month.days.map((entry) => ({
          type: "day",
          day: entry.day,
          date: entry.date,
        })),
      };
    }

    const firstDate = month.days[0].date;
    const lastDate = month.days[month.days.length - 1].date;
    const calendarStart = addDays(firstDate, -getCalendarWeekdayIndex(firstDate));
    const calendarEnd = addDays(lastDate, 6 - getCalendarWeekdayIndex(lastDate));
    const dayMap = new Map(month.days.map((entry) => [formatDateKey(entry.date), entry.day]));
    const cells = [];

    for (
      let cursor = new Date(calendarStart.getTime());
      cursor <= calendarEnd;
      cursor = addDays(cursor, 1)
    ) {
      const dateKey = formatDateKey(cursor);
      const scheduledDay = dayMap.get(dateKey);

      if (scheduledDay) {
        cells.push({
          type: "day",
          day: scheduledDay,
          date: new Date(cursor.getTime()),
        });
      } else {
        cells.push({
          type: "empty",
          date: new Date(cursor.getTime()),
        });
      }
    }

    return {
      ...month,
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      cells,
    };
  });
}

function dayIncludesPlace(day, placeId) {
  if (!placeId) {
    return false;
  }

  return (day.items || []).some((item) => {
    if (item.place_id === placeId) {
      return true;
    }

    const edge = state.edgesById.get(item.edge_id || item.linked_leg_id);
    if (!edge) {
      return false;
    }

    return (
      resolvePlaceIdFromNode(edge.from_node_id) === placeId ||
      resolvePlaceIdFromNode(edge.to_node_id) === placeId
    );
  });
}

function resolvePlaceIdFromNode(nodeId) {
  return state.nodesById.get(nodeId)?.place_id || null;
}

function resolvePlaceNameFromNode(nodeId) {
  return resolvePlaceName(resolvePlaceIdFromNode(nodeId));
}

function resolvePlaceName(placeId) {
  return state.placesById.get(placeId)?.name || placeId || "Unknown place";
}

function markerFill(placeId) {
  if (state.selectedPlaceId === placeId) {
    return "#1d282a";
  }
  if (!state.decisions.has(placeId)) {
    return "#1e7084";
  }
  const vote = normalizeDecisionVote(state.decisions.get(placeId).vote);
  if (vote === "upvote") {
    return "#6c8c5e";
  }
  if (vote === "downvote") {
    return "#1e7084";
  }
  if (vote === "love") {
    return "#9b3358";
  }
  return "#a5453d";
}

function formatItemTime(item) {
  const start = item.start_time || item.check_in_time || "";
  const end = item.end_time || "";
  const duration = item.duration_minutes ? `${item.duration_minutes} min` : "";

  if (start && end) {
    return `${formatClock(start)}–${formatClock(end)}`;
  }
  if (start) {
    return formatClock(start);
  }
  if (duration) {
    return duration;
  }
  return "Flexible";
}

function formatClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScheduleRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return "Trip Schedule";
  }
  if (startDate && endDate) {
    return `${formatCalendarLongDate(startDate, "")} to ${formatCalendarLongDate(endDate, "")}`;
  }
  return formatCalendarLongDate(startDate || endDate, "");
}

function formatCalendarMonth(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Schedule";
  }
  return date.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });
}

function formatCalendarLongDate(date, fallback) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return fallback || "Unscheduled";
  }
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatCalendarWeekday(date, fallback) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return fallback || "";
  }
  return date.toLocaleDateString([], {
    weekday: "short",
  });
}

function formatCalendarDayNumber(date, fallback) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return fallback || "";
  }
  return String(date.getDate());
}

function parseLocalDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function addDays(date, days) {
  const nextDate = new Date(date.getTime());
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getCalendarWeekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function durationBetween(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return Math.max(0, Math.round((end - start) / 60000));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed for ${url}`);
  }
  return response.json();
}

function yamlString(value) {
  return `"${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")}"`;
}

function setStatus(message, tone = "neutral") {
  const shouldShow = tone === "warning" || tone === "danger";
  elements.statusBanner.hidden = !shouldShow;
  elements.statusBanner.textContent = message;
  elements.statusBanner.dataset.tone = tone;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function humanize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
