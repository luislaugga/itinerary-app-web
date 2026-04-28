import json
from datetime import date, timedelta
from pathlib import Path

ROOT = Path("/Users/laugga/Desktop/road-trip-summer-2026")
BASELINE = json.loads((ROOT / "inputs/baseline_route.codex-gpt-5.4-v1.json").read_text())
LEG = {x["id"]: x for x in BASELINE["legs"]}


def loc(id, type, name, features=None):
    out = {
        "id": id,
        "type": type,
        "name": name,
        "coordinates": {"lat": None, "lng": None},
        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={name.replace(' ', '+')}",
        "photo_url": "",
    }
    if features:
        out["accommodation"] = {"features": features}
    return out


locations = [
    loc("pl_zurich_home", "store", "Zurich home"),
    loc("pl_aix_camp", "campground", "Camping du Sierroz", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22"]),
    loc("pl_aix_lake", "beach", "Esplanade du Lac"),
    loc("pl_aix_market", "local food store", "Marche d'Aix-les-Bains"),
    loc("pl_geneva_charge", "store", "Tesla Supercharger Geneva"),
    loc("pl_annecy_oldtown", "sightseeing/miradouro/place-with-view", "Annecy vieille ville"),
    loc("pl_fontvieille", "campground", "Camping Huttopia Fontvieille", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "pool", "playground", "shade"]),
    loc("pl_fontvieille_activity", "sightseeing/miradouro/place-with-view", "Sentier des Moulins"),
    loc("pl_fontvieille_market", "local food store", "Fontvieille village market"),
    loc("pl_camargue_camp", "campground", "Camping de la Brise", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22"]),
    loc("pl_pontdegau", "natural park", "Parc Ornithologique de Pont de Gau"),
    loc("pl_stesmaries_market", "local food store", "Marche des Saintes-Maries-de-la-Mer"),
    loc("pl_santacristina", "campground", "wecamp Santa Cristina", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "pool", "playground", "shade"]),
    loc("pl_santacristina_activity", "beach", "Cala Sant Pol"),
    loc("pl_santacristina_food", "local food store", "Bon Preu Santa Cristina"),
    loc("pl_narbonne_charge", "store", "Fastned Narbonne"),
    loc("pl_sete_market", "local food store", "Les Halles de Sete"),
    loc("pl_barcelona_family", "hotel", "Barcelona family stay", ["hot_showers", "clean_toilets", "quiet_after_22"]),
    loc("pl_barcelona_market", "local food store", "Mercat de Santa Caterina"),
    loc("pl_mies_pavilion", "sightseeing/miradouro/place-with-view", "Mies van der Rohe Pavilion"),
    loc("pl_collvert", "campground", "Camping Coll Vert", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "pool"]),
    loc("pl_saler_beach", "beach", "Platja del Saler"),
    loc("pl_albufera", "natural park", "Parc Natural de l'Albufera"),
    loc("pl_saler_grocery", "supermarket", "Consum El Saler"),
    loc("pl_tarragona_lunch", "restaurant", "Tarragona seafront lunch"),
    loc("pl_castellon_charge", "store", "Tesla Supercharger Castellon"),
    loc("pl_cabodegata", "campground", "wecamp Cabo de Gata", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22"]),
    loc("pl_cabo_activity", "sightseeing/miradouro/place-with-view", "Playa de los Genoveses viewpoint"),
    loc("pl_cabo_grocery", "supermarket", "Coviran San Jose"),
    loc("pl_murcia_charge", "store", "IONITY Murcia"),
    loc("pl_antequera_camp", "campground", "Camping La Sierrecilla", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22"]),
    loc("pl_antequera_view", "sightseeing/miradouro/place-with-view", "Alcazaba de Antequera"),
    loc("pl_antequera_market", "local food store", "Mercado de Abastos de Antequera"),
    loc("pl_laaldea", "campground", "Camping La Aldea", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "pool"]),
    loc("pl_larocina", "natural park", "Centro de Visitantes La Rocina"),
    loc("pl_elrocio_market", "supermarket", "Supermercado El Jamon El Rocio"),
    loc("pl_dunasmar", "hotel", "Hotel Dunas Mar", ["hot_showers", "clean_toilets", "quiet_after_22", "pool"]),
    loc("pl_mg_activity", "beach", "Praia de Monte Gordo"),
    loc("pl_mg_bakery", "bakery", "Padaria Pao Quente Monte Gordo"),
    loc("pl_mg_grocery", "supermarket", "Pingo Doce Monte Gordo"),
    loc("pl_tavira_market", "local food store", "Mercado da Ribeira de Tavira"),
    loc("pl_saomiguel", "campground", "Parque de Campismo Sao Miguel", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22"]),
    loc("pl_saomiguel_activity", "sightseeing/miradouro/place-with-view", "Praia da Amalia lookout"),
    loc("pl_saomiguel_grocery", "supermarket", "Mercearia Sao Miguel"),
    loc("pl_setubal_charge", "store", "IONITY Setubal"),
    loc("pl_evora_camp", "campground", "Orbitur Evora", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "pool"]),
    loc("pl_evora_temple", "sightseeing/miradouro/place-with-view", "Templo Romano de Evora"),
    loc("pl_evora_market", "local food store", "Mercado Municipal 1 de Maio"),
    loc("pl_merida_charge", "store", "Tesla Supercharger Merida"),
    loc("pl_salamanca_camp", "campground", "Camping Don Quijote", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "pool"]),
    loc("pl_salamanca_plaza", "sightseeing/miradouro/place-with-view", "Plaza Mayor de Salamanca"),
    loc("pl_salamanca_market", "local food store", "Mercado Central de Salamanca"),
    loc("pl_burgos_lunch", "restaurant", "Burgos riverside lunch"),
    loc("pl_burgos_charge", "store", "Fastned Burgos"),
    loc("pl_wecamp_sansebastian", "campground", "wecamp San Sebastian", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "playground"]),
    loc("pl_chillida", "natural park", "Chillida Leku"),
    loc("pl_ss_grocery", "supermarket", "BM Supermercados Igeldo"),
    loc("pl_biarritz_beachpause", "beach", "Biarritz beach pause"),
    loc("pl_huttopia_landes", "campground", "Huttopia Landes Sud", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "shade"]),
    loc("pl_landes_activity", "sightseeing/miradouro/place-with-view", "Velodyssee forest section"),
    loc("pl_landes_bakery", "bakery", "Boulangerie de Leon"),
    loc("pl_capbreton_fish", "local food store", "Marche aux Poissons de Capbreton"),
    loc("pl_bordeaux_charge", "store", "Tesla Supercharger Bordeaux"),
    loc("pl_royat", "campground", "Huttopia Royat", ["van_ok", "rooftop_tent_ok", "hot_showers", "clean_toilets", "quiet_after_22", "pool"]),
    loc("pl_puydedome", "sightseeing/miradouro/place-with-view", "Panoramique des Domes"),
    loc("pl_clermont_market", "local food store", "Marche Saint-Pierre Clermont-Ferrand"),
    loc("pl_clermont_charge", "store", "IONITY Clermont-Ferrand"),
    loc("pl_lyon_lunch", "restaurant", "Lyon south lunch stop"),
]

