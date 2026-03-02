import express from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactionByUserId,
  getTransactionSummaryByUserId,
  updateTransaction,
} from "../controllers/transactionsController";
import { validateNumericParam, validateTransactionBody } from "../middleware/validators";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.use(requireAuth);

// IMPORTANT: More specific routes must come first (otherwise "/:user_id" will catch them)
router.get(
  "/summary/:user_id",
  validateNumericParam("user_id"),
  getTransactionSummaryByUserId
);

router.get(
  "/:user_id",
  validateNumericParam("user_id"),
  getTransactionByUserId
);

router.get("/id/:id", validateNumericParam("id"), getTransactionById);

router.post("/", validateTransactionBody, createTransaction);

router.put("/:id", validateNumericParam("id"), validateTransactionBody, updateTransaction);

router.delete("/:id", validateNumericParam("id"), deleteTransaction);

export default router;
