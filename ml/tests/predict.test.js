import { EventEmitter } from "events";
import { jest } from "@jest/globals";
import request from "supertest";

const mockSpawn = jest.fn(() => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const processEvents = new EventEmitter();

  const mockProcess = {
    stdout,
    stderr,
    stdin: {
      write: jest.fn(),
      end: jest.fn(() => {
        setImmediate(() => {
          stdout.emit("data", Buffer.from('{"predicted_cost":1860.5,"consolidation":{"cluster_id":0,"assigned_vehicle":"CHNVEH001"}}'));
          processEvents.emit("close", 0);
        });
      }),
      on: jest.fn(),
    },
    on: processEvents.on.bind(processEvents),
  };

  return mockProcess;
});

jest.unstable_mockModule("child_process", () => ({
  spawn: mockSpawn,
}));

const { default: app } = await import("../../server/server.js");

describe("ML Prediction API", () => {
  it("should return predicted cost", async () => {
    const payload = {
      weight: 12,
      volume: 1.5,
      pickup_latitude: 13.0827,
      pickup_longitude: 80.2707,
      delivery_latitude: 13.0674,
      delivery_longitude: 80.2376,
      priority: "High",
      created_at: "2026-03-07T10:00:00",
      delivery_deadline: "2026-03-07T14:00:00",
      mileage: 14,
    };

    const res = await request(app).post("/api/predict-cost").send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("predicted_cost");
    expect(res.body).toHaveProperty("consolidation");
    expect(typeof res.body.predicted_cost).toBe("number");
  });
});
