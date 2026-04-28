import json
from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path


ROOT = Path("/Users/laugga/Desktop/road-trip-summer-2026")
CURRENT = ROOT / "itinerary/versions/v1-chatgpt-5.4/itinerary.json"


def load_current_locations():
    data = json.loads(CURRENT.read_text())
    return {loc["id"]: loc for loc in data["locations"]}


CURRENT_LOCS = load_current_locations()


def keep(loc_id):
    return deepcopy(CURRENT_LOCS[loc_id])


def new_loc(
    loc_id,
    loc_type,
    name,
    address,
    region,
    country,
    *,
    description="",
    priority="worth_a_stop",
    website_url="",
    photo_url="",
    photo_alt="",
    features=None,
):
    loc = {
        "id": loc_id,
        "type": loc_type,
        "name": name,
        "address": address,
        "region": region,
        "country": country,
        "coordinates": {"lat": None, "lng": None},
        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={name.replace(' ', '+')}",
        "website_url": website_url,
        "photo_url": photo_url,
        "photo_alt": photo_alt or name,
        "description": description,
        "editorial": {"priority": priority},
    }
    if features is not None:
        loc["accommodation"] = {"features": features}
    return loc


LOCATIONS = [
    keep("pl_zurich_home"),
    keep("pl_fontvieille"),
    keep("pl_fontvieille_activity"),
    keep("pl_fontvieille_bakery"),
    keep("pl_fontvieille_market"),
    keep("pl_fontvieille_rest"),
    keep("pl_santacristina"),
    keep("pl_santacristina_activity"),
    keep("pl_santacristina_bakery"),
    keep("pl_santacristina_grocery"),
    keep("pl_santacristina_rest"),
    keep("pl_cabodegata"),
    keep("pl_cabo_activity"),
    keep("pl_cabo_bakery"),
    keep("pl_cabo_grocery"),
    keep("pl_cabo_rest"),
    keep("pl_dunasmar"),
    keep("pl_mg_activity"),
    keep("pl_mg_bakery"),
    keep("pl_mg_grocery"),
    keep("pl_mg_rest"),
    keep("pl_saomiguel"),
    keep("pl_saomiguel_activity"),
    keep("pl_saomiguel_bakery"),
    keep("pl_saomiguel_grocery"),
    keep("pl_saomiguel_rest"),
    keep("pl_wecamp_sansebastian"),
    keep("pl_ss_activity"),
    keep("pl_ss_bakery"),
    keep("pl_ss_grocery"),
    keep("pl_ss_rest"),
    keep("pl_huttopia_landes"),
    keep("pl_landes_activity"),
    keep("pl_landes_bakery"),
    keep("pl_landes_grocery"),
    keep("pl_landes_rest"),
    keep("pl_ch_ionity_martigny"),
    keep("pl_narbonne_charger"),
    keep("pl_tarragona_lunch"),
    keep("pl_castellon_charge"),
    keep("pl_murcia_charge"),
    keep("pl_setubal_charge"),
    keep("pl_burgos_charge"),
    keep("pl_burgos_lunch"),
    keep("pl_biarritz_beachpause"),
    keep("pl_bordeaux_charge"),
    keep("pl_clermont_charge"),
    keep("pl_lyon_lunch"),
    new_loc(
        "pl_aix_camp",
        "campground",
        "Camping du Sierroz",
        "Aix-les-Bains",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Opening alpine-lake transit camp that keeps the first day moderate before the longer push into Provence.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "shade",
            "soft_pitch",
        ],
    ),
    new_loc(
        "pl_aix_market",
        "local food store",
        "Marche d'Aix-les-Bains",
        "Aix-les-Bains",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Good produce-and-cheese top-up before driving south.",
    ),
    new_loc(
        "pl_aix_lake",
        "beach",
        "Esplanade du Lac",
        "Aix-les-Bains",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Easy stroller-friendly lakefront reset after the first drive.",
    ),
    new_loc(
        "pl_annecy_oldtown",
        "sightseeing/miradouro/place-with-view",
        "Annecy vieille ville",
        "Annecy",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Scenic old-town leg stretch on the Geneva-Annecy approach.",
    ),
    new_loc(
        "pl_geneva_charge",
        "store",
        "Tesla Supercharger Geneva",
        "Geneva",
        "Geneva",
        "Switzerland",
        description="Early corridor top-up before crossing fully into France.",
        priority="practical",
    ),
    new_loc(
        "pl_camargue_camp",
        "campground",
        "Camping de la Brise",
        "Saintes-Maries-de-la-Mer",
        "Provence-Alpes-Cote d'Azur",
        "France",
        description="Beach-edge Camargue camp chosen for easy bird-park access, simple family beach time, and calmer pacing.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "playground",
            "shade",
            "soft_pitch",
        ],
    ),
    new_loc(
        "pl_pontdegau",
        "natural park",
        "Parc Ornithologique de Pont de Gau",
        "Saintes-Maries-de-la-Mer",
        "Provence-Alpes-Cote d'Azur",
        "France",
        description="Flat boardwalk bird park with flamingos and easy kid rhythm.",
        priority="unmissable",
    ),
    new_loc(
        "pl_salin_aiguesmortes",
        "sightseeing/miradouro/place-with-view",
        "Salin d'Aigues-Mortes",
        "Aigues-Mortes",
        "Occitanie",
        "France",
        description="Pink-salt landscape and selective food/co-op stop on the Camargue corridor.",
    ),
    new_loc(
        "pl_stesmaries_market",
        "local food store",
        "Marche des Saintes-Maries-de-la-Mer",
        "Saintes-Maries-de-la-Mer",
        "Provence-Alpes-Cote d'Azur",
        "France",
        description="Local produce and picnic provisioning for the beach-and-bird days.",
        priority="practical",
    ),
    new_loc(
        "pl_stesmaries_beach",
        "beach",
        "Plage des Arenes",
        "Saintes-Maries-de-la-Mer",
        "Provence-Alpes-Cote d'Azur",
        "France",
        description="Wide, low-fuss beach close enough to the campsite for a true parked-vehicle day.",
    ),
    new_loc(
        "pl_sete_market",
        "local food store",
        "Les Halles de Sete",
        "Sete",
        "Occitanie",
        "France",
        description="Seafood-forward market hall suited to lunch and fresh camp cooking provisions.",
        priority="unmissable",
    ),
    new_loc(
        "pl_peratallada",
        "sightseeing/miradouro/place-with-view",
        "Peratallada",
        "Peratallada",
        "Catalonia",
        "Spain",
        description="Stone medieval village that gives the Costa Brava stay a strong inland counterpoint.",
        priority="unmissable",
    ),
    new_loc(
        "pl_cami_ronda",
        "sightseeing/miradouro/place-with-view",
        "Cami de Ronda S'Agaro",
        "S'Agaro",
        "Catalonia",
        "Spain",
        description="Short cliffside promenade ideal for a stroller-friendly sea-view walk.",
    ),
    new_loc(
        "pl_barcelona_family",
        "hotel",
        "Barcelona family stay",
        "Barcelona",
        "Catalonia",
        "Spain",
        description="Fixed family-visit stop in Barcelona; not a campsite by explicit trip decision.",
        priority="anchor",
        features=["hot_showers", "clean_toilets", "quiet_after_22"],
    ),
    new_loc(
        "pl_barcelona_market",
        "local food store",
        "Mercat de Santa Caterina",
        "Barcelona",
        "Catalonia",
        "Spain",
        description="Best Barcelona market stop for stocking up without Boqueria crowds.",
        priority="worth_a_stop",
    ),
    new_loc(
        "pl_mies_pavilion",
        "sightseeing/miradouro/place-with-view",
        "Mies van der Rohe Pavilion",
        "Barcelona",
        "Catalonia",
        "Spain",
        description="Architecture stop worth the short local transfer during the family-visit block.",
        priority="worth_a_stop",
    ),
    new_loc(
        "pl_els_pescadors",
        "restaurant",
        "Els Pescadors",
        "Barcelona",
        "Catalonia",
        "Spain",
        description="Reliable seafood-leaning meal in a calmer neighborhood context.",
    ),
    new_loc(
        "pl_collvert",
        "campground",
        "Camping Coll Vert",
        "El Saler, Valencia",
        "Valencian Community",
        "Spain",
        description="Beach-and-Albufera base south of Valencia that avoids stressful city-center driving.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "shade",
            "playground",
            "pool",
            "laundry",
        ],
    ),
    new_loc(
        "pl_saler_beach",
        "beach",
        "Platja del Saler",
        "El Saler",
        "Valencian Community",
        "Spain",
        description="Long beach that works well for simple parked-vehicle days.",
    ),
    new_loc(
        "pl_albufera",
        "natural park",
        "Parc Natural de l'Albufera",
        "Valencia",
        "Valencian Community",
        "Spain",
        description="Low-effort lagoon landscapes and birdlife close to the campsite.",
    ),
    new_loc(
        "pl_saler_grocery",
        "supermarket",
        "Consum El Saler",
        "El Saler",
        "Valencian Community",
        "Spain",
        description="Practical grocery stop reachable without committing to central Valencia.",
        priority="practical",
    ),
    new_loc(
        "pl_saler_rest",
        "restaurant",
        "Arroceria Duna",
        "El Saler",
        "Valencian Community",
        "Spain",
        description="Rice-focused meal close to the dunes and lagoon.",
    ),
    new_loc(
        "pl_valencia_charge",
        "store",
        "Tesla Supercharger Valencia",
        "Valencia",
        "Valencian Community",
        "Spain",
        description="Main high-power charging fallback for the Valencia region block.",
        priority="practical",
    ),
    new_loc(
        "pl_alicante_oldtown",
        "sightseeing/miradouro/place-with-view",
        "Explanada de Espana",
        "Alicante",
        "Valencian Community",
        "Spain",
        description="Easy seafront reset on the way toward Murcia and Cabo de Gata.",
    ),
    new_loc(
        "pl_antequera_camp",
        "campground",
        "Camping La Sierrecilla",
        "Humilladero",
        "Andalusia",
        "Spain",
        description="Functional split-stop campsite that turns the long southeast-to-Andalusia transfer into two manageable family days.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "pool",
            "laundry",
        ],
    ),
    new_loc(
        "pl_antequera_market",
        "local food store",
        "Mercado de Abastos de Antequera",
        "Antequera",
        "Andalusia",
        "Spain",
        description="Fresh-food resupply before the westward run to El Rocio.",
        priority="practical",
    ),
    new_loc(
        "pl_antequera_view",
        "sightseeing/miradouro/place-with-view",
        "Alcazaba de Antequera",
        "Antequera",
        "Andalusia",
        "Spain",
        description="Compact evening wander if the family still has energy after arrival.",
    ),
    new_loc(
        "pl_guadix_break",
        "sightseeing/miradouro/place-with-view",
        "Guadix cave-house quarter",
        "Guadix",
        "Andalusia",
        "Spain",
        description="Memorable inland stop that breaks up the desert-to-Andalusia crossing.",
    ),
    new_loc(
        "pl_laaldea",
        "campground",
        "Camping La Aldea",
        "El Rocio",
        "Andalusia",
        "Spain",
        description="Doñana-edge campsite with family logistics and quieter evenings than a Seville city stay.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "pool",
            "playground",
            "laundry",
        ],
    ),
    new_loc(
        "pl_larocina",
        "natural park",
        "Centro de Visitantes La Rocina",
        "El Rocio",
        "Andalusia",
        "Spain",
        description="Shaded boardwalk wildlife stop that fits a true low-effort family base day.",
        priority="worth_a_stop",
    ),
    new_loc(
        "pl_elrocio_center",
        "sightseeing/miradouro/place-with-view",
        "Ermita de El Rocio",
        "El Rocio",
        "Andalusia",
        "Spain",
        description="Sandy-lane village center with horses, white facades, and easy evening wandering.",
    ),
    new_loc(
        "pl_elrocio_market",
        "supermarket",
        "Supermercado El Jamon El Rocio",
        "El Rocio",
        "Andalusia",
        "Spain",
        description="Practical provisions stop for the final camp nights before Portugal.",
        priority="practical",
    ),
    new_loc(
        "pl_elrocio_rest",
        "restaurant",
        "Restaurante Toruno",
        "El Rocio",
        "Andalusia",
        "Spain",
        description="Straightforward fish-and-rice meal close to the marsh edge.",
    ),
    new_loc(
        "pl_tavira_market",
        "local food store",
        "Mercado da Ribeira de Tavira",
        "Tavira",
        "Algarve",
        "Portugal",
        description="Selective east-Algarve market stop during the post-hotel transfer west.",
    ),
    new_loc(
        "pl_evora_camp",
        "campground",
        "Orbitur Evora",
        "Evora",
        "Alentejo",
        "Portugal",
        description="Olive-shaded Alentejo base that keeps the return route varied and calmer than pressing north immediately.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "shade",
            "pool",
            "laundry",
        ],
    ),
    new_loc(
        "pl_evora_market",
        "local food store",
        "Mercado Municipal 1 de Maio",
        "Evora",
        "Alentejo",
        "Portugal",
        description="Best provisioning stop for Alentejo produce, bread, and picnic supplies.",
        priority="practical",
    ),
    new_loc(
        "pl_evora_temple",
        "sightseeing/miradouro/place-with-view",
        "Templo Romano de Evora",
        "Evora",
        "Alentejo",
        "Portugal",
        description="Compact historic centerpiece that works well with small children.",
    ),
    new_loc(
        "pl_evora_rest",
        "restaurant",
        "Cafe Alentejo",
        "Evora",
        "Alentejo",
        "Portugal",
        description="Relaxed regional dinner option in the old town.",
    ),
    new_loc(
        "pl_merida_arch",
        "sightseeing/miradouro/place-with-view",
        "Puente Romano de Merida",
        "Merida",
        "Extremadura",
        "Spain",
        description="Historic bridge stop that turns a long inland transfer into a real place.",
    ),
    new_loc(
        "pl_merida_charge",
        "store",
        "Tesla Supercharger Merida",
        "Merida",
        "Extremadura",
        "Spain",
        description="Logical high-power charging stop on the Evora-Salamanca corridor.",
        priority="practical",
    ),
    new_loc(
        "pl_salamanca_camp",
        "campground",
        "Camping Don Quijote",
        "Cabrerizos, Salamanca",
        "Castile and Leon",
        "Spain",
        description="River-edge Salamanca camp chosen to give the family an inland historic-city pause without losing campsite comfort.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "playground",
            "pool",
            "laundry",
        ],
    ),
    new_loc(
        "pl_salamanca_market",
        "local food store",
        "Mercado Central de Salamanca",
        "Salamanca",
        "Castile and Leon",
        "Spain",
        description="Fresh inland produce and easy lunch options in the old center.",
        priority="practical",
    ),
    new_loc(
        "pl_salamanca_plaza",
        "sightseeing/miradouro/place-with-view",
        "Plaza Mayor de Salamanca",
        "Salamanca",
        "Castile and Leon",
        "Spain",
        description="Evening wander anchor for the Salamanca base day.",
    ),
    new_loc(
        "pl_salamanca_rest",
        "restaurant",
        "Casa Paca",
        "Salamanca",
        "Castile and Leon",
        "Spain",
        description="Classic table for a final inland Spain dinner if timing works.",
    ),
    new_loc(
        "pl_chillida",
        "natural park",
        "Chillida Leku",
        "Hernani",
        "Basque Country",
        "Spain",
        description="Forest-and-sculpture outing strong enough to justify the Basque base.",
        priority="unmissable",
    ),
    new_loc(
        "pl_hondarribia",
        "sightseeing/miradouro/place-with-view",
        "Hondarribia old town",
        "Hondarribia",
        "Basque Country",
        "Spain",
        description="Selective walled-town outing with good food shops and low-stress wandering.",
    ),
    new_loc(
        "pl_capbreton_fish",
        "local food store",
        "March aux Poissons de Capbreton",
        "Capbreton",
        "Nouvelle-Aquitaine",
        "France",
        description="Fresh fish buying stop that makes the Landes base feel distinct from the rest of the coast.",
        priority="unmissable",
    ),
    new_loc(
        "pl_lac_hossegor",
        "beach",
        "Lac d'Hossegor",
        "Hossegor",
        "Nouvelle-Aquitaine",
        "France",
        description="Calmer small-kids water option than the open Atlantic surf beaches.",
    ),
    new_loc(
        "pl_royat",
        "campground",
        "Huttopia Royat",
        "Royat",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Final volcanic-landscape camp that keeps the return split humane before Switzerland.",
        priority="anchor",
        features=[
            "van_ok",
            "rooftop_tent_ok",
            "hot_showers",
            "clean_toilets",
            "quiet_after_22",
            "shade",
            "playground",
            "pool",
            "laundry",
        ],
    ),
    new_loc(
        "pl_puydedome",
        "sightseeing/miradouro/place-with-view",
        "Panoramique des Domes",
        "Orcines",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Low-effort volcano panorama that still feels like a true place on the last night.",
    ),
    new_loc(
        "pl_clermont_market",
        "local food store",
        "Marche Saint-Pierre Clermont-Ferrand",
        "Clermont-Ferrand",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Fresh-food stop for the final dinner and next-morning road supplies.",
        priority="practical",
    ),
    new_loc(
        "pl_royat_rest",
        "restaurant",
        "La Flamme Royat",
        "Royat",
        "Auvergne-Rhone-Alpes",
        "France",
        description="Simple final-night meal near the campsite.",
    ),
]