loc_ids = {x["id"] for x in locations}


def nearby(*ids):
    return [{"location_id": x} for x in ids]


def stop(day_id, n, loc_id, role):
    return {"id": f"{day_id}_stop_{n}", "location_id": loc_id, "role": role}


def wp(day_id, n, loc_id, role):
    return {"id": f"{day_id}_wp_{n}", "order": n, "location_id": loc_id, "role": role}


def route_option(style, leg_id, selected):
    opt = next(x for x in LEG[leg_id]["route_options"] if x["style"] == style)
    return {
        "style": style,
        "distance_km": opt["total_km"],
        "duration_minutes": opt["duration_minutes"],
        "open_route_url": opt["maps_url"],
        "is_selected": selected,
    }


def move(day_id, start, end, dist, mins, url, waypoints, opts):
    return {
        "id": f"{day_id}_drive",
        "mode": "car",
        "start_location_id": start,
        "end_location_id": end,
        "distance_km": dist,
        "duration_minutes": mins,
        "route": {"open_route_url": url, "line": [], "waypoints": waypoints},
        "route_options": opts,
    }


start = date(2026, 6, 4)
days = []


def add(offset, wake, sleep, nearby_ids, movements, stops):
    d = start + timedelta(days=offset)
    days.append({
        "id": f"day_{d.isoformat()}",
        "day_number": offset + 1,
        "date": d.isoformat(),
        "wake_location_id": wake,
        "sleep_location_id": sleep,
        "nearby_suggestions": nearby(*nearby_ids),
        "movements": movements,
        "stops": stops,
    })


