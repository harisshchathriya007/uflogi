export async function predictTripCost(orderData) {
  const response = await fetch("/api/predict-cost", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch prediction.");
  }

  return data;
}

export async function fetchExampleTripCost() {
  const sampleOrder = {
    weight: 12,
    volume: 1.3,
    distance_km: 10,
    priority_num: 3,
    fuel_used: 0.5,
    time_remaining_hr: 4,
  };

  return predictTripCost(sampleOrder);
}

export async function fetchConsolidationDashboard() {
  const response = await fetch("/api/consolidation/dashboard");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch consolidation dashboard.");
  }
  return data;
}
