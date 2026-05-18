import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import { createExam, getExams, deleteExam, toggleExamStatus, updateExam } from "../controllers/exam.controller.js";

const router = Router();

// Protect all exam routes with JWT authentication
router.use(verifyJWT);

// Get all exams (accessible by admin, officer, and candidates)
router.get("/", getExams);

// Admin / Officer only write routes
router.post("/", requireRole("super_admin", "exam_officer"), createExam);
router.put("/:id", requireRole("super_admin", "exam_officer"), updateExam);
router.delete("/:id", requireRole("super_admin", "exam_officer"), deleteExam);
router.patch("/:id/toggle", requireRole("super_admin", "exam_officer"), toggleExamStatus);

export default router;
