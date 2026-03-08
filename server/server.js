import express from "express";
import mlRoutes from "./routes/mlRoutes.js";

const app = express();

app.use(express.json());
app.use("/api", mlRoutes);

export default app;
