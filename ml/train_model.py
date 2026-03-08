import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
ORDERS_CSV = BASE_DIR / "chennai_orders.csv"
VEHICLES_CSV = BASE_DIR / "chennai_vehicles.csv"
MODEL_PATH = BASE_DIR / "trip_cost_model.pkl"
CLUSTER_PATH = BASE_DIR / "cluster_model.pkl"

PRIORITY_MAP = {"Low": 1, "Medium": 2, "High": 3}
FEATURE_COLUMNS = [
    "weight",
    "volume",
    "distance_km",
    "priority_num",
    "fuel_used",
    "time_remaining_hr",
]


def pick_best_vehicle(total_weight, total_volume, vehicles):
    """Pick the smallest vehicle that can hold the full cluster load."""
    viable = vehicles[
        (vehicles["max_weight_capacity"] >= total_weight)
        & (vehicles["max_volume_capacity"] >= total_volume)
    ]
    if not viable.empty:
        return viable.sort_values(
            by=["max_weight_capacity", "max_volume_capacity"],
            ascending=[True, True],
        ).iloc[0], False

    # Fallback: choose the largest vehicle and mark capacity exceeded.
    fallback = vehicles.sort_values(
        by=["max_weight_capacity", "max_volume_capacity"],
        ascending=[False, False],
    ).iloc[0]
    return fallback, True


def haversine(lat1, lon1, lat2, lon2):
    """Compute great-circle distance between two points in kilometers."""
    earth_radius_km = 6371.0
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)

    a = np.sin(dphi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return earth_radius_km * c


def load_data():
    if not ORDERS_CSV.exists():
        raise FileNotFoundError(f"Orders dataset not found: {ORDERS_CSV}")
    if not VEHICLES_CSV.exists():
        raise FileNotFoundError(f"Vehicles dataset not found: {VEHICLES_CSV}")

    orders = pd.read_csv(ORDERS_CSV)
    vehicles = pd.read_csv(VEHICLES_CSV)
    if orders.empty:
        raise ValueError("Orders dataset is empty.")
    if vehicles.empty:
        raise ValueError("Vehicles dataset is empty.")
    return orders, vehicles


def build_features(orders, vehicles):
    orders = orders.copy()
    vehicles = vehicles.copy()

    orders["distance_km"] = haversine(
        orders["pickup_latitude"],
        orders["pickup_longitude"],
        orders["delivery_latitude"],
        orders["delivery_longitude"],
    )

    orders["priority_num"] = orders["priority"].map(PRIORITY_MAP).fillna(2).astype(float)

    orders["delivery_deadline"] = pd.to_datetime(orders["delivery_deadline"], errors="coerce")
    orders["created_at"] = pd.to_datetime(orders["created_at"], errors="coerce")
    orders["time_remaining_hr"] = (
        (orders["delivery_deadline"] - orders["created_at"]).dt.total_seconds() / 3600.0
    )
    orders["time_remaining_hr"] = orders["time_remaining_hr"].fillna(1.0).clip(lower=0.0)
    orders["urgency_score"] = orders["priority_num"] * 100.0 - orders["time_remaining_hr"]

    n_clusters = min(len(vehicles), len(orders))
    n_clusters = max(n_clusters, 1)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)

    pickup_coords = orders[["pickup_latitude", "pickup_longitude"]].to_numpy()
    orders["cluster"] = kmeans.fit_predict(pickup_coords)

    orders["assigned_vehicle"] = None
    orders["exceeded"] = False

    vehicle_info = vehicles[
        ["vehicle_id", "max_weight_capacity", "max_volume_capacity"]
    ].reset_index(drop=True)

    for cluster_id in sorted(orders["cluster"].unique()):
        cluster_mask = orders["cluster"] == cluster_id
        cluster_orders = orders.loc[cluster_mask]

        total_weight = cluster_orders["weight"].sum()
        total_volume = cluster_orders["volume"].sum()

        vehicle, exceeds_capacity = pick_best_vehicle(total_weight, total_volume, vehicle_info)
        orders.loc[cluster_mask, "assigned_vehicle"] = vehicle["vehicle_id"]
        if exceeds_capacity:
            orders.loc[cluster_mask, "exceeded"] = True

    orders = orders.merge(
        vehicles[["vehicle_id", "mileage"]],
        left_on="assigned_vehicle",
        right_on="vehicle_id",
        how="left",
    )

    orders["mileage"] = orders["mileage"].replace(0, np.nan).fillna(12.0)
    orders["fuel_used"] = orders["distance_km"] / orders["mileage"]
    orders["fuel_used"] = orders["fuel_used"].replace([np.inf, -np.inf], np.nan).fillna(0.0)

    # Deterministic synthetic target that mimics operational trip cost components.
    rng = np.random.default_rng(42)
    noise = rng.normal(0, 5, len(orders))
    orders["synthetic_cost"] = (
        50
        + 10 * orders["weight"]
        + 20 * orders["volume"]
        + 40 * orders["fuel_used"]
        + 30 * orders["priority_num"]
        + 5 * orders["distance_km"]
        + noise
    )

    orders["eta_hr"] = orders["distance_km"] / 30.0
    orders["deadline_risk"] = orders["eta_hr"] > orders["time_remaining_hr"]
    orders["on_time_feasible"] = ~orders["deadline_risk"]

    # Within each consolidated cluster, urgent and near-deadline orders are dispatched first.
    orders = orders.sort_values(
        by=["cluster", "priority_num", "time_remaining_hr"],
        ascending=[True, False, True],
    ).reset_index(drop=True)
    orders["dispatch_rank"] = orders.groupby("cluster").cumcount() + 1

    return orders, kmeans


def train_and_save(orders, kmeans):
    feature_frame = orders[FEATURE_COLUMNS].astype(float)
    target = orders["synthetic_cost"].astype(float)

    x_train, x_test, y_train, y_test = train_test_split(
        feature_frame,
        target,
        test_size=0.2,
        random_state=42,
    )

    model = LinearRegression()
    model.fit(x_train, y_train)

    r2_score = model.score(x_test, y_test) if len(x_test) else model.score(x_train, y_train)

    model_bundle = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "priority_map": PRIORITY_MAP,
        "default_mileage": 12.0,
        "eta_speed_kmph": 30.0,
    }

    joblib.dump(model_bundle, MODEL_PATH)
    joblib.dump(kmeans, CLUSTER_PATH)

    return r2_score


def main():
    orders, vehicles = load_data()
    enriched_orders, kmeans = build_features(orders, vehicles)
    score = train_and_save(enriched_orders, kmeans)

    summary = {
        "status": "ok",
        "orders_loaded": int(len(orders)),
        "vehicles_loaded": int(len(vehicles)),
        "clusters": int(len(enriched_orders["cluster"].unique())),
        "capacity_exceeded_clusters": int(enriched_orders.groupby("cluster")["exceeded"].any().sum()),
        "high_priority_orders": int((enriched_orders["priority_num"] == 3).sum()),
        "on_time_feasible_rate": float(round(enriched_orders["on_time_feasible"].mean(), 4)),
        "model_path": str(MODEL_PATH),
        "cluster_model_path": str(CLUSTER_PATH),
        "r2": float(round(score, 4)),
    }

    print(json.dumps(summary))


if __name__ == "__main__":
    main()
