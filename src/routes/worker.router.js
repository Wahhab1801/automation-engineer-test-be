import express from "express";
import requireAuthMiddleware from "../middlewares/require-auth.middleware.js";
import requireAdminMiddleware from "../middlewares/require-admin.middleware.js";
import { getWorkersController } from "../controllers/worker.controller.js";
const router = express.Router();

router.get(
  "/all",
  requireAuthMiddleware,
  requireAdminMiddleware,
  getWorkersController,
);

export default router;
