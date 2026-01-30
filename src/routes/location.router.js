import express from "express";
import requireAuthMiddleware from "../middlewares/require-auth.middleware.js";
import requireAdminMiddleware from "../middlewares/require-admin.middleware.js";
import { getLocationsController } from "../controllers/location.controller.js";
const router = express.Router();

router.get(
  "/all",
  requireAuthMiddleware,
  requireAdminMiddleware,
  getLocationsController,
);

export default router;