def day_id(offset):
    return f"day_{(start + timedelta(days=offset)).isoformat()}"


# Drive/base pattern
did = day_id(0)
add(0, "pl_zurich_home", "pl_aix_camp", ["pl_aix_lake", "pl_aix_market"], [
    move(did, "pl_zurich_home", "pl_aix_camp", 369.0, 272, LEG["leg_01"]["route_options"][1]["maps_url"], [wp(did, 1, "pl_geneva_charge", "charge"), wp(did, 2, "pl_annecy_oldtown", "activity")], [route_option("fast", "leg_01", False), route_option("scenic", "leg_01", True)])
], [stop(did,1,"pl_zurich_home","wake"), stop(did,2,"pl_geneva_charge","charge"), stop(did,3,"pl_aix_market","groceries"), stop(did,4,"pl_aix_camp","sleep")])

did = day_id(1)
add(1, "pl_aix_camp", "pl_fontvieille", ["pl_fontvieille_activity", "pl_fontvieille_market"], [
    move(did, "pl_aix_camp", "pl_fontvieille", 384.0, 260, "", [wp(did,1,"pl_aix_market","groceries"), wp(did,2,"pl_fontvieille_market","groceries")], [
        {"style":"fast","distance_km":384.0,"duration_minutes":260,"open_route_url":"","is_selected":True},
        {"style":"scenic","distance_km":418.0,"duration_minutes":315,"open_route_url":"","is_selected":False}
    ])
], [stop(did,1,"pl_aix_camp","wake"), stop(did,2,"pl_fontvieille_market","groceries"), stop(did,3,"pl_fontvieille","sleep")])

for off in [2,3]:
    did = day_id(off)
    add(off, "pl_fontvieille", "pl_fontvieille", ["pl_fontvieille_activity","pl_fontvieille_market"], [], [stop(did,1,"pl_fontvieille","wake"), stop(did,2,"pl_fontvieille_activity","activity"), stop(did,3,"pl_fontvieille_market","groceries"), stop(did,4,"pl_fontvieille","sleep")])

did = day_id(4)
add(4, "pl_fontvieille", "pl_camargue_camp", ["pl_pontdegau","pl_stesmaries_market"], [
    move(did, "pl_fontvieille", "pl_camargue_camp", 145.0, 160, LEG["leg_04"]["route_options"][1]["maps_url"], [wp(did,1,"pl_stesmaries_market","groceries")], [route_option("fast","leg_04",False), route_option("scenic","leg_04",True)])
], [stop(did,1,"pl_fontvieille","wake"), stop(did,2,"pl_stesmaries_market","groceries"), stop(did,3,"pl_camargue_camp","sleep")])

did = day_id(5)
add(5, "pl_camargue_camp", "pl_camargue_camp", ["pl_pontdegau","pl_stesmaries_market"], [], [stop(did,1,"pl_camargue_camp","wake"), stop(did,2,"pl_pontdegau","activity"), stop(did,3,"pl_stesmaries_market","groceries"), stop(did,4,"pl_camargue_camp","sleep")])

