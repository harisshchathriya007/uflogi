import { Router } from "express";

import { getConsolidationDashboard } from "../controllers/consolidationController.js";
import { predictCost } from "../controllers/mlController.js";

const router = Router();

router.post("/predict-cost", predictCost);
router.get("/consolidation/dashboard", getConsolidationDashboard);

export default router;

