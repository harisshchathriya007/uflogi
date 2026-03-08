import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "trip_cost_model.pkl"
VEHICLES_CSV = BASE_DIR / "chennai_vehicles.csv"
DEFAULT_PRIORITY_MAP = {"Low": 1, "Medium": 2, "High": 3}
DEFAULT_FEATURE_COLUMNS = [
    "weight",
    "volume",
    "distance_km",
    "priority_num",
    "fuel_used",
    "time_remaining_hr",
]
DEFAULT_MILEAGE = 12.0
DEFAULT_VEHICLE_ROWS = [
    {
        "vehicle_id": "DEFAULT_VEHICLE",
        "max_weight_capacity": 1000.0,
        "max_volume_capacity": 10.0,
        "mileage": DEFAULT_MILEAGE,
    }
]
REQUIRED_VEHICLE_COLUMNS = [
    "vehicle_id",
    "max_weight_capacity",
    "max_volume_capacity",
    "mileage",
]


def haversine(lat1, lon1, lat2, lon2):
    earth_radius_km = 6371.0
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return float(earth_radius_km * c)


def parse_json_text(raw_text, source_name):
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Invalid JSON in {source_name}: {exc.msg} (line {exc.lineno}, column {exc.colno})."
        ) from exc

    if not isinstance(payload, dict):
        raise ValueError(f"JSON from {source_name} must be an object.")

    return payload


def parse_payload():
    args = sys.argv[1:]
    force_stdin = False
    file_path = None
    arg_parts = []
    index = 0

    while index < len(args):
        token = args[index]
        if token == "--stdin":
            force_stdin = True
        elif token == "--file":
            if index + 1 >= len(args):
                raise ValueError("Missing file path after --file.")
            file_path = args[index + 1]
            index += 1
        else:
            arg_parts.append(token)
        index += 1

    if file_path:
        input_path = Path(file_path)
        if not input_path.is_absolute():
            input_path = (Path.cwd() / input_path).resolve()
        if not input_path.exists():
            raise FileNotFoundError(f"JSON input file not found: {input_path}")

        return parse_json_text(input_path.read_text(encoding="utf-8"), f"file {input_path}")

    if arg_parts:
        raw_arg = " ".join(arg_parts).strip()
        try:
            return parse_json_text(raw_arg, "command-line argument")
        except ValueError as arg_error:
            if not sys.stdin.isatty():
                raw_stdin = sys.stdin.read().strip()
                if raw_stdin:
                    return parse_json_text(raw_stdin, "stdin")

            raise ValueError(
                f"{arg_error} Use --stdin with piped JSON or --file <path>."
            ) from arg_error

    if force_stdin:
        if sys.stdin.isatty():
            raise ValueError("No JSON received on stdin.")

        raw_stdin = sys.stdin.read().strip()
        if not raw_stdin:
            raise ValueError("No JSON received on stdin.")

        return parse_json_text(raw_stdin, "stdin")

    if not sys.stdin.isatty():
        raw_stdin = sys.stdin.read().strip()
        if raw_stdin:
            return parse_json_text(raw_stdin, "stdin")

    raise ValueError("Missing JSON input. Pass JSON arg, use --stdin with a pipe, or use --file <path>.")


def load_model_bundle():
    loaded = joblib.load(MODEL_PATH)

    if isinstance(loaded, dict) and "model" in loaded:
        return loaded
    if hasattr(loaded, "predict"):
        return {
            "model": loaded,
            "feature_columns": DEFAULT_FEATURE_COLUMNS,
            "priority_map": DEFAULT_PRIORITY_MAP,
            "default_mileage": DEFAULT_MILEAGE,
            "eta_speed_kmph": 30.0,
        }
    raise ValueError("Unsupported model format in trip_cost_model.pkl")


def _to_float(value, default_value):
    try:
        if value is None:
            return float(default_value)
        if isinstance(value, str) and not value.strip():
            return float(default_value)
        return float(value)
    except (TypeError, ValueError):
        return float(default_value)


