import { prisma } from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as xlsx from "xlsx";

export const uploadQuestions = asyncHandler(async (req, res) => {
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
  const questionsToInsert = data.map((row, index) => {
    // Explicit matches based on the image provided
    const type = row["type"]?.toString().trim().toLowerCase();
    const text = row["text"]?.toString().trim();
    
    if (!type || !text) {
      throw new ApiError(400, `Row ${index + 2}: 'type' and 'text' are required fields.`);
    }

    return {
      type: type,
      text: text,
      optionA: row["option_A"]?.toString().trim() || null,
      optionB: row["option_B"]?.toString().trim() || null,
      optionC: row["option_C"]?.toString().trim() || null,
      optionD: row["option_D"]?.toString().trim() || null,
      correctOptions: (row["correct_options(A,B,C...)"] || row["correct_options"])?.toString().trim() || "",
      category: (() => {
        const cat = row["category"]?.toString().trim();
        if (cat === "Could Know") return "Could Know";
        if (cat === "May Know") return "May Know";
        return "Must Know";
      })(),
      subject: row["subject"]?.toString().trim() || "General",
      topic: row["topic"]?.toString().trim() || "General",
      difficulty: row["difficulty"]?.toString().trim() || "Medium",
      bloom: row["bloom"]?.toString().trim() || "Knowledge",
      marks: parseInt(row["marks"]) || 1,
      explanation: row["explanation"]?.toString().trim() || null,
    };
  });

  // Batch insert or update questions sequentially
  let createdCount = 0;
  let updatedCount = 0;
  const processedQuestions = [];

  for (const q of questionsToInsert) {
    const existing = await prisma.question.findFirst({
      where: { text: q.text }
    });

    if (existing) {
      const updated = await prisma.question.update({
        where: { id: existing.id },
        data: q
      });
      processedQuestions.push(updated);
      updatedCount++;
    } else {
      const created = await prisma.question.create({
        data: q
      });
      processedQuestions.push(created);
      createdCount++;
    }
  }

  res.status(201).json(
    new ApiResponse(201, { 
      count: processedQuestions.length,
      createdCount,
      updatedCount,
      questions: processedQuestions
    }, `Bulk upload complete. ${createdCount} new questions added, ${updatedCount} existing questions updated.`)
  );
});

export const getQuestions = asyncHandler(async (req, res) => {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "desc" }
  });
  res.status(200).json(new ApiResponse(200, { questions }, "Questions retrieved"));
});

export const deleteAllQuestions = asyncHandler(async (req, res) => {
  const result = await prisma.question.deleteMany({});
  res.status(200).json(new ApiResponse(200, { deletedCount: result.count }, `Successfully deleted ${result.count} questions.`));
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.question.findUnique({ where: { id } });
  
  if (!existing) {
    throw new ApiError(404, "Question not found");
  }

  await prisma.question.delete({ where: { id } });
  res.status(200).json(new ApiResponse(200, null, "Question deleted successfully"));
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text, type, optionA, optionB, optionC, optionD, correctOptions, category, subject, topic, difficulty, marks, explanation } = req.body;

  const existing = await prisma.question.findUnique({ where: { id } });
  
  if (!existing) {
    throw new ApiError(404, "Question not found");
  }

  const updated = await prisma.question.update({
    where: { id },
    data: { text, type, optionA, optionB, optionC, optionD, correctOptions, category, subject, topic, difficulty, marks: parseInt(marks), explanation }
  });

  res.status(200).json(new ApiResponse(200, { question: updated }, "Question updated successfully"));
});

export const createQuestion = asyncHandler(async (req, res) => {
  const { type, text, optionA, optionB, optionC, optionD, correctOptions, category, subject, topic, difficulty, bloom, marks, explanation } = req.body;

  if (!type || !text) {
    throw new ApiError(400, "Type and text are required fields");
  }

  // Prevent manual duplicate creation
  const existing = await prisma.question.findFirst({
    where: { text: text.trim() }
  });

  if (existing) {
    throw new ApiError(400, "A question with the exact same text already exists in the question bank.");
  }

  const question = await prisma.question.create({
    data: {
      type,
      text,
      optionA: optionA || null,
      optionB: optionB || null,
      optionC: optionC || null,
      optionD: optionD || null,
      correctOptions: correctOptions || "",
      category: category || "Must Know",
      subject: subject || "General",
      topic: topic || "General",
      difficulty: difficulty || "Medium",
      bloom: bloom || "Knowledge",
      marks: parseInt(marks) || 1,
      explanation: explanation || null,
    }
  });

  res.status(201).json(new ApiResponse(201, { question }, "Question created successfully"));
});
