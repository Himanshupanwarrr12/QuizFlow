import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getProfile = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "Profile retrieved"));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

// @desc    Get candidate's exam attempts
// @route   GET /api/v1/candidate/attempts
// @access  Private (candidate)
export const getCandidateAttempts = asyncHandler(async (req, res) => {
  const attempts = await prisma.attempt.findMany({
    where: { candidateId: req.user.id },
    include: {
      responses: true
    }
  });

  res.status(200).json(new ApiResponse(200, { attempts }, "Attempts retrieved successfully"));
});

// @desc    Start an exam attempt
// @route   POST /api/v1/candidate/attempts/start
// @access  Private (candidate)
export const startExamAttempt = asyncHandler(async (req, res) => {
  const { examId } = req.body;

  if (!examId) {
    throw new ApiError(400, "Exam ID is required.");
  }

  // 1. Verify exam exists and is active
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        include: { question: true }
      }
    }
  });

  if (!exam || !exam.isActive) {
    throw new ApiError(404, "Examination not found or is currently inactive.");
  }

  // 2. Check existing attempts limit
  const attemptsCount = await prisma.attempt.count({
    where: { examId, candidateId: req.user.id, status: "submitted" }
  });

  if (attemptsCount >= exam.allowedAttempts) {
    throw new ApiError(400, "Maximum attempts limit reached for this examination.");
  }

  const attempt = await prisma.attempt.create({
    data: {
      examId,
      candidateId: req.user.id,
      startTime: new Date(),
      status: "started",
      totalMarks: 0,
      practicalMarks: null,
      vivaMarks: null
    }
  });

  res.status(201).json(new ApiResponse(201, { attempt, exam }, "Exam attempt started successfully"));
});

// @desc    Submit an exam attempt
// @route   POST /api/v1/candidate/attempts/:id/submit
// @access  Private (candidate)
export const submitExamAttempt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { responses } = req.body; // Array of { questionId, selectedOption }

  if (!responses || !Array.isArray(responses)) {
    throw new ApiError(400, "Responses list is required to submit.");
  }

  // 1. Verify attempt
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      exam: {
        include: {
          questions: {
            include: { question: true }
          }
        }
      }
    }
  });

  if (!attempt || attempt.candidateId !== req.user.id) {
    throw new ApiError(404, "Exam session attempt not found.");
  }

  if (attempt.status === "submitted") {
    throw new ApiError(400, "This exam session was already submitted.");
  }

  // 2. Process responses, calculate marks
  let totalScore = 0;
  const createdResponses = [];

  for (const resp of responses) {
    const { questionId, selectedOption } = resp;
    
    // Find question in the exam
    const examQ = attempt.exam.questions.find(eq => eq.questionId === questionId);
    if (!examQ) continue;

    const q = examQ.question;
    const isCorrect = q.correctOptions.toLowerCase().trim() === (selectedOption || "").toLowerCase().trim();
    const marksAwarded = isCorrect ? 1 : 0;
    totalScore += marksAwarded;

    const savedResponse = await prisma.response.create({
      data: {
        attemptId: id,
        questionId,
        selectedOption: selectedOption || "",
        marksAwarded
      }
    });
    createdResponses.push(savedResponse);
  }

  // 3. Mark attempt as submitted
  const updatedAttempt = await prisma.attempt.update({
    where: { id },
    data: {
      submitTime: new Date(),
      status: "submitted",
      totalMarks: totalScore
    }
  });

  res.status(200).json(
    new ApiResponse(
      200, 
      { 
        attempt: updatedAttempt, 
        responsesCount: createdResponses.length,
        score: totalScore,
        totalMarks: attempt.exam.totalMarks
      }, 
      "Examination attempt submitted and graded successfully"
    )
  );
});
