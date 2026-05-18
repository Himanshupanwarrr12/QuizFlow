import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createExamOfficer = asyncHandler(async (req, res) => {
  const { armyNumber, rank, name, unit, trade, password } = req.body;

  const existing = await prisma.user.findUnique({
    where: { armyNumber: armyNumber.toUpperCase() },
  });

  if (existing) {
    throw new ApiError(409, `User with army number '${armyNumber}' already exists`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const officer = await prisma.user.create({
    data: {
      armyNumber: armyNumber.toUpperCase(),
      rank,
      name,
      unit,
      trade,
      password: hashedPassword,
      role: "exam_officer",
      createdBy: req.user.id,
    },
  });

  const { password: _, ...created } = officer;

  res.status(201).json(new ApiResponse(201, { user: created }, "Exam officer created successfully"));
});

export const listExamOfficers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const whereClause = { role: "exam_officer" };

  if (req.query.search) {
    whereClause.OR = [
      { name: { contains: req.query.search } },
      { armyNumber: { contains: req.query.search } },
    ];
  }

  const [officers, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, armyNumber: true, rank: true, name: true, unit: true, trade: true, role: true, isActive: true, createdBy: true, createdAt: true, updatedAt: true
      }
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      officers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, "Exam officers retrieved")
  );
});

export const getExamOfficer = asyncHandler(async (req, res) => {
  const officer = await prisma.user.findFirst({
    where: { id: req.params.id, role: "exam_officer" },
  });

  if (!officer) {
    throw new ApiError(404, "Exam officer not found");
  }
  
  const { password, ...safeOfficer } = officer;

  res.status(200).json(new ApiResponse(200, { user: safeOfficer }, "Exam officer retrieved"));
});

export const updateExamOfficer = asyncHandler(async (req, res) => {
  const { name, rank, unit, trade } = req.body;

  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "exam_officer" }
  });

  if (!existing) throw new ApiError(404, "Exam officer not found");

  const officer = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, rank, unit, trade },
  });

  const { password, ...safeOfficer } = officer;

  res.status(200).json(new ApiResponse(200, { user: safeOfficer }, "Exam officer updated"));
});

export const deactivateExamOfficer = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "exam_officer" }
  });

  if (!existing) throw new ApiError(404, "Exam officer not found");

  const officer = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  const { password, ...safeOfficer } = officer;
  res.status(200).json(new ApiResponse(200, { user: safeOfficer }, "Exam officer deactivated"));
});

export const activateExamOfficer = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "exam_officer" }
  });

  if (!existing) throw new ApiError(404, "Exam officer not found");

  const officer = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: true },
  });

  const { password, ...safeOfficer } = officer;
  res.status(200).json(new ApiResponse(200, { user: safeOfficer }, "Exam officer activated"));
});

export const viewAllCandidates = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const whereClause = { role: "candidate" };

  if (req.query.search) {
    whereClause.OR = [
      { name: { contains: req.query.search } },
      { armyNumber: { contains: req.query.search } },
    ];
  }

  const [candidates, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, armyNumber: true, rank: true, name: true, unit: true, trade: true, role: true, isActive: true, createdBy: true, createdAt: true, updatedAt: true
      }
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      candidates,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, "Candidates retrieved")
  );
});

export const getResults = asyncHandler(async (_req, res) => {
  res.status(200).json(new ApiResponse(200, { results: [] }, "Results placeholder — no data yet"));
});

// ── Unified User Accounts CRUD (For Super Admin) ───────────────────────────

// @desc    List all registered user accounts
// @route   GET /api/v1/super-admin/users
export const listAllUsers = asyncHandler(async (req, res) => {
  const { search, role } = req.query;

  const whereClause = {};

  if (role && role !== "All Roles" && role !== "") {
    whereClause.role = role;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { armyNumber: { contains: search } }
    ];
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      armyNumber: true,
      rank: true,
      name: true,
      unit: true,
      trade: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  res.status(200).json(new ApiResponse(200, { users }, "User accounts retrieved successfully"));
});

// @desc    Create a new user account (any role)
// @route   POST /api/v1/super-admin/users
export const createUser = asyncHandler(async (req, res) => {
  const { armyNumber, rank, name, unit, trade, role, password } = req.body;

  if (!armyNumber || !name || !role || !password) {
    throw new ApiError(400, "Army number, Name, Role, and Password are required.");
  }

  const existing = await prisma.user.findUnique({
    where: { armyNumber: armyNumber.toUpperCase() },
  });

  if (existing) {
    throw new ApiError(409, `A user with service/army number '${armyNumber}' already exists.`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      armyNumber: armyNumber.toUpperCase(),
      rank: rank || "Spr",
      name,
      unit: unit || "HQ BEG",
      trade: trade || "Field Engineer",
      password: hashedPassword,
      role, // super_admin, exam_officer, candidate
      isActive: true,
      createdBy: req.user.id
    }
  });

  const { password: _, ...created } = newUser;

  res.status(201).json(new ApiResponse(201, { user: created }, "User account created successfully."));
});

// @desc    Update a user account's profile
// @route   PATCH /api/v1/super-admin/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rank, name, unit, trade, role } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "User account not found.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      rank: rank ?? existing.rank,
      name: name ?? existing.name,
      unit: unit ?? existing.unit,
      trade: trade ?? existing.trade,
      role: role ?? existing.role
    }
  });

  const { password: _, ...safeUser } = updated;

  res.status(200).json(new ApiResponse(200, { user: safeUser }, "User account updated successfully."));
});

// @desc    Toggle a user account's active state
// @route   PATCH /api/v1/super-admin/users/:id/toggle
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "User account not found.");
  }

  // Prevent super admins from accidentally deactivating themselves
  if (existing.id === req.user.id) {
    throw new ApiError(400, "You cannot deactivate your own administrative account.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !existing.isActive }
  });

  res.status(200).json(new ApiResponse(200, { user: updated }, `User account has been ${updated.isActive ? 'activated' : 'deactivated'}.`));
});
