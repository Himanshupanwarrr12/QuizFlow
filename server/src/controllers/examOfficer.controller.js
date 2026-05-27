import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as xlsx from "xlsx";

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

export const uploadCandidates = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded. Please upload a CSV or Excel file.");
  }

  // Parse the file buffer using xlsx
  const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert sheet to JSON array
  const data = xlsx.utils.sheet_to_json(sheet);

  if (data.length === 0) {
    throw new ApiError(400, "The uploaded file is empty or formatted incorrectly.");
  }

  // Map rows to our Prisma schema matching the excel template
  const candidatesToInsert = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const armyNumber = row["army_number"]?.toString().trim() || row["armyNumber"]?.toString().trim();
    const rank = row["rank"]?.toString().trim() || "Spr";
    const name = row["name"]?.toString().trim();
    const unit = row["unit"]?.toString().trim() || "21 Engr Regt";
    const trade = row["trade"]?.toString().trim() || "Field Engineer";
    const password = row["password"]?.toString().trim() || "Password@123";

    if (!armyNumber || !name) {
      throw new ApiError(400, `Row ${i + 2}: 'army_number' and 'name' are required fields.`);
    }

    candidatesToInsert.push({
      armyNumber: armyNumber.toUpperCase(),
      rank,
      name,
      unit,
      trade,
      password,
    });
  }

  let createdCount = 0;
  let updatedCount = 0;
  const processedCandidates = [];

  for (const c of candidatesToInsert) {
    const existing = await prisma.user.findUnique({
      where: { armyNumber: c.armyNumber }
    });

    const hashedPassword = await bcrypt.hash(c.password, 10);

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          rank: c.rank,
          name: c.name,
          unit: c.unit,
          trade: c.trade,
          password: hashedPassword,
          isActive: true,
        }
      });
      const { password: _, ...safe } = updated;
      processedCandidates.push(safe);
      updatedCount++;
    } else {
      const created = await prisma.user.create({
        data: {
          armyNumber: c.armyNumber,
          rank: c.rank,
          name: c.name,
          unit: c.unit,
          trade: c.trade,
          password: hashedPassword,
          role: "candidate",
          createdBy: req.user.id,
        }
      });
      const { password: _, ...safe } = created;
      processedCandidates.push(safe);
      createdCount++;
    }
  }

  res.status(201).json(
    new ApiResponse(201, { 
      count: processedCandidates.length,
      createdCount,
      updatedCount,
    }, `Bulk upload complete. ${createdCount} new candidates enrolled, ${updatedCount} existing candidates updated.`)
  );
});