did = day_id(6)
add(6, "pl_camargue_camp", "pl_santacristina", ["pl_santacristina_activity","pl_santacristina_food"], [
    move(did, "pl_camargue_camp", "pl_santacristina", LEG["leg_05"]["route_options"][0]["total_km"], LEG["leg_05"]["route_options"][0]["duration_minutes"], LEG["leg_05"]["route_options"][0]["maps_url"], [wp(did,1,"pl_sete_market","groceries"), wp(did,2,"pl_narbonne_charge","charge")], [route_option("fast","leg_05",True), route_option("scenic","leg_05",False)])
], [stop(did,1,"pl_camargue_camp","wake"), stop(did,2,"pl_sete_market","groceries"), stop(did,3,"pl_narbonne_charge","charge"), stop(did,4,"pl_santacristina","sleep")])

for off in [7,8]:
    did = day_id(off)
    add(off, "pl_santacristina", "pl_santacristina", ["pl_santacristina_activity","pl_santacristina_food"], [], [stop(did,1,"pl_santacristina","wake"), stop(did,2,"pl_santacristina_activity","activity"), stop(did,3,"pl_santacristina_food","groceries"), stop(did,4,"pl_santacristina","sleep")])

did = day_id(9)
add(9, "pl_santacristina", "pl_barcelona_family", ["pl_barcelona_market","pl_mies_pavilion"], [
    move(did, "pl_santacristina", "pl_barcelona_family", LEG["leg_06"]["route_options"][0]["total_km"], LEG["leg_06"]["route_options"][0]["duration_minutes"], LEG["leg_06"]["route_options"][0]["maps_url"], [wp(did,1,"pl_barcelona_market","groceries")], [route_option("fast","leg_06",True), route_option("scenic","leg_06",False)])
], [stop(did,1,"pl_santacristina","wake"), stop(did,2,"pl_barcelona_market","groceries"), stop(did,3,"pl_barcelona_family","sleep")])

did = day_id(10)
add(10, "pl_barcelona_family", "pl_collvert", ["pl_saler_beach","pl_saler_grocery","pl_albufera"], [
    move(did, "pl_barcelona_family", "pl_collvert", LEG["leg_07"]["route_options"][0]["total_km"], LEG["leg_07"]["route_options"][0]["duration_minutes"], LEG["leg_07"]["route_options"][0]["maps_url"], [wp(did,1,"pl_tarragona_lunch","meal"), wp(did,2,"pl_castellon_charge","charge")], [route_option("fast","leg_07",True), route_option("scenic","leg_07",False)])
], [stop(did,1,"pl_barcelona_family","wake"), stop(did,2,"pl_tarragona_lunch","meal"), stop(did,3,"pl_castellon_charge","charge"), stop(did,4,"pl_collvert","sleep")])

for off in [11,12]:
    did = day_id(off)
    add(off, "pl_collvert", "pl_collvert", ["pl_saler_beach","pl_saler_grocery","pl_albufera"], [], [stop(did,1,"pl_collvert","wake"), stop(did,2,"pl_saler_beach","activity"), stop(did,3,"pl_saler_grocery","groceries"), stop(did,4,"pl_collvert","sleep")])

did = day_id(13)
add(13, "pl_collvert", "pl_cabodegata", ["pl_cabo_activity","pl_cabo_grocery"], [
    move(did, "pl_collvert", "pl_cabodegata", LEG["leg_08"]["route_options"][0]["total_km"], LEG["leg_08"]["route_options"][0]["duration_minutes"], LEG["leg_08"]["route_options"][0]["maps_url"], [wp(did,1,"pl_castellon_charge","charge"), wp(did,2,"pl_murcia_charge","charge")], [route_option("fast","leg_08",True), route_option("scenic","leg_08",False)])
], [stop(did,1,"pl_collvert","wake"), stop(did,2,"pl_murcia_charge","charge"), stop(did,3,"pl_cabo_grocery","groceries"), stop(did,4,"pl_cabodegata","sleep")])

