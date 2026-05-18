import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import requireRole from "../middlewares/role.middleware.js";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

const router = Router();

// Only Super Admins and Exam Officers are allowed to view control panel dashboard aggregates
router.use(verifyJWT, requireRole("super_admin", "exam_officer"));

router.get("/stats", getDashboardStats);

export default router;
