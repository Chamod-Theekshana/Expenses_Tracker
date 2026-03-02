import express from "express";
import { getProfile, updateProfile, updatePassword } from "../controllers/profileController";
import { validateNumericParam, validateProfileUpdateBody } from "../middleware/validators";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.use(requireAuth);

router.get("/:user_id", validateNumericParam("user_id"), getProfile);

router.put(
  "/:user_id",
  validateNumericParam("user_id"),
  validateProfileUpdateBody,
  updateProfile
);

router.put(
  "/:user_id/password",
  validateNumericParam("user_id"),
  updatePassword
);

export default router;