LOCATION_IDS = {loc["id"] for loc in LOCATIONS}


def wp(prefix, order, location_id, role, notes, stay=None):
    return {
        "id": f"{prefix}_wp_{order}",
        "order": order,
        "location_id": location_id,
        "role": role,
        "notes": notes,
        "stay_duration_minutes": stay,
    }


def route_option(style, summary, distance, duration, url, selected, waypoints):
    return {
        "style": style,
        "summary": summary,
        "distance_km": distance,
        "duration_minutes": duration,
        "open_route_url": url,
        "is_selected": selected,
        "line": [],
        "waypoints": waypoints,
    }


def car_movement(day_id, start_id, end_id, summary, distance, duration, route_url, route_waypoints, route_options):
    return {
        "id": f"{day_id}_drive",
        "mode": "car",
        "summary": summary,
        "start_location_id": start_id,
        "end_location_id": end_id,
        "distance_km": distance,
        "duration_minutes": duration,
        "route": {
            "open_route_url": route_url,
            "line": [],
            "waypoints": route_waypoints,
        },
        "route_options": route_options,
    }


def stop(day_id, idx, location_id, role, note=""):
    out = {"id": f"{day_id}_stop_{idx}", "location_id": location_id, "role": role}
    if note:
        out["note"] = note
    return out


def nearby(location_id, note):
    return {"location_id": location_id, "note": note}


BASELINE = json.loads((ROOT / "inputs/baseline_route.codex-gpt-5.4-v1.json").read_text())
LEG_MAP = {leg["id"]: leg for leg in BASELINE["legs"]}


def leg_option(leg_id, style):
    for opt in LEG_MAP[leg_id]["route_options"]:
        if opt["style"] == style:
            return opt
    raise KeyError((leg_id, style))


def route_options_from_leg(leg_id, variants):
    out = []
    for style, selected, summary, waypoints in variants:
        opt = leg_option(leg_id, style)
        out.append(
            route_option(
                style,
                summary,
                opt["total_km"],
                opt["duration_minutes"],
                opt["maps_url"],
                selected,
                waypoints,
            )
        )
    return out


def base_day(day_id, day_number, dt, wake_id, sleep_id, summary, nearby_items, stop_items):
    return {
        "id": day_id,
        "day_number": day_number,
        "date": dt.isoformat(),
        "summary": summary,
        "wake_location_id": wake_id,
        "sleep_location_id": sleep_id,
        "nearby_suggestions": nearby_items,
        "movements": [],
        "stops": stop_items,
    }


