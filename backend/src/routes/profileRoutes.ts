import express from "express";
import { exportUserData, getProfile, updateProfile, updatePassword } from "../controllers/profileController";
import { validateNumericParam, validateProfileUpdateBody } from "../middleware/validators";
import { requireAuth, requireUserMatchParam } from "../middleware/requireAuth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/:user_id/data-export",
  validateNumericParam("user_id"),
  requireUserMatchParam("user_id"),
  asyncHandler(exportUserData)
);

router.get(
  "/:user_id",
  validateNumericParam("user_id"),
  requireUserMatchParam("user_id"),
  asyncHandler(getProfile)
);

router.put(
  "/:user_id",
  validateNumericParam("user_id"),
  requireUserMatchParam("user_id"),
  validateProfileUpdateBody,
  asyncHandler(updateProfile)
);

router.put(
  "/:user_id/password",
  validateNumericParam("user_id"),
  requireUserMatchParam("user_id"),
  asyncHandler(updatePassword)
);

export default router;