did = day_id(14)
add(14, "pl_cabodegata", "pl_cabodegata", ["pl_cabo_activity","pl_cabo_grocery"], [], [stop(did,1,"pl_cabodegata","wake"), stop(did,2,"pl_cabo_activity","activity"), stop(did,3,"pl_cabo_grocery","groceries"), stop(did,4,"pl_cabodegata","sleep")])

did = day_id(15)
add(15, "pl_cabodegata", "pl_antequera_camp", ["pl_antequera_view","pl_antequera_market"], [
    move(did, "pl_cabodegata", "pl_antequera_camp", 320.0, 240, "", [wp(did,1,"pl_murcia_charge","charge"), wp(did,2,"pl_antequera_market","groceries")], [
        {"style":"fast","distance_km":320.0,"duration_minutes":240,"open_route_url":"","is_selected":True},
        {"style":"scenic","distance_km":355.0,"duration_minutes":285,"open_route_url":"","is_selected":False}
    ])
], [stop(did,1,"pl_cabodegata","wake"), stop(did,2,"pl_murcia_charge","charge"), stop(did,3,"pl_antequera_market","groceries"), stop(did,4,"pl_antequera_camp","sleep")])

did = day_id(16)
add(16, "pl_antequera_camp", "pl_laaldea", ["pl_larocina","pl_elrocio_market"], [
    move(did, "pl_antequera_camp", "pl_laaldea", 260.0, 210, "", [wp(did,1,"pl_antequera_market","groceries"), wp(did,2,"pl_elrocio_market","groceries")], [
        {"style":"fast","distance_km":260.0,"duration_minutes":210,"open_route_url":"","is_selected":True},
        {"style":"scenic","distance_km":305.0,"duration_minutes":250,"open_route_url":"","is_selected":False}
    ])
], [stop(did,1,"pl_antequera_camp","wake"), stop(did,2,"pl_elrocio_market","groceries"), stop(did,3,"pl_laaldea","sleep")])

did = day_id(17)
add(17, "pl_laaldea", "pl_laaldea", ["pl_larocina","pl_elrocio_market"], [], [stop(did,1,"pl_laaldea","wake"), stop(did,2,"pl_larocina","activity"), stop(did,3,"pl_elrocio_market","groceries"), stop(did,4,"pl_laaldea","sleep")])

did = day_id(18)
add(18, "pl_laaldea", "pl_dunasmar", ["pl_mg_activity","pl_mg_bakery","pl_mg_grocery"], [
    move(did, "pl_laaldea", "pl_dunasmar", LEG["leg_10"]["route_options"][0]["total_km"], LEG["leg_10"]["route_options"][0]["duration_minutes"], LEG["leg_10"]["route_options"][0]["maps_url"], [wp(did,1,"pl_mg_grocery","groceries")], [route_option("fast","leg_10",True), route_option("scenic","leg_10",False)])
], [stop(did,1,"pl_laaldea","wake"), stop(did,2,"pl_mg_grocery","groceries"), stop(did,3,"pl_dunasmar","sleep")])

for off in range(19,25):
    did = day_id(off)
    add(off, "pl_dunasmar", "pl_dunasmar", ["pl_mg_activity","pl_mg_bakery","pl_mg_grocery"], [], [stop(did,1,"pl_dunasmar","wake"), stop(did,2,"pl_mg_activity","activity"), stop(did,3,"pl_mg_grocery","groceries"), stop(did,4,"pl_dunasmar","sleep")])

