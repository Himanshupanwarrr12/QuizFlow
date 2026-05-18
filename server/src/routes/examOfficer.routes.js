import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema } from "../validators/user.validator.js";
import {
  createCandidate,
  listCandidates,
  getCandidate,
  updateCandidate,
  deactivateCandidate,
  activateCandidate,
} from "../controllers/examOfficer.controller.js";

const router = Router();

// All routes require exam_officer role
router.use(verifyJWT, requireRole("exam_officer"));

// ── Candidate CRUD ──────────────────────────────────────────────────────────
router.post("/candidates", validate(createUserSchema), createCandidate);
router.get("/candidates", listCandidates);
router.get("/candidates/:id", getCandidate);
router.patch("/candidates/:id", validate(updateUserSchema), updateCandidate);
router.patch("/candidates/:id/deactivate", deactivateCandidate);
router.patch("/candidates/:id/activate", activateCandidate);

export default router;
