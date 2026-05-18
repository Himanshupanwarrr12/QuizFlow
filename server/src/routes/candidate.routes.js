import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { changePasswordSchema } from "../validators/auth.validator.js";
import { 
  getProfile, 
  changePassword, 
  getCandidateAttempts, 
  startExamAttempt, 
  submitExamAttempt 
} from "../controllers/candidate.controller.js";

const router = Router();

// All routes require candidate role
router.use(verifyJWT, requireRole("candidate"));

router.get("/profile", getProfile);
router.patch("/profile/change-password", validate(changePasswordSchema), changePassword);

router.get("/attempts", getCandidateAttempts);
router.post("/attempts/start", startExamAttempt);
router.post("/attempts/:id/submit", submitExamAttempt);

export default router;
