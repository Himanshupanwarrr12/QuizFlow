import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema, overrideMarksSchema } from "../validators/user.validator.js";
import {
  createExamOfficer,
  listExamOfficers,
  getExamOfficer,
  updateExamOfficer,
  deactivateExamOfficer,
  activateExamOfficer,
  viewAllCandidates,
  getResults,
  listAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
} from "../controllers/superAdmin.controller.js";

const router = Router();

// All routes require super_admin role
router.use(verifyJWT, requireRole("super_admin"));

// ── Exam Officer CRUD ───────────────────────────────────────────────────────
router.post("/exam-officers", validate(createUserSchema), createExamOfficer);
router.get("/exam-officers", listExamOfficers);
router.get("/exam-officers/:id", getExamOfficer);
router.patch("/exam-officers/:id", validate(updateUserSchema), updateExamOfficer);
router.patch("/exam-officers/:id/deactivate", deactivateExamOfficer);
router.patch("/exam-officers/:id/activate", activateExamOfficer);

// ── Candidates (read-only) ──────────────────────────────────────────────────
router.get("/candidates", viewAllCandidates);

// ── Results (placeholders) ──────────────────────────────────────────────────
router.get("/results", getResults);

// ── Unified User Accounts CRUD ──────────────────────────────────────────────
router.get("/users", listAllUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/toggle", toggleUserStatus);

export default router;
