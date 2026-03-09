import API_BASE_URL from "../config/api";

export async function getOrders() {
  const res = await fetch(`${API_BASE_URL}/api/orders`);
  return res.json();
}

export async function createOrder(order) {
  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  return res.json();
}