def _pick_best_vehicle(total_weight, total_volume, vehicles):
    viable = vehicles[
        (vehicles["max_weight_capacity"] >= total_weight)
        & (vehicles["max_volume_capacity"] >= total_volume)
    ]
    if not viable.empty:
        return viable.sort_values(
            by=["max_weight_capacity", "max_volume_capacity"],
            ascending=[True, True],
        ).iloc[0], False

    fallback = vehicles.sort_values(
        by=["max_weight_capacity", "max_volume_capacity"],
        ascending=[False, False],
    ).iloc[0]
    return fallback, True


def _parse_orders(payload):
    if "orders" in payload:
        orders_raw = payload["orders"]
        if not isinstance(orders_raw, list) or not orders_raw:
            raise ValueError("'orders' must be a non-empty array.")
        for item in orders_raw:
            if not isinstance(item, dict):
                raise ValueError("Every entry in 'orders' must be a JSON object.")
        return orders_raw, True

    return [payload], False


def _load_vehicle_frame(payload, default_mileage):
    vehicles_raw = payload.get("vehicles")

    if vehicles_raw is None:
        if VEHICLES_CSV.exists():
            vehicles = pd.read_csv(VEHICLES_CSV)
        else:
            vehicles = pd.DataFrame(DEFAULT_VEHICLE_ROWS)
    else:
        if not isinstance(vehicles_raw, list) or not vehicles_raw:
            raise ValueError("'vehicles' must be a non-empty array when provided.")
        for item in vehicles_raw:
            if not isinstance(item, dict):
                raise ValueError("Every entry in 'vehicles' must be a JSON object.")
        vehicles = pd.DataFrame(vehicles_raw)

    for column in REQUIRED_VEHICLE_COLUMNS:
        if column not in vehicles.columns:
            if column == "vehicle_id":
                vehicles[column] = ""
            elif column == "mileage":
                vehicles[column] = float(default_mileage)
            else:
                vehicles[column] = 0.0

    vehicles = vehicles[REQUIRED_VEHICLE_COLUMNS].copy()
    vehicles["vehicle_id"] = vehicles["vehicle_id"].fillna("").astype(str).str.strip()
    missing_ids = vehicles["vehicle_id"] == ""
    if missing_ids.any():
        vehicles.loc[missing_ids, "vehicle_id"] = [
            f"VEHICLE_{idx + 1}" for idx in range(int(missing_ids.sum()))
        ]

    vehicles["max_weight_capacity"] = pd.to_numeric(
        vehicles["max_weight_capacity"], errors="coerce"
    ).fillna(0.0)
    vehicles["max_volume_capacity"] = pd.to_numeric(
        vehicles["max_volume_capacity"], errors="coerce"
    ).fillna(0.0)
    vehicles["mileage"] = pd.to_numeric(vehicles["mileage"], errors="coerce").replace(0, np.nan)
    vehicles["mileage"] = vehicles["mileage"].fillna(float(default_mileage))
    vehicles["mileage"] = vehicles["mileage"].clip(lower=0.1)

    if vehicles.empty:
        vehicles = pd.DataFrame(DEFAULT_VEHICLE_ROWS)

    return vehicles.reset_index(drop=True)