days = []
start = date(2026, 6, 4)


def add_day(offset, wake, sleep, summary, nearby_items, movements, stop_items):
    dt = start + timedelta(days=offset)
    day_id = f"day_{dt.isoformat()}"
    days.append(
        {
            "id": day_id,
            "day_number": offset + 1,
            "date": dt.isoformat(),
            "summary": summary,
            "wake_location_id": wake,
            "sleep_location_id": sleep,
            "nearby_suggestions": nearby_items,
            "movements": movements,
            "stops": stop_items,
        }
    )


# Day 1
day_id = "day_2026-06-04"
sel_wps = [
    wp(day_id, 1, "pl_geneva_charge", "charge", "Short top-up before the French leg if the pack was not at 100%.", 25),
    wp(day_id, 2, "pl_annecy_oldtown", "family_rest", "Old-town and lakefront leg stretch.", 60),
    wp(day_id, 3, "pl_aix_market", "fresh_food", "Buy first-night provisions and breakfast supplies.", 35),
]
opts = [
    ("fast", False, "Direct motorway-biased approach via Lausanne and Geneva.", [wp(day_id, 1, "pl_geneva_charge", "charge", "Direct-route charge.", 20), wp(day_id, 2, "pl_aix_market", "fresh_food", "Quick provisions before camp.", 30)]),
    ("scenic", True, "Preferred route via Geneva and Annecy for a gentler first day and a better family stop.", sel_wps),
    ("no_highways", False, "Slow lake-road version if you want a stress-light opening at the cost of time.", [wp(day_id, 1, "pl_annecy_oldtown", "family_rest", "Lakefront stop.", 60), wp(day_id, 2, "pl_aix_market", "fresh_food", "Village-market stop.", 30)]),
]
add_day(
    0,
    "pl_zurich_home",
    "pl_aix_camp",
    "Opening transit day to an alpine-lake camp so the family starts settled rather than chasing Provence in one push.",
    [
        nearby("pl_aix_lake", "Easy evening lakefront unwind after setup."),
        nearby("pl_aix_market", "Fresh dinner and breakfast provisions close to camp."),
    ],
    [
        car_movement(
            day_id,
            "pl_zurich_home",
            "pl_aix_camp",
            "Zurich to Aix-les-Bains via the Geneva-Annecy corridor.",
            369.0,
            272,
            leg_option("leg_01", "scenic")["maps_url"],
            sel_wps,
            route_options_from_leg("leg_01", opts),
        )
    ],
    [
        stop(day_id, 1, "pl_zurich_home", "wake", "Final pack check and departure."),
        stop(day_id, 2, "pl_geneva_charge", "charge", "Optional early top-up."),
        stop(day_id, 3, "pl_ch_ionity_martigny", "charge", "Backup charge if starting with lower state of charge."),
        stop(day_id, 4, "pl_annecy_oldtown", "activity", "Primary lunch-and-rest option."),
        stop(day_id, 5, "pl_aix_market", "groceries", "Fresh-food stop before camp."),
        stop(day_id, 6, "pl_aix_lake", "activity", "Short lakefront walk after setup."),
        stop(day_id, 7, "pl_aix_camp", "sleep", "Opening transit night."),
    ],
)

# Day 2
day_id = "day_2026-06-05"
sel_wps = [
    wp(day_id, 1, "pl_aix_market", "bakery", "Pick up bread before leaving Aix.", 20),
    wp(day_id, 2, "pl_fontvieille_market", "fresh_food", "Late-morning market stop around the Rhône corridor.", 30),
    wp(day_id, 3, "pl_fontvieille", "destination", "Arrive with time to set up before dinner.", None),
]
add_day(
    1,
    "pl_aix_camp",
    "pl_fontvieille",
    "Long but manageable southbound push that combines the Aix-les-Bains and Valence baseline legs to buy more stationary nights in Provence.",
    [
        nearby("pl_fontvieille_activity", "Short mill walk for the evening."),
        nearby("pl_fontvieille_bakery", "Reliable bread stop for the Provence block."),
        nearby("pl_fontvieille_market", "Village produce for camp cooking."),
    ],
    [
        car_movement(
            day_id,
            "pl_aix_camp",
            "pl_fontvieille",
            "Aix-les-Bains to Fontvieille via the Valence-Rhône corridor.",
            384.3,
            260,
            "",
            sel_wps,
            [
                route_option("fast", "Fastest A7-led corridor to Provence.", 384.3, 260, "", False, [wp(day_id, 1, "pl_ch_ionity_martigny", "charge", "Not usually needed if full; kept as fallback.", 20), wp(day_id, 2, "pl_fontvieille_market", "fresh_food", "Arrival provisions.", 30)]),
                route_option("scenic", "Preferred route with a market-and-village bias before camp.", 418.0, 315, "", True, sel_wps),
                route_option("no_highways", "N-road alternative for lower stress if traffic is rough.", 405.0, 345, "", False, [wp(day_id, 1, "pl_fontvieille_market", "fresh_food", "Local produce stop.", 30)]),
            ],
        )
    ],
    [
        stop(day_id, 1, "pl_aix_camp", "wake", "Break camp after breakfast."),
        stop(day_id, 2, "pl_aix_market", "bakery", "Morning bread and fruit."),
        stop(day_id, 3, "pl_fontvieille_market", "groceries", "Primary fresh-food stop."),
        stop(day_id, 4, "pl_fontvieille_rest", "meal", "Easy arrival dinner option."),
        stop(day_id, 5, "pl_fontvieille_activity", "activity", "Evening leg stretch among the mills."),
        stop(day_id, 6, "pl_fontvieille", "sleep", "Provence base night 1 of 3."),
    ],
)

for offset, summary, activity_note in [
    (2, "Settled Provence base day with the vehicle parked at Fontvieille.", "Best simple outing on foot from camp."),
    (3, "Second Provence base day for markets, shade, and a slower family rhythm.", "Repeatable low-effort walk if the heat rises."),
]:
    dt = start + timedelta(days=offset)
    day_id = f"day_{dt.isoformat()}"
    add_day(
        offset,
        "pl_fontvieille",
        "pl_fontvieille",
        summary,
        [
            nearby("pl_fontvieille_activity", activity_note),
            nearby("pl_fontvieille_bakery", "Morning bread run on foot or bike."),
            nearby("pl_fontvieille_market", "Produce and picnic supplies."),
            nearby("pl_fontvieille_rest", "Relaxed Provençal dinner nearby."),
        ],
        [],
        [
            stop(day_id, 1, "pl_fontvieille", "wake", "Keep the van parked."),
            stop(day_id, 2, "pl_fontvieille_bakery", "bakery", "Fresh bread and pastries."),
            stop(day_id, 3, "pl_fontvieille_activity", "activity", "Primary low-effort walk."),
            stop(day_id, 4, "pl_fontvieille_market", "groceries", "Local dinner supplies."),
            stop(day_id, 5, "pl_fontvieille_rest", "meal", "Optional restaurant night."),
            stop(day_id, 6, "pl_fontvieille", "sleep", f"Provence base night {offset} of 3."),
        ],
    )

# Day 5
day_id = "day_2026-06-08"
sel_wps = [
    wp(day_id, 1, "pl_salin_aiguesmortes", "activity", "Salt-flat stop on the scenic Camargue line.", 60),
    wp(day_id, 2, "pl_stesmaries_market", "fresh_food", "Buy seafood, fruit, and picnic supplies before settling in.", 35),
]
add_day(
    4,
    "pl_fontvieille",
    "pl_camargue_camp",
    "Short scenic relocation from Provence into the Camargue for birds, beach, and a more elemental landscape.",
    [
        nearby("pl_pontdegau", "Bird-park outing for tomorrow morning."),
        nearby("pl_stesmaries_beach", "Walkable beach time from the campsite."),
        nearby("pl_stesmaries_market", "Fresh-food supplies in town."),
    ],
    [
        car_movement(
            day_id,
            "pl_fontvieille",
            "pl_camargue_camp",
            "Fontvieille to Saintes-Maries-de-la-Mer using the Camargue belt rather than the direct motorway.",
            145.0,
            160,
            leg_option("leg_04", "scenic")["maps_url"],
            sel_wps,
            [
                route_option("fast", "Direct hop via Arles toward the coast.", 120.0, 115, leg_option("leg_04", "fast")["maps_url"], False, [wp(day_id, 1, "pl_stesmaries_market", "fresh_food", "Quick arrival provisions.", 30)]),
                route_option("scenic", "Preferred Saintes-Maries and salt-flat line.", 145.0, 160, leg_option("leg_04", "scenic")["maps_url"], True, sel_wps),
                route_option("no_highways", "Back-road marsh approach if coastal traffic is light.", 138.0, 175, leg_option("leg_04", "no_highways")["maps_url"], False, [wp(day_id, 1, "pl_salin_aiguesmortes", "activity", "Salt-flat photo stop.", 45)]),
            ],
        )
    ],
    [
        stop(day_id, 1, "pl_fontvieille", "wake", "Break the Provence base."),
        stop(day_id, 2, "pl_salin_aiguesmortes", "activity", "Scenic salt-flat stop."),
        stop(day_id, 3, "pl_stesmaries_market", "groceries", "Buy dinner and breakfast."),
        stop(day_id, 4, "pl_stesmaries_beach", "activity", "Late-afternoon beach if wind is calm."),
        stop(day_id, 5, "pl_camargue_camp", "sleep", "Camargue base night 1 of 2."),
    ],
)

