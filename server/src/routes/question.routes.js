import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { uploadQuestions, getQuestions, deleteAllQuestions, deleteQuestion, updateQuestion, createQuestion } from "../controllers/question.controller.js";

const router = Router();

// Allow both Super Admins and Exam Officers to manage the question bank
router.use(verifyJWT, requireRole("super_admin", "exam_officer"));

// Get all questions
router.get("/", getQuestions);

// Create a single question manually
router.post("/", createQuestion);

// Upload a CSV/Excel file of questions. Expects form-data with key "file"
router.post("/upload", upload.single("file"), uploadQuestions);

// Clear all questions
router.delete("/clear-all", deleteAllQuestions);

// Manage specific questions
router.delete("/:id", deleteQuestion);
router.put("/:id", updateQuestion);

export default router;
