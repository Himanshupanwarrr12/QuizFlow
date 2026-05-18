import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { overrideMarksSchema } from "../validators/user.validator.js";
import { getResults, getResultDetail, overrideMarks, initializeAttempt } from "../controllers/result.controller.js";

const router = Router();

// Only Super Admins and Exam Officers are allowed to view evaluations and results
router.use(verifyJWT, requireRole("super_admin", "exam_officer"));

// Get list of all completed attempts/results
router.get("/", getResults);

// Initialize placeholder manual evaluation attempt
router.post("/initialize-attempt", initializeAttempt);

// Get detailed question sheet for a single candidate attempt
router.get("/:id", getResultDetail);

// Override candidate marks
router.patch("/:attemptId/override-marks", validate(overrideMarksSchema), overrideMarks);

export default router;