def _build_orders_frame(orders_raw, priority_map):
    orders = pd.DataFrame(orders_raw).copy()
    orders["order_index"] = range(len(orders))

    if "order_id" in orders.columns:
        orders["order_ref"] = orders["order_id"].fillna("").astype(str)
    else:
        orders["order_ref"] = [f"order_{idx + 1}" for idx in range(len(orders))]

    orders["weight"] = pd.to_numeric(orders.get("weight", 0.0), errors="coerce").fillna(0.0)
    orders["volume"] = pd.to_numeric(orders.get("volume", 0.0), errors="coerce").fillna(0.0)

    if "distance_km" not in orders.columns:
        orders["distance_km"] = np.nan
    orders["distance_km"] = pd.to_numeric(orders["distance_km"], errors="coerce")

    coord_columns = [
        "pickup_latitude",
        "pickup_longitude",
        "delivery_latitude",
        "delivery_longitude",
    ]
    for column in coord_columns:
        if column not in orders.columns:
            orders[column] = np.nan
        orders[column] = pd.to_numeric(orders[column], errors="coerce")

    missing_distance = orders["distance_km"].isna()
    if missing_distance.any():
        missing_coords = orders.loc[missing_distance, coord_columns].isna().any(axis=1)
        if missing_coords.any():
            raise ValueError(
                "Each order requires 'distance_km' or all pickup/delivery latitude and longitude values."
            )
        orders.loc[missing_distance, "distance_km"] = orders.loc[missing_distance].apply(
            lambda row: haversine(
                row["pickup_latitude"],
                row["pickup_longitude"],
                row["delivery_latitude"],
                row["delivery_longitude"],
            ),
            axis=1,
        )

    if "priority_num" in orders.columns:
        orders["priority_num"] = pd.to_numeric(orders["priority_num"], errors="coerce")
    else:
        orders["priority_num"] = np.nan
    priority_text = orders.get("priority", "Medium")
    priority_text = priority_text.fillna("Medium").astype(str)
    orders["priority_num"] = orders["priority_num"].fillna(priority_text.map(priority_map).fillna(2))
    orders["priority_num"] = orders["priority_num"].astype(float)

    if "time_remaining_hr" in orders.columns:
        orders["time_remaining_hr"] = pd.to_numeric(orders["time_remaining_hr"], errors="coerce")
    else:
        orders["time_remaining_hr"] = np.nan
    created_at = pd.to_datetime(orders.get("created_at"), errors="coerce")
    delivery_deadline = pd.to_datetime(orders.get("delivery_deadline"), errors="coerce")
    inferred_time = (delivery_deadline - created_at).dt.total_seconds() / 3600.0
    orders["time_remaining_hr"] = orders["time_remaining_hr"].fillna(inferred_time)
    orders["time_remaining_hr"] = orders["time_remaining_hr"].fillna(1.0).clip(lower=0.0)

    if "mileage" not in orders.columns:
        orders["mileage"] = np.nan
    orders["mileage"] = pd.to_numeric(orders["mileage"], errors="coerce")

    if "fuel_used" not in orders.columns:
        orders["fuel_used"] = np.nan
    orders["fuel_used"] = pd.to_numeric(orders["fuel_used"], errors="coerce")

    return orders


def _apply_load_consolidation(orders, vehicles, default_mileage):
    orders = orders.copy()
    vehicles = vehicles.copy()

    has_pickup_coords = not orders[["pickup_latitude", "pickup_longitude"]].isna().any(axis=1).any()
    if has_pickup_coords and len(orders) > 1:
        n_clusters = max(1, min(len(vehicles), len(orders)))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        pickup_coords = orders[["pickup_latitude", "pickup_longitude"]].to_numpy()
        orders["cluster_id"] = kmeans.fit_predict(pickup_coords)
    else:
        orders["cluster_id"] = 0

    orders["assigned_vehicle"] = ""
    orders["capacity_exceeded"] = False
    orders["cluster_total_weight"] = 0.0
    orders["cluster_total_volume"] = 0.0
    orders["cluster_size"] = 0

    for cluster_id in sorted(orders["cluster_id"].unique()):
        cluster_mask = orders["cluster_id"] == cluster_id
        cluster_orders = orders.loc[cluster_mask]
        total_weight = float(cluster_orders["weight"].sum())
        total_volume = float(cluster_orders["volume"].sum())

        vehicle, exceeds_capacity = _pick_best_vehicle(total_weight, total_volume, vehicles)
        orders.loc[cluster_mask, "assigned_vehicle"] = str(vehicle["vehicle_id"])
        orders.loc[cluster_mask, "capacity_exceeded"] = bool(exceeds_capacity)
        orders.loc[cluster_mask, "cluster_total_weight"] = total_weight
        orders.loc[cluster_mask, "cluster_total_volume"] = total_volume
        orders.loc[cluster_mask, "cluster_size"] = int(cluster_orders.shape[0])

    mileage_map = vehicles.set_index("vehicle_id")["mileage"].to_dict()
    orders["vehicle_mileage"] = orders["assigned_vehicle"].map(mileage_map)

    orders["mileage"] = orders["mileage"].where(orders["mileage"] > 0)
    orders["vehicle_mileage"] = orders["vehicle_mileage"].where(orders["vehicle_mileage"] > 0)
    orders["mileage_for_calc"] = orders["mileage"].fillna(orders["vehicle_mileage"])
    orders["mileage_for_calc"] = orders["mileage_for_calc"].fillna(float(default_mileage)).clip(lower=0.1)

    computed_fuel = orders["distance_km"] / orders["mileage_for_calc"]
    orders["fuel_used"] = orders["fuel_used"].fillna(computed_fuel)
    orders["fuel_used"] = orders["fuel_used"].replace([np.inf, -np.inf], np.nan).fillna(0.0)

    dispatch_order = orders.sort_values(
        by=["cluster_id", "priority_num", "time_remaining_hr"],
        ascending=[True, False, True],
    ).copy()
    dispatch_order["dispatch_rank"] = dispatch_order.groupby("cluster_id").cumcount() + 1
    orders = orders.merge(
        dispatch_order[["order_index", "dispatch_rank"]],
        on="order_index",
        how="left",
    )
    orders["dispatch_rank"] = orders["dispatch_rank"].fillna(1).astype(int)

    return orders


