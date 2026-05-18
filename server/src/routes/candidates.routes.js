import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createUserSchema } from "../validators/user.validator.js";
import {
  createCandidate,
  listCandidates,
  getCandidate,
  updateCandidate,
  deactivateCandidate,
  activateCandidate,
} from "../controllers/examOfficer.controller.js";

const router = Router();

// Restrict to Super Admins and Exam Officers
router.use(verifyJWT, requireRole("super_admin", "exam_officer"));

// Candidate Management Endpoints
router.post("/", validate(createUserSchema), createCandidate);
router.get("/", listCandidates);
router.get("/:id", getCandidate);
router.put("/:id", updateCandidate);
router.patch("/:id/deactivate", deactivateCandidate);
router.patch("/:id/activate", activateCandidate);

export default router;