day_id = "day_2026-06-09"
add_day(
    5,
    "pl_camargue_camp",
    "pl_camargue_camp",
    "Full Camargue base day focused on flamingos, beach, and low-effort coastal wandering.",
    [
        nearby("pl_pontdegau", "Primary family outing with boardwalks and flamingos."),
        nearby("pl_stesmaries_beach", "Flexible beach window after naps or after the bird park."),
        nearby("pl_stesmaries_market", "Provisioning without moving the vehicle far."),
    ],
    [],
    [
        stop(day_id, 1, "pl_camargue_camp", "wake", "Keep the car parked."),
        stop(day_id, 2, "pl_pontdegau", "activity", "Morning wildlife stop."),
        stop(day_id, 3, "pl_stesmaries_market", "groceries", "Lunch fixings and fruit."),
        stop(day_id, 4, "pl_stesmaries_beach", "activity", "Afternoon beach."),
        stop(day_id, 5, "pl_camargue_camp", "sleep", "Camargue base night 2 of 2."),
    ],
)

# Day 7
day_id = "day_2026-06-10"
sel_wps = [
    wp(day_id, 1, "pl_sete_market", "lunch", "Seafood-market lunch and provisions.", 60),
    wp(day_id, 2, "pl_narbonne_charger", "charge", "Main charge on the French-Spanish corridor.", 30),
    wp(day_id, 3, "pl_peratallada", "activity", "Late-afternoon medieval-village stop if energy allows.", 45),
]
add_day(
    6,
    "pl_camargue_camp",
    "pl_santacristina",
    "Cross-border drive to the Costa Brava using Sète and Narbonne as the practical and culinary structure of the day.",
    [
        nearby("pl_cami_ronda", "Sunset stroll on the first Costa Brava evening."),
        nearby("pl_santacristina_bakery", "Bread close to camp."),
        nearby("pl_santacristina_grocery", "Main grocery for the three-night stay."),
    ],
    [
        car_movement(
            day_id,
            "pl_camargue_camp",
            "pl_santacristina",
            "Saintes-Maries-de-la-Mer to Santa Cristina d'Aro along the Mediterranean corridor.",
            leg_option("leg_05", "fast")["total_km"],
            leg_option("leg_05", "fast")["duration_minutes"],
            leg_option("leg_05", "fast")["maps_url"],
            [wp(day_id, 1, "pl_sete_market", "lunch", "Preferred market lunch stop.", 60), wp(day_id, 2, "pl_narbonne_charger", "charge", "Primary charge before Spain.", 30)],
            route_options_from_leg(
                "leg_05",
                [
                    ("fast", True, "Preferred time-balanced line with Sète lunch and Narbonne charging.", [wp(day_id, 1, "pl_sete_market", "lunch", "Market lunch.", 60), wp(day_id, 2, "pl_narbonne_charger", "charge", "Corridor charge.", 30)]),
                    ("scenic", False, "Longer coastal run via Collioure and Portbou.", [wp(day_id, 1, "pl_sete_market", "lunch", "Seafood market.", 60), wp(day_id, 2, "pl_peratallada", "activity", "Arrival-area scenic detour.", 45)]),
                    ("no_highways", False, "Lower-stress inland line via Narbonne, Perpignan, and Figueres.", [wp(day_id, 1, "pl_narbonne_charger", "charge", "Charge near lunch stop.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_camargue_camp", "wake", "Break camp after breakfast."),
        stop(day_id, 2, "pl_sete_market", "meal", "Primary lunch option."),
        stop(day_id, 3, "pl_narbonne_charger", "charge", "Primary charge option."),
        stop(day_id, 4, "pl_peratallada", "activity", "Interesting stop on arrival side."),
        stop(day_id, 5, "pl_santacristina_grocery", "groceries", "Set up the Costa Brava base."),
        stop(day_id, 6, "pl_santacristina", "sleep", "Costa Brava base night 1 of 3."),
    ],
)

for offset, act in [(7, "Short coast-path or beach window without moving the vehicle far."), (8, "Swap the beach for Peratallada or a shorter cove outing.")]:
    dt = start + timedelta(days=offset)
    day_id = f"day_{dt.isoformat()}"
    add_day(
        offset,
        "pl_santacristina",
        "pl_santacristina",
        "Costa Brava base day with the car kept parked as much as possible.",
        [
            nearby("pl_cami_ronda", act),
            nearby("pl_santacristina_activity", "Family-friendly cove for an easy beach block."),
            nearby("pl_santacristina_bakery", "Morning bread and pastries."),
            nearby("pl_santacristina_grocery", "Groceries and picnic supplies."),
            nearby("pl_santacristina_rest", "Simple Catalan dinner close to camp."),
        ],
        [],
        [
            stop(day_id, 1, "pl_santacristina", "wake", "Keep camp settled."),
            stop(day_id, 2, "pl_santacristina_bakery", "bakery", "Breakfast run."),
            stop(day_id, 3, "pl_santacristina_activity", "activity", "Beach time."),
            stop(day_id, 4, "pl_cami_ronda", "activity", "Sea-view walk option."),
            stop(day_id, 5, "pl_santacristina_grocery", "groceries", "Lunch and dinner supplies."),
            stop(day_id, 6, "pl_santacristina_rest", "meal", "Optional dinner out."),
            stop(day_id, 7, "pl_santacristina", "sleep", f"Costa Brava base night {offset-6} of 3."),
        ],
    )

# Barcelona
day_id = "day_2026-06-13"
add_day(
    9,
    "pl_santacristina",
    "pl_barcelona_family",
    "Short family-visit transfer into Barcelona with enough buffer to avoid stressful timing or city-center searching.",
    [
        nearby("pl_barcelona_market", "Best practical market during the visit."),
        nearby("pl_mies_pavilion", "Strong short architecture outing."),
        nearby("pl_els_pescadors", "Reliable family dinner option away from the densest core."),
    ],
    [
        car_movement(
            day_id,
            "pl_santacristina",
            "pl_barcelona_family",
            "Costa Brava to Barcelona family visit.",
            leg_option("leg_06", "fast")["total_km"],
            leg_option("leg_06", "fast")["duration_minutes"],
            leg_option("leg_06", "fast")["maps_url"],
            [wp(day_id, 1, "pl_barcelona_market", "fresh_food", "Pick up visit supplies after arrival.", 35)],
            route_options_from_leg(
                "leg_06",
                [
                    ("fast", True, "Fast arrival into the family-visit zone.", [wp(day_id, 1, "pl_barcelona_market", "fresh_food", "Arrival provisioning.", 35)]),
                    ("scenic", False, "Sea-view route via Tossa de Mar and the Maresme coast.", [wp(day_id, 1, "pl_tarragona_lunch", "meal", "Fallback lunch if leaving later.", 45)]),
                    ("no_highways", False, "Coastal local-road option if motorway flow is unpleasant.", [wp(day_id, 1, "pl_barcelona_market", "fresh_food", "Market stop on arrival.", 35)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_santacristina", "wake", "Short final morning at camp."),
        stop(day_id, 2, "pl_barcelona_market", "groceries", "Family-visit provisions."),
        stop(day_id, 3, "pl_mies_pavilion", "activity", "Compact outing if timing works."),
        stop(day_id, 4, "pl_els_pescadors", "meal", "Dinner option."),
        stop(day_id, 5, "pl_barcelona_family", "sleep", "Barcelona family visit night."),
    ],
)

# Valencia base
day_id = "day_2026-06-14"
sel = [wp(day_id, 1, "pl_tarragona_lunch", "meal", "Sea-view lunch on the way south.", 50), wp(day_id, 2, "pl_castellon_charge", "charge", "Main corridor charge.", 30), wp(day_id, 3, "pl_valencia_charge", "charge", "Arrival-side backup charge.", 20)]
add_day(
    10,
    "pl_barcelona_family",
    "pl_collvert",
    "Southbound drive to the Valencia coast, using El Saler so the family gets beaches and Albufera rather than urban campsite logistics.",
    [
        nearby("pl_saler_beach", "Dunes-and-beach reset after arrival."),
        nearby("pl_albufera", "Low-effort lagoon outing for the next day."),
        nearby("pl_saler_grocery", "Main practical grocery close to the camp."),
    ],
    [
        car_movement(
            day_id,
            "pl_barcelona_family",
            "pl_collvert",
            "Barcelona to El Saler / Valencia coast.",
            leg_option("leg_07", "fast")["total_km"],
            leg_option("leg_07", "fast")["duration_minutes"],
            leg_option("leg_07", "fast")["maps_url"],
            [wp(day_id, 1, "pl_tarragona_lunch", "meal", "Preferred lunch stop.", 50), wp(day_id, 2, "pl_castellon_charge", "charge", "Best combined rest-and-charge point.", 30)],
            route_options_from_leg(
                "leg_07",
                [
                    ("fast", True, "Preferred fast coastal line with Tarragona lunch and Castellon charging.", [wp(day_id, 1, "pl_tarragona_lunch", "meal", "Lunch by the sea.", 50), wp(day_id, 2, "pl_castellon_charge", "charge", "Primary charge.", 30)]),
                    ("scenic", False, "Prettier coast-hugging route via Sitges and Peniscola.", [wp(day_id, 1, "pl_tarragona_lunch", "meal", "Lunch break.", 50), wp(day_id, 2, "pl_saler_beach", "activity", "Straight-to-beach arrival if charging is not needed.", 30)]),
                    ("no_highways", False, "Slower no-toll line via Tarragona and the Delta corridor.", [wp(day_id, 1, "pl_castellon_charge", "charge", "Charge if the slower route is chosen.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_barcelona_family", "wake", "Depart after family breakfast."),
        stop(day_id, 2, "pl_tarragona_lunch", "meal", "Primary lunch option."),
        stop(day_id, 3, "pl_castellon_charge", "charge", "Primary EV charge."),
        stop(day_id, 4, "pl_valencia_charge", "charge", "Arrival-side fallback charge."),
        stop(day_id, 5, "pl_saler_grocery", "groceries", "Set up the next two nights."),
        stop(day_id, 6, "pl_collvert", "sleep", "Valencia coast base night 1 of 3."),
    ],
)

for offset in [11, 12]:
    dt = start + timedelta(days=offset)
    day_id = f"day_{dt.isoformat()}"
    add_day(
        offset,
        "pl_collvert",
        "pl_collvert",
        "Parked-vehicle Valencia coast day focused on the dunes, lagoon, and easy food access.",
        [
            nearby("pl_saler_beach", "Main beach block close to camp."),
            nearby("pl_albufera", "Lagoon nature outing with minimal effort."),
            nearby("pl_saler_grocery", "Practical daily food stop."),
            nearby("pl_saler_rest", "Rice lunch or dinner nearby."),
        ],
        [],
        [
            stop(day_id, 1, "pl_collvert", "wake", "Keep the car parked."),
            stop(day_id, 2, "pl_saler_beach", "activity", "Beach time."),
            stop(day_id, 3, "pl_albufera", "activity", "Lagoon and boardwalk option."),
            stop(day_id, 4, "pl_saler_grocery", "groceries", "Picnic and dinner supplies."),
            stop(day_id, 5, "pl_saler_rest", "meal", "Optional paella dinner."),
            stop(day_id, 6, "pl_collvert", "sleep", f"Valencia coast base night {offset-10} of 3."),
        ],
    )

# Cabo
day_id = "day_2026-06-17"
add_day(
    13,
    "pl_collvert",
    "pl_cabodegata",
    "Move from the Valencia coast to Cabo de Gata, keeping the day structured with one main charge and an Alicante seafront reset.",
    [
        nearby("pl_cabo_activity", "Short viewpoint outing for tomorrow."),
        nearby("pl_cabo_bakery", "Useful early bread run."),
        nearby("pl_cabo_grocery", "Stock up for the desert-coast stay."),
    ],
    [
        car_movement(
            day_id,
            "pl_collvert",
            "pl_cabodegata",
            "El Saler to Cabo de Gata via Alicante and Murcia.",
            leg_option("leg_08", "fast")["total_km"],
            leg_option("leg_08", "fast")["duration_minutes"],
            leg_option("leg_08", "fast")["maps_url"],
            [wp(day_id, 1, "pl_alicante_oldtown", "family_rest", "Seafront leg stretch.", 45), wp(day_id, 2, "pl_murcia_charge", "charge", "Main pre-Cabo charge.", 30)],
            route_options_from_leg(
                "leg_08",
                [
                    ("fast", True, "Preferred direct line with Alicante reset and Murcia charging.", [wp(day_id, 1, "pl_alicante_oldtown", "family_rest", "Promenade stop.", 45), wp(day_id, 2, "pl_murcia_charge", "charge", "Primary charge.", 30)]),
                    ("scenic", False, "Longer coast-hugging option via Altea and Cabo de Palos.", [wp(day_id, 1, "pl_alicante_oldtown", "family_rest", "Coastal stop.", 45)]),
                    ("no_highways", False, "N-332-heavy version through smaller coast towns.", [wp(day_id, 1, "pl_murcia_charge", "charge", "Likely needed with slower pacing.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_collvert", "wake", "Break the Valencia base."),
        stop(day_id, 2, "pl_alicante_oldtown", "activity", "Primary family reset."),
        stop(day_id, 3, "pl_murcia_charge", "charge", "Primary EV charge."),
        stop(day_id, 4, "pl_cabo_grocery", "groceries", "Arrival provisioning."),
        stop(day_id, 5, "pl_cabo_rest", "meal", "Easy dinner option."),
        stop(day_id, 6, "pl_cabodegata", "sleep", "Cabo de Gata base night 1 of 2."),
    ],
)

day_id = "day_2026-06-18"
add_day(
    14,
    "pl_cabodegata",
    "pl_cabodegata",
    "Full Cabo de Gata base day for one strong desert-coast outing and then a mostly parked rhythm.",
    [
        nearby("pl_cabo_activity", "Best compact scenic outing from the camp."),
        nearby("pl_cabo_bakery", "Bread and pastries before the heat builds."),
        nearby("pl_cabo_grocery", "Practical supplies for camp meals."),
        nearby("pl_cabo_rest", "Simple seafood dinner nearby."),
    ],
    [],
    [
        stop(day_id, 1, "pl_cabodegata", "wake", "Keep the vehicle parked."),
        stop(day_id, 2, "pl_cabo_bakery", "bakery", "Morning bread run."),
        stop(day_id, 3, "pl_cabo_activity", "activity", "Main scenic outing."),
        stop(day_id, 4, "pl_cabo_grocery", "groceries", "Picnic and dinner supplies."),
        stop(day_id, 5, "pl_cabo_rest", "meal", "Optional fish dinner."),
        stop(day_id, 6, "pl_cabodegata", "sleep", "Cabo de Gata base night 2 of 2."),
    ],
)

# Split to Andalusia west
day_id = "day_2026-06-19"
add_day(
    15,
    "pl_cabodegata",
    "pl_antequera_camp",
    "Intentional split of the long Cartagena-to-Seville baseline leg so the family avoids an exhausting 500 km+ day.",
    [
        nearby("pl_antequera_view", "Compact old-town wander after setup."),
        nearby("pl_antequera_market", "Fresh resupply before the next day."),
    ],
    [
        car_movement(
            day_id,
            "pl_cabodegata",
            "pl_antequera_camp",
            "Cabo de Gata to the Antequera corridor via inland Andalusia.",
            320.0,
            240,
            "",
            [wp(day_id, 1, "pl_guadix_break", "activity", "Cave-house quarter stop.", 45), wp(day_id, 2, "pl_antequera_market", "fresh_food", "Arrival-side provisions.", 30)],
            [
                route_option("fast", "Fast inland split-day line toward Antequera.", 320.0, 240, "", True, [wp(day_id, 1, "pl_guadix_break", "activity", "Main scenic stop.", 45)]),
                route_option("scenic", "Longer split-day line that lingers more in the Guadix-Granada landscape.", 355.0, 285, "", False, [wp(day_id, 1, "pl_guadix_break", "activity", "Longer old-quarter pause.", 60)]),
                route_option("no_highways", "Slow regional-road variant only if motorway conditions are poor.", 390.0, 360, "", False, [wp(day_id, 1, "pl_guadix_break", "activity", "Slow-travel stop.", 45)]),
            ],
        )
    ],
    [
        stop(day_id, 1, "pl_cabodegata", "wake", "Break camp after breakfast."),
        stop(day_id, 2, "pl_guadix_break", "activity", "Primary family leg stretch."),
        stop(day_id, 3, "pl_murcia_charge", "charge", "Last strong charger before inland Andalucía if needed."),
        stop(day_id, 4, "pl_antequera_market", "groceries", "Dinner and breakfast supplies."),
        stop(day_id, 5, "pl_antequera_view", "activity", "Short old-town walk on arrival."),
        stop(day_id, 6, "pl_antequera_camp", "sleep", "Single split night for route logic."),
    ],
)

day_id = "day_2026-06-20"
add_day(
    16,
    "pl_antequera_camp",
    "pl_laaldea",
    "Second half of the Andalucía crossing to a calmer Doñana-edge camp instead of pushing straight into the Algarve.",
    [
        nearby("pl_larocina", "Best short wetland outing for tomorrow."),
        nearby("pl_elrocio_market", "Walkable provisions in the village."),
        nearby("pl_elrocio_center", "Evening wander in the sandy-lane center."),
    ],
    [
        car_movement(
            day_id,
            "pl_antequera_camp",
            "pl_laaldea",
            "Antequera corridor to El Rocio / Doñana edge.",
            260.0,
            210,
            "",
            [wp(day_id, 1, "pl_elrocio_market", "fresh_food", "Arrival-side provisions.", 25)],
            [
                route_option("fast", "Fastest westbound line into El Rocio.", 260.0, 210, "", True, [wp(day_id, 1, "pl_elrocio_market", "fresh_food", "Provisions after arrival.", 25)]),
                route_option("scenic", "Route that leans toward marsh-edge scenery before camp.", 305.0, 250, "", False, [wp(day_id, 1, "pl_elrocio_center", "activity", "Village-center pause.", 35)]),
                route_option("no_highways", "Regional-road variant if motorway fatigue is high.", 330.0, 320, "", False, [wp(day_id, 1, "pl_elrocio_market", "fresh_food", "Village groceries.", 25)]),
            ],
        )
    ],
    [
        stop(day_id, 1, "pl_antequera_camp", "wake", "Break camp."),
        stop(day_id, 2, "pl_antequera_market", "groceries", "Morning top-up."),
        stop(day_id, 3, "pl_elrocio_market", "groceries", "Arrival provisions."),
        stop(day_id, 4, "pl_elrocio_center", "activity", "Evening wander among the sandy lanes."),
        stop(day_id, 5, "pl_laaldea", "sleep", "Doñana / western Andalusia base night 1 of 2."),
    ],
)

day_id = "day_2026-06-21"
add_day(
    17,
    "pl_laaldea",
    "pl_laaldea",
    "Doñana-edge base day with the car parked and the focus on birds, horses, and easy village wandering.",
    [
        nearby("pl_larocina", "Boardwalk and shaded wildlife outing."),
        nearby("pl_elrocio_center", "Short village-center wander."),
        nearby("pl_elrocio_market", "Simple grocery and picnic stop."),
        nearby("pl_elrocio_rest", "Low-friction dinner option."),
    ],
    [],
    [
        stop(day_id, 1, "pl_laaldea", "wake", "Keep the vehicle parked."),
        stop(day_id, 2, "pl_larocina", "activity", "Morning wetland walk."),
        stop(day_id, 3, "pl_elrocio_market", "groceries", "Dinner and snacks."),
        stop(day_id, 4, "pl_elrocio_center", "activity", "Late-afternoon wander."),
        stop(day_id, 5, "pl_elrocio_rest", "meal", "Optional dinner out."),
        stop(day_id, 6, "pl_laaldea", "sleep", "Doñana / western Andalusia base night 2 of 2."),
    ],
)

# Monte Gordo
day_id = "day_2026-06-22"
add_day(
    18,
    "pl_laaldea",
    "pl_dunasmar",
    "Short cross-border transfer to the fixed Monte Gordo hotel anchor, with the rest of the day kept intentionally light.",
    [
        nearby("pl_mg_activity", "Beach immediately available once checked in."),
        nearby("pl_mg_bakery", "Morning bread for the hotel week."),
        nearby("pl_mg_grocery", "Walkable supplies during the fixed stay."),
    ],
    [
        car_movement(
            day_id,
            "pl_laaldea",
            "pl_dunasmar",
            "El Rocio to Hotel Dunas Mar via Huelva and the Guadiana crossing.",
            165.0,
            130,
            leg_option("leg_10", "fast")["maps_url"],
            [wp(day_id, 1, "pl_mg_grocery", "fresh_food", "Easy arrival provisions.", 20)],
            route_options_from_leg(
                "leg_10",
                [
                    ("fast", True, "Fastest border-crossing line to Monte Gordo.", [wp(day_id, 1, "pl_mg_grocery", "fresh_food", "Arrival groceries.", 20)]),
                    ("scenic", False, "Preferred if you want El Rocio-Huelva-Ayamonte as part of the day.", [wp(day_id, 1, "pl_elrocio_center", "activity", "Short departure walk.", 20)]),
                    ("no_highways", False, "Regional-road alternative through Huelva and Ayamonte.", [wp(day_id, 1, "pl_mg_grocery", "fresh_food", "Provisions after arrival.", 20)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_laaldea", "wake", "Final camp breakdown before the hotel week."),
        stop(day_id, 2, "pl_mg_grocery", "groceries", "Stock the room and beach bag."),
        stop(day_id, 3, "pl_mg_activity", "activity", "Arrival beach window."),
        stop(day_id, 4, "pl_dunasmar", "sleep", "Fixed hotel anchor begins."),
    ],
)

for offset in range(19, 25):
    dt = start + timedelta(days=offset)
    day_id = f"day_{dt.isoformat()}"
    add_day(
        offset,
        "pl_dunasmar",
        "pl_dunasmar",
        "Monte Gordo hotel base day with the vehicle left parked and the rhythm centered on beach, bakery, and easy family meals.",
        [
            nearby("pl_mg_activity", "Main beach day option."),
            nearby("pl_mg_bakery", "Morning pastries and bread."),
            nearby("pl_mg_grocery", "Practical provisions without moving the car."),
            nearby("pl_mg_rest", "Seafood dinner option."),
        ],
        [],
        [
            stop(day_id, 1, "pl_dunasmar", "wake", "Hotel stay day."),
            stop(day_id, 2, "pl_mg_bakery", "bakery", "Breakfast run."),
            stop(day_id, 3, "pl_mg_activity", "activity", "Beach time."),
            stop(day_id, 4, "pl_mg_grocery", "groceries", "Picnic and snacks."),
            stop(day_id, 5, "pl_mg_rest", "meal", "Optional dinner out."),
            stop(day_id, 6, "pl_dunasmar", "sleep", "Fixed Monte Gordo hotel week."),
        ],
    )

# Return leg
day_id = "day_2026-06-29"
add_day(
    25,
    "pl_dunasmar",
    "pl_saomiguel",
    "Hotel checkout followed by a westbound Algarve-to-Costa-Vicentina transfer so the return route clearly differs from the outbound line.",
    [
        nearby("pl_saomiguel_activity", "Strong nearby lookout for tomorrow."),
        nearby("pl_saomiguel_bakery", "Bread run for the west-coast block."),
        nearby("pl_saomiguel_grocery", "Basic resupply near camp."),
    ],
    [
        car_movement(
            day_id,
            "pl_dunasmar",
            "pl_saomiguel",
            "Monte Gordo to Parque de Campismo Sao Miguel via Tavira and the Algarve.",
            leg_option("leg_11", "scenic")["total_km"],
            leg_option("leg_11", "scenic")["duration_minutes"],
            leg_option("leg_11", "scenic")["maps_url"],
            [wp(day_id, 1, "pl_tavira_market", "fresh_food", "Selective market stop after hotel checkout.", 35), wp(day_id, 2, "pl_setubal_charge", "charge", "Not usually needed; kept as conservative backup for a loaded EV.", 25)],
            route_options_from_leg(
                "leg_11",
                [
                    ("fast", False, "Fastest Algarve crossing to the west coast.", [wp(day_id, 1, "pl_mg_grocery", "fresh_food", "Quick departure groceries if needed.", 15)]),
                    ("scenic", True, "Preferred coast-facing Algarve line via Tavira, Olhao, and Lagos.", [wp(day_id, 1, "pl_tavira_market", "fresh_food", "Market lunch and provisions.", 35)]),
                    ("no_highways", False, "N125-led slow line if motorway monotony feels high.", [wp(day_id, 1, "pl_tavira_market", "fresh_food", "Town-market stop.", 35)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_dunasmar", "wake", "Hotel checkout."),
        stop(day_id, 2, "pl_tavira_market", "groceries", "Fresh-food market stop."),
        stop(day_id, 3, "pl_mg_bakery", "bakery", "Departure pastries if leaving early."),
        stop(day_id, 4, "pl_saomiguel_grocery", "groceries", "Arrival supplies."),
        stop(day_id, 5, "pl_saomiguel", "sleep", "Costa Vicentina base night 1 of 2."),
    ],
)

day_id = "day_2026-06-30"
add_day(
    26,
    "pl_saomiguel",
    "pl_saomiguel",
    "Costa Vicentina base day kept intentionally simple: one lookout, one bakery run, one slow meal, no major driving.",
    [
        nearby("pl_saomiguel_activity", "Main coastal outing from camp."),
        nearby("pl_saomiguel_bakery", "Morning bread stop in Odeceixe."),
        nearby("pl_saomiguel_grocery", "Basic provisions."),
        nearby("pl_saomiguel_rest", "Regional dinner in Odeceixe."),
    ],
    [],
    [
        stop(day_id, 1, "pl_saomiguel", "wake", "Vehicle parked."),
        stop(day_id, 2, "pl_saomiguel_bakery", "bakery", "Bread and pastries."),
        stop(day_id, 3, "pl_saomiguel_activity", "activity", "Main viewpoint outing."),
        stop(day_id, 4, "pl_saomiguel_grocery", "groceries", "Dinner supplies."),
        stop(day_id, 5, "pl_saomiguel_rest", "meal", "Optional restaurant night."),
        stop(day_id, 6, "pl_saomiguel", "sleep", "Costa Vicentina base night 2 of 2."),
    ],
)

day_id = "day_2026-07-01"
add_day(
    27,
    "pl_saomiguel",
    "pl_evora_camp",
    "Inland move from the wild west coast into Alentejo, giving the return route a different landscape rather than repeating Algarve beaches.",
    [
        nearby("pl_evora_temple", "Compact old-town walk after setup."),
        nearby("pl_evora_market", "Best provisioning stop for the stay."),
        nearby("pl_evora_rest", "Regional dinner option."),
    ],
    [
        car_movement(
            day_id,
            "pl_saomiguel",
            "pl_evora_camp",
            "Sao Miguel to Evora through Odemira and the Alentejo interior.",
            leg_option("leg_12", "fast")["total_km"],
            leg_option("leg_12", "fast")["duration_minutes"],
            leg_option("leg_12", "fast")["maps_url"],
            [wp(day_id, 1, "pl_setubal_charge", "charge", "Best conservative charge before Evora if needed.", 30), wp(day_id, 2, "pl_evora_market", "fresh_food", "Arrival market stop.", 30)],
            route_options_from_leg(
                "leg_12",
                [
                    ("fast", True, "Preferred interior line that keeps the day comfortably moderate.", [wp(day_id, 1, "pl_setubal_charge", "charge", "Optional top-up.", 30), wp(day_id, 2, "pl_evora_market", "fresh_food", "Arrival provisions.", 30)]),
                    ("scenic", False, "Coast-touching version via Vila Nova de Milfontes and Alcacer do Sal.", [wp(day_id, 1, "pl_saomiguel_activity", "activity", "Final Atlantic lookout before turning inland.", 20)]),
                    ("no_highways", False, "Back-road Alentejo version via Grandola and Viana do Alentejo.", [wp(day_id, 1, "pl_evora_market", "fresh_food", "Market stop on arrival.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_saomiguel", "wake", "Break camp after breakfast."),
        stop(day_id, 2, "pl_setubal_charge", "charge", "Primary or backup charge."),
        stop(day_id, 3, "pl_evora_market", "groceries", "Arrival provisions."),
        stop(day_id, 4, "pl_evora_temple", "activity", "Short old-town wander."),
        stop(day_id, 5, "pl_evora_camp", "sleep", "Evora base night 1 of 2."),
    ],
)

day_id = "day_2026-07-02"
add_day(
    28,
    "pl_evora_camp",
    "pl_evora_camp",
    "Alentejo base day for market time, a compact historic center, and an easier inland rhythm before the next long transfer.",
    [
        nearby("pl_evora_temple", "Short old-town activity."),
        nearby("pl_evora_market", "Best place for produce, bread, and picnic goods."),
        nearby("pl_evora_rest", "Regional dinner without moving far."),
    ],
    [],
    [
        stop(day_id, 1, "pl_evora_camp", "wake", "Keep the car parked."),
        stop(day_id, 2, "pl_evora_market", "groceries", "Fresh-food stop."),
        stop(day_id, 3, "pl_evora_temple", "activity", "Main family outing."),
        stop(day_id, 4, "pl_evora_rest", "meal", "Optional dinner out."),
        stop(day_id, 5, "pl_evora_camp", "sleep", "Evora base night 2 of 2."),
    ],
)

day_id = "day_2026-07-03"
add_day(
    29,
    "pl_evora_camp",
    "pl_salamanca_camp",
    "Long inland transfer north, accepted because it buys a worthwhile two-night Salamanca stop and keeps the final return less compressed.",
    [
        nearby("pl_salamanca_plaza", "Evening old-town walk once camp is set."),
        nearby("pl_salamanca_market", "Fresh-food provisions for tomorrow."),
        nearby("pl_salamanca_rest", "Good dinner option if energy allows."),
    ],
    [
        car_movement(
            day_id,
            "pl_evora_camp",
            "pl_salamanca_camp",
            "Evora to Salamanca via Merida and the Extremadura interior.",
            leg_option("leg_13", "fast")["total_km"],
            leg_option("leg_13", "fast")["duration_minutes"],
            leg_option("leg_13", "fast")["maps_url"],
            [wp(day_id, 1, "pl_merida_arch", "activity", "Roman bridge leg stretch.", 40), wp(day_id, 2, "pl_merida_charge", "charge", "Primary mid-route charge.", 30), wp(day_id, 3, "pl_salamanca_market", "fresh_food", "Arrival-side provisions.", 30)],
            route_options_from_leg(
                "leg_13",
                [
                    ("fast", True, "Preferred direct line with Merida charge and Salamanca market stop.", [wp(day_id, 1, "pl_merida_arch", "activity", "Leg stretch at the Roman bridge.", 40), wp(day_id, 2, "pl_merida_charge", "charge", "Primary charge.", 30)]),
                    ("scenic", False, "Longer version via Monsaraz, Merida, and Caceres.", [wp(day_id, 1, "pl_merida_arch", "activity", "Historic stop.", 40)]),
                    ("no_highways", False, "Regional-road variant via Elvas and Caceres.", [wp(day_id, 1, "pl_merida_charge", "charge", "Charge if choosing the slower route.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_evora_camp", "wake", "Break camp."),
        stop(day_id, 2, "pl_merida_arch", "activity", "Primary lunch-and-rest stop."),
        stop(day_id, 3, "pl_merida_charge", "charge", "Primary EV charge."),
        stop(day_id, 4, "pl_salamanca_market", "groceries", "Arrival market stop."),
        stop(day_id, 5, "pl_salamanca_camp", "sleep", "Salamanca base night 1 of 2."),
    ],
)

day_id = "day_2026-07-04"
add_day(
    30,
    "pl_salamanca_camp",
    "pl_salamanca_camp",
    "Salamanca base day with a compact city outing, market time, and no need to relocate camp.",
    [
        nearby("pl_salamanca_plaza", "Main old-town outing."),
        nearby("pl_salamanca_market", "Best provisioning stop."),
        nearby("pl_salamanca_rest", "Classic dinner option."),
    ],
    [],
    [
        stop(day_id, 1, "pl_salamanca_camp", "wake", "Keep the vehicle parked."),
        stop(day_id, 2, "pl_salamanca_market", "groceries", "Bread, fruit, and picnic food."),
        stop(day_id, 3, "pl_salamanca_plaza", "activity", "Main city outing."),
        stop(day_id, 4, "pl_salamanca_rest", "meal", "Optional dinner out."),
        stop(day_id, 5, "pl_salamanca_camp", "sleep", "Salamanca base night 2 of 2."),
    ],
)

day_id = "day_2026-07-05"
add_day(
    31,
    "pl_salamanca_camp",
    "pl_wecamp_sansebastian",
    "Return to the coast with a long but meaningful Salamanca-to-Basque transfer, compensated by two nights in a strong food-and-landscape stop.",
    [
        nearby("pl_chillida", "Top Basque outing for tomorrow."),
        nearby("pl_ss_bakery", "Morning bread from camp."),
        nearby("pl_ss_grocery", "Useful practical provisioning."),
    ],
    [
        car_movement(
            day_id,
            "pl_salamanca_camp",
            "pl_wecamp_sansebastian",
            "Salamanca to San Sebastian / Igeldo via Burgos and Vitoria-Gasteiz.",
            leg_option("leg_14", "fast")["total_km"],
            leg_option("leg_14", "fast")["duration_minutes"],
            leg_option("leg_14", "fast")["maps_url"],
            [wp(day_id, 1, "pl_burgos_lunch", "meal", "Primary lunch break.", 50), wp(day_id, 2, "pl_burgos_charge", "charge", "Main route charge.", 30)],
            route_options_from_leg(
                "leg_14",
                [
                    ("fast", True, "Preferred direct line with Burgos lunch and charging.", [wp(day_id, 1, "pl_burgos_lunch", "meal", "Lunch by the river.", 50), wp(day_id, 2, "pl_burgos_charge", "charge", "Primary charge.", 30)]),
                    ("scenic", False, "Slightly longer version leaning into Burgos and Zarautz.", [wp(day_id, 1, "pl_burgos_lunch", "meal", "Lunch stop.", 50), wp(day_id, 2, "pl_hondarribia", "activity", "Arrival-side scenic detour.", 45)]),
                    ("no_highways", False, "Lower-stress alternative if motorway conditions are poor.", [wp(day_id, 1, "pl_burgos_charge", "charge", "Charge on the slower route.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_salamanca_camp", "wake", "Break camp."),
        stop(day_id, 2, "pl_burgos_lunch", "meal", "Primary lunch and rest."),
        stop(day_id, 3, "pl_burgos_charge", "charge", "Primary EV charge."),
        stop(day_id, 4, "pl_hondarribia", "activity", "Interesting stop near arrival if energy allows."),
        stop(day_id, 5, "pl_ss_grocery", "groceries", "Basque base provisioning."),
        stop(day_id, 6, "pl_wecamp_sansebastian", "sleep", "Basque base night 1 of 2."),
    ],
)

day_id = "day_2026-07-06"
add_day(
    32,
    "pl_wecamp_sansebastian",
    "pl_wecamp_sansebastian",
    "Basque base day built around one strong cultural stop, easy food shopping, and a lighter evening above the bay.",
    [
        nearby("pl_chillida", "Primary outing for the day."),
        nearby("pl_ss_activity", "Easy hill-and-view option."),
        nearby("pl_ss_bakery", "Bread and pastries near camp."),
        nearby("pl_ss_rest", "Simple Basque dinner close by."),
    ],
    [],
    [
        stop(day_id, 1, "pl_wecamp_sansebastian", "wake", "Vehicle parked."),
        stop(day_id, 2, "pl_ss_bakery", "bakery", "Morning bread."),
        stop(day_id, 3, "pl_chillida", "activity", "Main outing."),
        stop(day_id, 4, "pl_ss_grocery", "groceries", "Provisioning."),
        stop(day_id, 5, "pl_ss_rest", "meal", "Optional dinner."),
        stop(day_id, 6, "pl_wecamp_sansebastian", "sleep", "Basque base night 2 of 2."),
    ],
)

day_id = "day_2026-07-07"
add_day(
    33,
    "pl_wecamp_sansebastian",
    "pl_huttopia_landes",
    "Short cross-border move into the Landes so the family gets one more low-stress forest-and-lake stop before the long eastward return.",
    [
        nearby("pl_lac_hossegor", "Calmer water than the open ocean."),
        nearby("pl_capbreton_fish", "Fresh fish buy for camp cooking."),
        nearby("pl_landes_bakery", "Bread close to camp."),
    ],
    [
        car_movement(
            day_id,
            "pl_wecamp_sansebastian",
            "pl_huttopia_landes",
            "San Sebastian / Igeldo to Landes Sud via the French Basque coast.",
            leg_option("leg_15", "fast")["total_km"],
            leg_option("leg_15", "fast")["duration_minutes"],
            leg_option("leg_15", "fast")["maps_url"],
            [wp(day_id, 1, "pl_biarritz_beachpause", "family_rest", "Seafront pause before the forest belt.", 35), wp(day_id, 2, "pl_capbreton_fish", "fresh_food", "Buy fish on arrival side.", 30)],
            route_options_from_leg(
                "leg_15",
                [
                    ("fast", True, "Efficient border-crossing line with Biarritz pause.", [wp(day_id, 1, "pl_biarritz_beachpause", "family_rest", "Short beach pause.", 35)]),
                    ("scenic", False, "Preferred if you want Saint-Jean-de-Luz and Biarritz in the same day.", [wp(day_id, 1, "pl_biarritz_beachpause", "family_rest", "Beach and promenade stop.", 35)]),
                    ("no_highways", False, "Local-road coast version through Hendaye and Bayonne.", [wp(day_id, 1, "pl_capbreton_fish", "fresh_food", "Fresh fish stop on arrival.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_wecamp_sansebastian", "wake", "Break the Basque base."),
        stop(day_id, 2, "pl_biarritz_beachpause", "activity", "Primary family rest stop."),
        stop(day_id, 3, "pl_capbreton_fish", "groceries", "Fresh fish for dinner."),
        stop(day_id, 4, "pl_landes_bakery", "bakery", "Arrival bread run."),
        stop(day_id, 5, "pl_huttopia_landes", "sleep", "Landes base night 1 of 2."),
    ],
)

day_id = "day_2026-07-08"
add_day(
    34,
    "pl_huttopia_landes",
    "pl_huttopia_landes",
    "Landes base day with bikes, pine shade, fish market, and calm water instead of another heavy sightseeing day.",
    [
        nearby("pl_landes_activity", "Flat bike-friendly forest outing."),
        nearby("pl_lac_hossegor", "Calmer water play than the surf beaches."),
        nearby("pl_capbreton_fish", "Fresh fish if you want a stronger camp dinner."),
        nearby("pl_landes_bakery", "Daily bread stop."),
    ],
    [],
    [
        stop(day_id, 1, "pl_huttopia_landes", "wake", "Vehicle parked."),
        stop(day_id, 2, "pl_landes_bakery", "bakery", "Morning bread."),
        stop(day_id, 3, "pl_landes_activity", "activity", "Forest bike or walk."),
        stop(day_id, 4, "pl_lac_hossegor", "activity", "Lake time."),
        stop(day_id, 5, "pl_capbreton_fish", "groceries", "Fresh fish stop."),
        stop(day_id, 6, "pl_huttopia_landes", "sleep", "Landes base night 2 of 2."),
    ],
)

day_id = "day_2026-07-09"
add_day(
    35,
    "pl_huttopia_landes",
    "pl_royat",
    "Long eastbound France crossing that is justified because it buys a final low-stress overnight before the Swiss return and avoids repeating the outbound coast.",
    [
        nearby("pl_puydedome", "Short last-evening volcano panorama if timing allows."),
        nearby("pl_clermont_market", "Fresh dinner and road-breakfast supplies."),
        nearby("pl_royat_rest", "Simple last campsite meal."),
    ],
    [
        car_movement(
            day_id,
            "pl_huttopia_landes",
            "pl_royat",
            "Landes Sud to Huttopia Royat via Bordeaux and the Massif Central edge.",
            leg_option("leg_16", "fast")["total_km"],
            leg_option("leg_16", "fast")["duration_minutes"],
            leg_option("leg_16", "fast")["maps_url"],
            [wp(day_id, 1, "pl_bordeaux_charge", "charge", "Primary major-route charge.", 30), wp(day_id, 2, "pl_clermont_charge", "charge", "Arrival-side top-up for the final day if needed.", 20)],
            route_options_from_leg(
                "leg_16",
                [
                    ("fast", True, "Preferred time-balanced line with Bordeaux and Clermont charging structure.", [wp(day_id, 1, "pl_bordeaux_charge", "charge", "Primary charge.", 30), wp(day_id, 2, "pl_clermont_charge", "charge", "Arrival-side top-up.", 20)]),
                    ("scenic", False, "Périgord-leaning line via Périgueux and Brive.", [wp(day_id, 1, "pl_bordeaux_charge", "charge", "Charge before the inland scenic section.", 30)]),
                    ("no_highways", False, "Much slower rural-France version via Bergerac and Brive.", [wp(day_id, 1, "pl_bordeaux_charge", "charge", "Charge if taking the slowest route.", 30)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_huttopia_landes", "wake", "Break camp."),
        stop(day_id, 2, "pl_bordeaux_charge", "charge", "Primary EV charge."),
        stop(day_id, 3, "pl_biarritz_beachpause", "activity", "Optional early pause if leaving very early."),
        stop(day_id, 4, "pl_clermont_market", "groceries", "Final camp provisions."),
        stop(day_id, 5, "pl_clermont_charge", "charge", "Arrival-side backup charge."),
        stop(day_id, 6, "pl_royat", "sleep", "Final transit camp before Zurich."),
    ],
)

day_id = "day_2026-07-10"
add_day(
    36,
    "pl_royat",
    "pl_zurich_home",
    "Final return to Zurich via Annecy and Lausanne, keeping the last day direct so the trip closes at home on the confirmed date.",
    [
        nearby("pl_zurich_home", "Home arrival and unpack."),
    ],
    [
        car_movement(
            day_id,
            "pl_royat",
            "pl_zurich_home",
            "Clermont-Ferrand to Zurich.",
            leg_option("leg_17", "fast")["total_km"],
            leg_option("leg_17", "fast")["duration_minutes"],
            leg_option("leg_17", "fast")["maps_url"],
            [wp(day_id, 1, "pl_lyon_lunch", "meal", "Primary lunch stop.", 50), wp(day_id, 2, "pl_clermont_charge", "charge", "Top-up before departure if needed.", 20), wp(day_id, 3, "pl_geneva_charge", "charge", "Late-route backup charge before Switzerland.", 20)],
            route_options_from_leg(
                "leg_17",
                [
                    ("fast", True, "Preferred direct line with Lyon lunch and one backup charge.", [wp(day_id, 1, "pl_lyon_lunch", "meal", "Lunch stop.", 50), wp(day_id, 2, "pl_geneva_charge", "charge", "Backup charge before the finish.", 20)]),
                    ("scenic", False, "Longer Annecy-Lausanne line if weather and energy make the extra time worthwhile.", [wp(day_id, 1, "pl_annecy_oldtown", "activity", "Scenic late lunch or leg stretch.", 45)]),
                    ("no_highways", False, "Very long Jura-leaning alternative; only for exceptional traffic problems.", [wp(day_id, 1, "pl_geneva_charge", "charge", "Likely needed on the slower route.", 20)]),
                ],
            ),
        )
    ],
    [
        stop(day_id, 1, "pl_royat", "wake", "Break final camp."),
        stop(day_id, 2, "pl_clermont_charge", "charge", "Departure-side top-up if needed."),
        stop(day_id, 3, "pl_lyon_lunch", "meal", "Primary lunch stop."),
        stop(day_id, 4, "pl_geneva_charge", "charge", "Backup charge before Zurich."),
        stop(day_id, 5, "pl_zurich_home", "sleep", "Home by the confirmed return date."),
    ],
)


ITINERARY = {
    "schema_version": "3.4.0",
    "version_id": "v1-chatgpt-5.4-rebuilt-from-baseline",
    "locations": LOCATIONS,
    "days": days,
}


def validate(itinerary):
    assert itinerary["schema_version"]
    assert itinerary["version_id"]
    assert isinstance(itinerary["locations"], list) and itinerary["locations"]
    assert isinstance(itinerary["days"], list) and itinerary["days"]

    loc_ids = {loc["id"] for loc in itinerary["locations"]}
    assert len(loc_ids) == len(itinerary["locations"])

    for loc in itinerary["locations"]:
        for key in ["id", "type", "name", "coordinates", "google_maps_url", "photo_url"]:
            assert key in loc, ("missing location key", loc["id"], key)
        assert "lat" in loc["coordinates"] and "lng" in loc["coordinates"]

    for day in itinerary["days"]:
        for key in ["id", "day_number", "date", "wake_location_id", "sleep_location_id", "nearby_suggestions", "movements", "stops"]:
            assert key in day, ("missing day key", day["id"], key)
        if day["wake_location_id"] is not None:
            assert day["wake_location_id"] in loc_ids, ("bad wake ref", day["id"], day["wake_location_id"])
        if day["sleep_location_id"] is not None:
            assert day["sleep_location_id"] in loc_ids, ("bad sleep ref", day["id"], day["sleep_location_id"])
        for item in day["nearby_suggestions"]:
            assert item["location_id"] in loc_ids, ("bad nearby ref", day["id"], item["location_id"])
        for stop_item in day["stops"]:
            assert stop_item["location_id"] in loc_ids, ("bad stop ref", day["id"], stop_item["location_id"])
        has_car = False
        for mov in day["movements"]:
            for key in ["id", "mode", "start_location_id", "end_location_id", "route"]:
                assert key in mov, ("missing movement key", day["id"], key)
            if mov["start_location_id"] is not None:
                assert mov["start_location_id"] in loc_ids
            if mov["end_location_id"] is not None:
                assert mov["end_location_id"] in loc_ids
            route = mov["route"]
            for key in ["open_route_url", "line", "waypoints"]:
                assert key in route, ("missing route key", day["id"], mov["id"], key)
            for wp_item in route["waypoints"]:
                assert wp_item["location_id"] in loc_ids, ("bad route ref", day["id"], mov["id"], wp_item["location_id"])
            for opt in mov.get("route_options", []):
                assert "style" in opt and "is_selected" in opt
                for wp_item in opt.get("waypoints", []):
                    assert wp_item["location_id"] in loc_ids
            if mov["mode"] == "car":
                has_car = True
                assert mov["route_options"], ("car movement needs route options", day["id"], mov["id"])
                assert len(mov["route_options"]) >= 2, ("car movement needs at least 2 route options", day["id"], mov["id"])
        if any(m["mode"] == "car" for m in day["movements"]):
            assert has_car

    # Lightweight extra checks matching prompt constraints.
    assert itinerary["days"][0]["date"] == "2026-06-04"
    assert itinerary["days"][-1]["date"] == "2026-07-10"


def compact_location(loc):
    out = {
        "id": loc["id"],
        "type": loc["type"],
        "name": loc["name"],
        "coordinates": loc["coordinates"],
        "google_maps_url": loc["google_maps_url"],
        "photo_url": loc["photo_url"],
    }
    if "accommodation" in loc:
        out["accommodation"] = loc["accommodation"]
    return out


def compact_waypoint(w):
    out = {
        "id": w["id"],
        "order": w["order"],
        "location_id": w["location_id"],
        "role": w["role"],
    }
    if w.get("notes"):
        out["notes"] = w["notes"]
    if "stay_duration_minutes" in w and w["stay_duration_minutes"] is not None:
        out["stay_duration_minutes"] = w["stay_duration_minutes"]
    return out


def compact_itinerary(itinerary):
    out = {
        "schema_version": itinerary["schema_version"],
        "version_id": itinerary["version_id"],
        "locations": [compact_location(loc) for loc in itinerary["locations"]],
        "days": [],
    }
    for day in itinerary["days"]:
        day_out = {
            "id": day["id"],
            "day_number": day["day_number"],
            "date": day["date"],
            "wake_location_id": day["wake_location_id"],
            "sleep_location_id": day["sleep_location_id"],
            "nearby_suggestions": [{"location_id": item["location_id"]} for item in day["nearby_suggestions"]],
            "movements": [],
            "stops": [{"id": item["id"], "location_id": item["location_id"], "role": item["role"]} for item in day["stops"]],
        }
        for mov in day["movements"]:
            mov_out = {
                "id": mov["id"],
                "mode": mov["mode"],
                "start_location_id": mov["start_location_id"],
                "end_location_id": mov["end_location_id"],
                "distance_km": mov["distance_km"],
                "duration_minutes": mov["duration_minutes"],
                "route": {
                    "open_route_url": mov["route"]["open_route_url"],
                    "line": [],
                    "waypoints": [compact_waypoint(w) for w in mov["route"]["waypoints"]],
                },
                "route_options": [],
            }
            for opt in mov["route_options"]:
                opt_out = {
                    "style": opt["style"],
                    "distance_km": opt["distance_km"],
                    "duration_minutes": opt["duration_minutes"],
                    "open_route_url": opt["open_route_url"],
                    "is_selected": opt["is_selected"],
                }
                mov_out["route_options"].append(opt_out)
            day_out["movements"].append(mov_out)
        out["days"].append(day_out)
    return out


COMPACT_ITINERARY = compact_itinerary(ITINERARY)
validate(COMPACT_ITINERARY)
print(json.dumps(COMPACT_ITINERARY, ensure_ascii=True, separators=(",", ":")))