did = day_id(25)
add(25, "pl_dunasmar", "pl_saomiguel", ["pl_saomiguel_activity","pl_saomiguel_grocery"], [
    move(did, "pl_dunasmar", "pl_saomiguel", LEG["leg_11"]["route_options"][1]["total_km"], LEG["leg_11"]["route_options"][1]["duration_minutes"], LEG["leg_11"]["route_options"][1]["maps_url"], [wp(did,1,"pl_tavira_market","groceries")], [route_option("fast","leg_11",False), route_option("scenic","leg_11",True)])
], [stop(did,1,"pl_dunasmar","wake"), stop(did,2,"pl_tavira_market","groceries"), stop(did,3,"pl_saomiguel","sleep")])

did = day_id(26)
add(26, "pl_saomiguel", "pl_saomiguel", ["pl_saomiguel_activity","pl_saomiguel_grocery"], [], [stop(did,1,"pl_saomiguel","wake"), stop(did,2,"pl_saomiguel_activity","activity"), stop(did,3,"pl_saomiguel_grocery","groceries"), stop(did,4,"pl_saomiguel","sleep")])

did = day_id(27)
add(27, "pl_saomiguel", "pl_evora_camp", ["pl_evora_temple","pl_evora_market"], [
    move(did, "pl_saomiguel", "pl_evora_camp", LEG["leg_12"]["route_options"][0]["total_km"], LEG["leg_12"]["route_options"][0]["duration_minutes"], LEG["leg_12"]["route_options"][0]["maps_url"], [wp(did,1,"pl_setubal_charge","charge"), wp(did,2,"pl_evora_market","groceries")], [route_option("fast","leg_12",True), route_option("scenic","leg_12",False)])
], [stop(did,1,"pl_saomiguel","wake"), stop(did,2,"pl_setubal_charge","charge"), stop(did,3,"pl_evora_camp","sleep")])

did = day_id(28)
add(28, "pl_evora_camp", "pl_evora_camp", ["pl_evora_temple","pl_evora_market"], [], [stop(did,1,"pl_evora_camp","wake"), stop(did,2,"pl_evora_temple","activity"), stop(did,3,"pl_evora_market","groceries"), stop(did,4,"pl_evora_camp","sleep")])

did = day_id(29)
add(29, "pl_evora_camp", "pl_salamanca_camp", ["pl_salamanca_plaza","pl_salamanca_market"], [
    move(did, "pl_evora_camp", "pl_salamanca_camp", LEG["leg_13"]["route_options"][0]["total_km"], LEG["leg_13"]["route_options"][0]["duration_minutes"], LEG["leg_13"]["route_options"][0]["maps_url"], [wp(did,1,"pl_merida_charge","charge"), wp(did,2,"pl_salamanca_market","groceries")], [route_option("fast","leg_13",True), route_option("scenic","leg_13",False)])
], [stop(did,1,"pl_evora_camp","wake"), stop(did,2,"pl_merida_charge","charge"), stop(did,3,"pl_salamanca_camp","sleep")])

did = day_id(30)
add(30, "pl_salamanca_camp", "pl_salamanca_camp", ["pl_salamanca_plaza","pl_salamanca_market"], [], [stop(did,1,"pl_salamanca_camp","wake"), stop(did,2,"pl_salamanca_plaza","activity"), stop(did,3,"pl_salamanca_market","groceries"), stop(did,4,"pl_salamanca_camp","sleep")])

did = day_id(31)
add(31, "pl_salamanca_camp", "pl_wecamp_sansebastian", ["pl_chillida","pl_ss_grocery"], [
    move(did, "pl_salamanca_camp", "pl_wecamp_sansebastian", LEG["leg_14"]["route_options"][0]["total_km"], LEG["leg_14"]["route_options"][0]["duration_minutes"], LEG["leg_14"]["route_options"][0]["maps_url"], [wp(did,1,"pl_burgos_lunch","meal"), wp(did,2,"pl_burgos_charge","charge")], [route_option("fast","leg_14",True), route_option("scenic","leg_14",False)])
], [stop(did,1,"pl_salamanca_camp","wake"), stop(did,2,"pl_burgos_charge","charge"), stop(did,3,"pl_wecamp_sansebastian","sleep")])