def _predict_with_consolidation(payload, model_bundle):
    orders_raw, is_batch = _parse_orders(payload)
    priority_map = model_bundle.get("priority_map", DEFAULT_PRIORITY_MAP)
    default_mileage = float(model_bundle.get("default_mileage", DEFAULT_MILEAGE))
    eta_speed_kmph = float(model_bundle.get("eta_speed_kmph", 30.0))
    eta_speed_kmph = eta_speed_kmph if eta_speed_kmph > 0 else 30.0

    vehicles = _load_vehicle_frame(payload, default_mileage)
    orders = _build_orders_frame(orders_raw, priority_map)
    orders = _apply_load_consolidation(orders, vehicles, default_mileage)

    feature_columns = model_bundle["feature_columns"]
    model = model_bundle["model"]
    feature_frame = orders[feature_columns].astype(float)
    predicted_costs = model.predict(feature_frame)
    orders["predicted_cost"] = np.round(predicted_costs.astype(float), 2)

    orders["eta_hr"] = orders["distance_km"] / eta_speed_kmph
    orders["deadline_risk"] = orders["eta_hr"] > orders["time_remaining_hr"]

    orders = orders.sort_values("order_index").reset_index(drop=True)

    prediction_rows = []
    for _, row in orders.iterrows():
        prediction_rows.append(
            {
                "order_index": int(row["order_index"]),
                "order_ref": str(row["order_ref"]),
                "predicted_cost": float(row["predicted_cost"]),
                "consolidation": {
                    "cluster_id": int(row["cluster_id"]),
                    "cluster_size": int(row["cluster_size"]),
                    "cluster_total_weight": round(float(row["cluster_total_weight"]), 4),
                    "cluster_total_volume": round(float(row["cluster_total_volume"]), 4),
                    "assigned_vehicle": str(row["assigned_vehicle"]),
                    "capacity_exceeded": bool(row["capacity_exceeded"]),
                    "dispatch_rank": int(row["dispatch_rank"]),
                    "deadline_risk": bool(row["deadline_risk"]),
                },
            }
        )

    summary = {
        "orders_count": int(len(prediction_rows)),
        "clusters_count": int(orders["cluster_id"].nunique()),
        "capacity_exceeded_clusters": int(
            orders.groupby("cluster_id")["capacity_exceeded"].any().sum()
        ),
        "predicted_cost_total": round(float(orders["predicted_cost"].sum()), 2),
    }

    if not is_batch and len(prediction_rows) == 1:
        first = prediction_rows[0]
        return {
            "predicted_cost": first["predicted_cost"],
            "consolidation": first["consolidation"],
            "summary": summary,
        }

    return {
        "predictions": prediction_rows,
        "summary": summary,
    }


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found at {MODEL_PATH}. Run train_model.py first."
        )

    model_bundle = load_model_bundle()
    payload = parse_payload()
    result = _predict_with_consolidation(payload, model_bundle)
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
