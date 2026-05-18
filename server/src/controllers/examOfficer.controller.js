import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createCandidate = asyncHandler(async (req, res) => {
  const { armyNumber, rank, name, unit, trade, password } = req.body;

  const existing = await prisma.user.findUnique({
    where: { armyNumber: armyNumber.toUpperCase() },
  });

  if (existing) {
    throw new ApiError(409, `User with army number '${armyNumber}' already exists`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const candidate = await prisma.user.create({
    data: {
      armyNumber: armyNumber.toUpperCase(),
      rank,
      name,
      unit,
      trade,
      password: hashedPassword,
      role: "candidate",
      createdBy: req.user.id,
    },
  });

  const { password: _, ...created } = candidate;

  res.status(201).json(new ApiResponse(201, { user: created }, "Candidate created successfully"));
});

export const listCandidates = asyncHandler(async (req, res) => {
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

export const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await prisma.user.findFirst({
    where: { id: req.params.id, role: "candidate" },
  });

  if (!candidate) {
    throw new ApiError(404, "Candidate not found");
  }

  const { password, ...safeCandidate } = candidate;

  res.status(200).json(new ApiResponse(200, { user: safeCandidate }, "Candidate retrieved"));
});

export const updateCandidate = asyncHandler(async (req, res) => {
  const { name, rank, unit, trade } = req.body;

  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "candidate" }
  });

  if (!existing) throw new ApiError(404, "Candidate not found");

  const candidate = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, rank, unit, trade },
  });

  const { password, ...safeCandidate } = candidate;

  res.status(200).json(new ApiResponse(200, { user: safeCandidate }, "Candidate updated"));
});

export const deactivateCandidate = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "candidate" }
  });

  if (!existing) throw new ApiError(404, "Candidate not found");

  const candidate = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  const { password, ...safeCandidate } = candidate;

  res.status(200).json(new ApiResponse(200, { user: safeCandidate }, "Candidate deactivated"));
});

export const activateCandidate = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "candidate" }
  });

  if (!existing) throw new ApiError(404, "Candidate not found");

  const candidate = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: true },
  });

  const { password, ...safeCandidate } = candidate;

  res.status(200).json(new ApiResponse(200, { user: safeCandidate }, "Candidate activated"));
});