did = day_id(32)
add(32, "pl_wecamp_sansebastian", "pl_wecamp_sansebastian", ["pl_chillida","pl_ss_grocery"], [], [stop(did,1,"pl_wecamp_sansebastian","wake"), stop(did,2,"pl_chillida","activity"), stop(did,3,"pl_ss_grocery","groceries"), stop(did,4,"pl_wecamp_sansebastian","sleep")])

did = day_id(33)
add(33, "pl_wecamp_sansebastian", "pl_huttopia_landes", ["pl_landes_activity","pl_capbreton_fish","pl_landes_bakery"], [
    move(did, "pl_wecamp_sansebastian", "pl_huttopia_landes", LEG["leg_15"]["route_options"][0]["total_km"], LEG["leg_15"]["route_options"][0]["duration_minutes"], LEG["leg_15"]["route_options"][0]["maps_url"], [wp(did,1,"pl_biarritz_beachpause","activity")], [route_option("fast","leg_15",True), route_option("scenic","leg_15",False)])
], [stop(did,1,"pl_wecamp_sansebastian","wake"), stop(did,2,"pl_biarritz_beachpause","activity"), stop(did,3,"pl_huttopia_landes","sleep")])

did = day_id(34)
add(34, "pl_huttopia_landes", "pl_huttopia_landes", ["pl_landes_activity","pl_capbreton_fish","pl_landes_bakery"], [], [stop(did,1,"pl_huttopia_landes","wake"), stop(did,2,"pl_landes_activity","activity"), stop(did,3,"pl_capbreton_fish","groceries"), stop(did,4,"pl_huttopia_landes","sleep")])

did = day_id(35)
add(35, "pl_huttopia_landes", "pl_royat", ["pl_puydedome","pl_clermont_market"], [
    move(did, "pl_huttopia_landes", "pl_royat", LEG["leg_16"]["route_options"][0]["total_km"], LEG["leg_16"]["route_options"][0]["duration_minutes"], LEG["leg_16"]["route_options"][0]["maps_url"], [wp(did,1,"pl_bordeaux_charge","charge"), wp(did,2,"pl_clermont_charge","charge")], [route_option("fast","leg_16",True), route_option("scenic","leg_16",False)])
], [stop(did,1,"pl_huttopia_landes","wake"), stop(did,2,"pl_bordeaux_charge","charge"), stop(did,3,"pl_royat","sleep")])

did = day_id(36)
add(36, "pl_royat", "pl_zurich_home", ["pl_zurich_home"], [
    move(did, "pl_royat", "pl_zurich_home", LEG["leg_17"]["route_options"][0]["total_km"], LEG["leg_17"]["route_options"][0]["duration_minutes"], LEG["leg_17"]["route_options"][0]["maps_url"], [wp(did,1,"pl_lyon_lunch","meal"), wp(did,2,"pl_clermont_charge","charge")], [route_option("fast","leg_17",True), route_option("scenic","leg_17",False)])
], [stop(did,1,"pl_royat","wake"), stop(did,2,"pl_lyon_lunch","meal"), stop(did,3,"pl_zurich_home","sleep")])

itinerary = {"schema_version":"3.4.0","version_id":"v1-min","locations":locations,"days":days}

# validate references
for d in days:
    assert d["wake_location_id"] in loc_ids or d["wake_location_id"] is None
    assert d["sleep_location_id"] in loc_ids or d["sleep_location_id"] is None
    for x in d["nearby_suggestions"]:
        assert x["location_id"] in loc_ids
    for s in d["stops"]:
        assert s["location_id"] in loc_ids
    for m in d["movements"]:
        assert len(m["route_options"]) >= 2
        assert "open_route_url" in m["route"]
        for w in m["route"]["waypoints"]:
            assert w["location_id"] in loc_ids

print(json.dumps(itinerary, separators=(",", ":"), ensure_ascii=True))
