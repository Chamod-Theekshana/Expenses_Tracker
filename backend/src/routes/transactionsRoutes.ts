import express from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransactionByUserId,
  getTransactionSummaryByUserId,
} from "../controllers/transactionsController";
import { validateNumericParam, validateTransactionBody } from "../middleware/validators";
import { requireUserFromBody, requireUserFromParam } from "../middleware/requireUser";

const router = express.Router();

// IMPORTANT: More specific routes must come first (otherwise "/:user_id" will catch them)
router.get(
  "/summary/:user_id",
  validateNumericParam("user_id"),
  requireUserFromParam("user_id"),
  getTransactionSummaryByUserId
);

router.get(
  "/:user_id",
  validateNumericParam("user_id"),
  requireUserFromParam("user_id"),
  getTransactionByUserId
);

router.post("/", validateTransactionBody, requireUserFromBody("user_id"), createTransaction);

router.delete("/:id", validateNumericParam("id"), deleteTransaction);

export default router;
