import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// @desc    Create a new examination
// @route   POST /api/v1/exams
// @access  Private (super_admin, exam_officer)
export const createExam = asyncHandler(async (req, res) => {
  const { 
    title, 
    code, 
    subject, 
    course, 
    durationMinutes, 
    allowedAttempts, 
    units, 
    randomizeOrder, 
    shuffleOptions, 
    showResult, 
    instructions,
    questionIds 
  } = req.body;

  if (!title || !durationMinutes || !questionIds || questionIds.length === 0) {
    throw new ApiError(400, "Title, duration, and at least one selected question are required.");
  }

  // Auto-generate code if blank
  const examCode = code && code.trim() !== "" 
    ? code.trim() 
    : `EXM-${Date.now().toString().slice(-6)}`;

  // Verify the questions exist and calculate total marks
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } }
  });

  if (questions.length === 0) {
    throw new ApiError(400, "None of the selected questions exist.");
  }

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  // Store units as comma-separated string if passed as array
  const formattedUnits = Array.isArray(units) ? units.join(", ") : (units || "All Units");

  const creatorName = req.user?.name || "Maj S. Gupta"; // Fallback to mockup name if user not in session

  // Create the exam and link questions in a transaction
  const exam = await prisma.$transaction(async (tx) => {
    const newExam = await tx.exam.create({
      data: {
        title,
        code: examCode,
        subject: subject || "General",
        course: course || "All Courses",
        durationMinutes: parseInt(durationMinutes) || 30,
        allowedAttempts: parseInt(allowedAttempts) || 1,
        units: formattedUnits,
        randomizeOrder: randomizeOrder ?? true,
        shuffleOptions: shuffleOptions ?? false,
        showResult: showResult ?? true,
        instructions: instructions || "All questions are compulsory.",
        totalMarks,
        createdBy: creatorName,
        isActive: true
      }
    });

    // Create the ExamQuestion junction entries
    const examQuestionsData = questionIds.map((qId, idx) => ({
      examId: newExam.id,
      questionId: qId,
      order: idx + 1
    }));

    await tx.examQuestion.createMany({
      data: examQuestionsData
    });

    return newExam;
  });

  res.status(201).json(new ApiResponse(201, { exam }, "Examination created successfully"));
});

// @desc    Get all examinations
// @route   GET /api/v1/exams
// @access  Private (super_admin, exam_officer, candidate)
export const getExams = asyncHandler(async (req, res) => {
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      questions: {
        include: {
          question: true
        }
      }
    }
  });

  res.status(200).json(new ApiResponse(200, { exams }, "Examinations retrieved successfully"));
});

// @desc    Delete an examination
// @route   DELETE /api/v1/exams/:id
// @access  Private (super_admin, exam_officer)
export const deleteExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Examination not found.");
  }

  await prisma.exam.delete({ where: { id } });

  res.status(200).json(new ApiResponse(200, null, "Examination deleted successfully."));
});

// @desc    Toggle examination active state
// @route   PATCH /api/v1/exams/:id/toggle
// @access  Private (super_admin, exam_officer)
export const toggleExamStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Examination not found.");
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: { isActive: !existing.isActive }
  });

  res.status(200).json(new ApiResponse(200, { exam: updated }, `Examination ${updated.isActive ? 'activated' : 'deactivated'} successfully.`));
});

// @desc    Update an existing examination
// @route   PUT /api/v1/exams/:id
// @access  Private (super_admin, exam_officer)
export const updateExam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    code, 
    subject, 
    course, 
    durationMinutes, 
    allowedAttempts, 
    units, 
    randomizeOrder, 
    shuffleOptions, 
    showResult, 
    instructions,
    questionIds 
  } = req.body;

  const existingExam = await prisma.exam.findUnique({
    where: { id }
  });

  if (!existingExam) {
    throw new ApiError(404, "Examination not found.");
  }

  // If questionIds is provided, verify questions exist and calculate totalMarks
  let totalMarks = existingExam.totalMarks;
  if (questionIds) {
    if (questionIds.length === 0) {
      throw new ApiError(400, "At least one question is required for the examination.");
    }
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } }
    });
    if (questions.length === 0) {
      throw new ApiError(400, "None of the selected questions exist.");
    }
    totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }

  // Store units as comma-separated string if passed as array
  let formattedUnits;
  if (units !== undefined) {
    formattedUnits = Array.isArray(units) ? units.join(", ") : (units || "All Units");
  }

  const updatedExam = await prisma.$transaction(async (tx) => {
    // Update basic exam details
    const updated = await tx.exam.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingExam.title,
        code: code !== undefined ? code.trim() : existingExam.code,
        subject: subject !== undefined ? subject : existingExam.subject,
        course: course !== undefined ? course : existingExam.course,
        durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes) : existingExam.durationMinutes,
        allowedAttempts: allowedAttempts !== undefined ? parseInt(allowedAttempts) : existingExam.allowedAttempts,
        units: formattedUnits !== undefined ? formattedUnits : existingExam.units,
        randomizeOrder: randomizeOrder !== undefined ? randomizeOrder : existingExam.randomizeOrder,
        shuffleOptions: shuffleOptions !== undefined ? shuffleOptions : existingExam.shuffleOptions,
        showResult: showResult !== undefined ? showResult : existingExam.showResult,
        instructions: instructions !== undefined ? instructions : existingExam.instructions,
        totalMarks
      }
    });

    if (questionIds) {
      // Clear old ExamQuestion junction records
      await tx.examQuestion.deleteMany({
        where: { examId: id }
      });

      // Create new ExamQuestion junction records
      const examQuestionsData = questionIds.map((qId, idx) => ({
        examId: id,
        questionId: qId,
        order: idx + 1
      }));

      await tx.examQuestion.createMany({
        data: examQuestionsData
      });
    }

    return updated;
  });

  res.status(200).json(new ApiResponse(200, { exam: updatedExam }, "Examination updated successfully"));
});

