import { prisma } from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

// @desc    Get all candidate results (with search and filtering)
// @route   GET /api/v1/results
// @access  Private (super_admin, exam_officer)
export const getResults = asyncHandler(async (req, res) => {
  // 1. Auto-seed mock data if there are no attempts in the database
  const attemptCount = await prisma.attempt.count();
  if (attemptCount === 0) {
    await seedMockAttempts();
  }

  // 2. Query attempts
  const { examId, unit, search } = req.query;

  const whereClause = {
    status: "submitted"
  };

  // Filter by exam
  if (examId) {
    whereClause.examId = examId;
  }

  // Filter by unit / search candidate details
  if (unit || search) {
    whereClause.candidate = {};
    if (unit) {
      whereClause.candidate.unit = unit;
    }
    if (search) {
      whereClause.candidate.OR = [
        { name: { contains: search } },
        { armyNumber: { contains: search } }
      ];
    }
  }

  const attempts = await prisma.attempt.findMany({
    where: whereClause,
    include: {
      candidate: {
        select: {
          id: true,
          armyNumber: true,
          rank: true,
          name: true,
          unit: true,
          trade: true
        }
      },
      exam: {
        select: {
          id: true,
          title: true,
          code: true,
          totalMarks: true,
          passingMarks: true
        }
      },
      responses: {
        include: {
          question: true
        }
      }
    },
    orderBy: { submitTime: "desc" }
  });

  const formattedResults = attempts.map(attempt => {
    const quizScore = attempt.totalMarks !== null && attempt.totalMarks !== undefined 
      ? attempt.totalMarks 
      : attempt.responses.reduce((sum, res) => sum + (res.marksAwarded || 0), 0);
    const quizMax = attempt.exam.totalMarks || 10; // Dynamically load online quiz maximum marks
    
    const practicalScore = attempt.practicalMarks ?? 0;
    const vivaScore = attempt.vivaMarks ?? 0;

    const totalScore = quizScore + practicalScore + vivaScore;
    const maxMarks = quizMax + 40; // Dynamic QuizMax + 20 Practical + 20 Viva
    const percentage = Math.round((totalScore / maxMarks) * 100);
    
    // Scale passing marks proportionally (exam passing score + 20) or fallback to 50%
    const passingScore = attempt.exam.passingMarks 
      ? (attempt.exam.passingMarks + 20)
      : Math.ceil(maxMarks * 0.5);
    const isPassed = totalScore >= passingScore;

    return {
      id: attempt.id,
      examId: attempt.exam.id,
      examTitle: attempt.exam.title,
      examCode: attempt.exam.code,
      candidateId: attempt.candidate.id,
      armyNumber: attempt.candidate.armyNumber,
      rankName: `${attempt.candidate.rank} ${attempt.candidate.name}`,
      unit: attempt.candidate.unit,
      trade: attempt.candidate.trade,
      startTime: attempt.startTime,
      submitTime: attempt.submitTime,
      durationMinutes: Math.round((new Date(attempt.submitTime) - new Date(attempt.startTime)) / 60000),
      quizScore,
      quizMax,
      practicalMarks: practicalScore,
      vivaMarks: vivaScore,
      subjectiveMarks: 0,
      score: totalScore,
      totalMarks: maxMarks,
      percentage,
      isPassed
    };
  });

  res.status(200).json(new ApiResponse(200, { results: formattedResults }, "Results retrieved successfully"));
});

// @desc    Get detailed candidate response sheet for an attempt
// @route   GET /api/v1/results/:id
// @access  Private (super_admin, exam_officer)
export const getResultDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      candidate: {
        select: {
          id: true,
          armyNumber: true,
          rank: true,
          name: true,
          unit: true,
          trade: true
        }
      },
      exam: true,
      responses: {
        include: {
          question: true
        }
      }
    }
  });

  if (!attempt) {
    throw new ApiError(404, "Evaluation attempt not found.");
  }

  res.status(200).json(new ApiResponse(200, { attempt }, "Detailed result retrieved successfully"));
});

// @desc    Override a candidate's evaluation marks (Audit Correction)
// @route   PATCH /api/v1/results/:attemptId/override-marks
// @access  Private (super_admin, exam_officer)
export const overrideMarks = asyncHandler(async (req, res) => {
  const { attemptId } = req.params;
  const { newMarks, practicalMarks, vivaMarks, subjectiveMarks, reason } = req.body;

  // 1. Find the attempt
  const existingAttempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: true }
  });

  if (!existingAttempt) {
    throw new ApiError(404, "Evaluation attempt not found.");
  }

  const updateData = {};

  // Online quiz score override
  if (newMarks !== undefined) {
    const parsedMarks = parseInt(newMarks);
    if (isNaN(parsedMarks) || parsedMarks < 0) {
      throw new ApiError(400, "Invalid online quiz marks value.");
    }
    if (parsedMarks > existingAttempt.exam.totalMarks) {
      throw new ApiError(400, `Override marks (${parsedMarks}) cannot exceed the exam's total maximum marks (${existingAttempt.exam.totalMarks}).`);
    }
    updateData.totalMarks = parsedMarks;
  }

  // Practical score entry
  if (practicalMarks !== undefined) {
    const parsedPractical = parseInt(practicalMarks);
    if (isNaN(parsedPractical) || parsedPractical < 0 || parsedPractical > 20) {
      throw new ApiError(400, "Practical marks must be between 0 and 20.");
    }
    updateData.practicalMarks = parsedPractical;
  }

  // Viva score entry
  if (vivaMarks !== undefined) {
    const parsedViva = parseInt(vivaMarks);
    if (isNaN(parsedViva) || parsedViva < 0 || parsedViva > 20) {
      throw new ApiError(400, "Viva marks must be between 0 and 20.");
    }
    updateData.vivaMarks = parsedViva;
  }

  // Subjective/Other score entry
  if (subjectiveMarks !== undefined) {
    const parsedSubjective = parseInt(subjectiveMarks);
    if (isNaN(parsedSubjective) || parsedSubjective < 0 || parsedSubjective > 20) {
      throw new ApiError(400, "Subjective marks must be between 0 and 20.");
    }
    updateData.subjectiveMarks = parsedSubjective;
  }

  // 2. Persist the updated scores in the database
  const updatedAttempt = await prisma.attempt.update({
    where: { id: attemptId },
    data: updateData,
    include: {
      candidate: true,
      exam: true
    }
  });

  res.status(200).json(
    new ApiResponse(200, {
      attempt: updatedAttempt
    }, `Candidate scores updated successfully. Reason: ${reason}`)
  );
});

// @desc    Initialize a manual placeholder evaluation attempt for a candidate
// @route   POST /api/v1/results/initialize-attempt
// @access  Private (super_admin, exam_officer)
export const initializeAttempt = asyncHandler(async (req, res) => {
  const { candidateId, examId } = req.body;

  if (!candidateId || !examId) {
    throw new ApiError(400, "Candidate ID and Exam ID are required.");
  }

  // Check if candidate already has an attempt for this exam
  const existing = await prisma.attempt.findFirst({
    where: { candidateId, examId }
  });

  if (existing) {
    return res.status(200).json(
      new ApiResponse(200, { attempt: existing }, "Attempt already exists.")
    );
  }

  // Create standard manual attempt record
  const attempt = await prisma.attempt.create({
    data: {
      examId,
      candidateId,
      startTime: new Date(),
      submitTime: new Date(),
      status: "submitted",
      totalMarks: 0,
      practicalMarks: null,
      vivaMarks: null,
      subjectiveMarks: 0
    },
    include: {
      candidate: true,
      exam: true
    }
  });

  res.status(201).json(
    new ApiResponse(201, { attempt }, "Evaluation sheet successfully initialized.")
  );
});

// Helper function to dynamically seed mock attempts if the database has none
async function seedMockAttempts() {
  console.log("Auto-seeding mock candidate results & evaluations...");

  // Clean out any outdated attempts of this default exam to enforce the new 5-question layout
  await prisma.response.deleteMany({});
  await prisma.attempt.deleteMany({});
  await prisma.examQuestion.deleteMany({});
  await prisma.exam.deleteMany({ where: { title: "COMBAT ENGINEERING BASICS - ASSESSMENT 1" } });

  // 1. Check/create default candidates
  const mockCandidatesData = [
    { armyNumber: "1554902M", rank: "Spr", name: "Amit Kumar", unit: "21 Engr Regt", trade: "Field Engineer", password: "Password@123", role: "candidate" },
    { armyNumber: "1662981K", rank: "L/Nk", name: "Rajesh Singh", unit: "22 Engr Regt", trade: "Bridge Builder", password: "Password@123", role: "candidate" },
    { armyNumber: "9874521P", rank: "Nk", name: "Vikram Sharma", unit: "A Coy", trade: "Mine Layer", password: "Password@123", role: "candidate" },
    { armyNumber: "1449830A", rank: "Hav", name: "Sunita Rao", unit: "B Coy", trade: "Surveyor", password: "Password@123", role: "candidate" },
    { armyNumber: "1559811W", rank: "Spr", name: "Gurpreet Singh", unit: "21 Engr Regt", trade: "Engine Driver", password: "Password@123", role: "candidate" }
  ];

  const candidates = [];
  for (const c of mockCandidatesData) {
    let user = await prisma.user.findUnique({ where: { armyNumber: c.armyNumber } });
    if (!user) {
      user = await prisma.user.create({ data: c });
    }
    candidates.push(user);
  }

  // 2. Check/create questions (5 questions, strictly 1 mark each!)
  const mockQuestionsData = [
    { type: "mcq", text: "What is the primary role of a Combat Engineer?", optionA: "Bridging", optionB: "Breaching", optionC: "Mine Warfare", optionD: "All of the above", correctOptions: "D", category: "Must Know", subject: "Combat Engineering", topic: "Fundamentals", difficulty: "Easy", bloom: "Knowledge", marks: 1, explanation: "Combat engineers perform all tasks including bridging, breaching, and mine warfare." },
    { type: "truefalse", text: "TNT is commonly used as a military demolition explosive.", optionA: "True", optionB: "False", optionC: null, optionD: null, correctOptions: "A", category: "Must Know", subject: "Combat Engineering", topic: "Explosives", difficulty: "Medium", bloom: "Knowledge", marks: 1, explanation: "TNT is the standard measure and most commonly used military explosive." },
    { type: "mcq", text: "Which piece of equipment is primarily used for rapid river crossing?", optionA: "AM-50 Bridge", optionB: "Krupp Man Bridge", optionC: "Pontoon Bridge", optionD: "Assault Boats", correctOptions: "C", category: "Could Know", subject: "Combat Engineering", topic: "Bridging", difficulty: "Hard", bloom: "Comprehension", marks: 1, explanation: "Pontoon bridges are constructed across large rivers for major vehicular movements." },
    { type: "fillblank", text: "The minimum safe frontal distance for a Claymore mine is _____ meters.", optionA: null, optionB: null, optionC: null, optionD: null, correctOptions: "100", category: "Must Know", subject: "Combat Engineering", topic: "Mine Warfare", difficulty: "Hard", bloom: "Application", marks: 1, explanation: "The safe frontal distance for friendly troops without overhead cover is 100 meters." },
    { type: "mcq", text: "What is the standard military fragmentation hand grenade used for defensive operations?", optionA: "M67", optionB: "M18", optionC: "M26", optionD: "F1", correctOptions: "A", category: "Must Know", subject: "Combat Engineering", topic: "Explosives", difficulty: "Easy", bloom: "Knowledge", marks: 1, explanation: "The M67 fragmentation hand grenade is the standard defensive grenade." }
  ];

  const questions = [];
  for (const q of mockQuestionsData) {
    let dbQ = await prisma.question.findFirst({ where: { text: q.text } });
    if (!dbQ) {
      dbQ = await prisma.question.create({ data: q });
    } else {
      dbQ = await prisma.question.update({
        where: { id: dbQ.id },
        data: { marks: 1 }
      });
    }
    questions.push(dbQ);
  }

  // 3. Check/create default Exam
  let exam = await prisma.exam.create({
    data: {
      title: "COMBAT ENGINEERING BASICS - ASSESSMENT 1",
      code: "CEB-2026-01",
      subject: "Combat Engineering",
      course: "Basic Combat Engineering",
      durationMinutes: 20,
      allowedAttempts: 1,
      units: "21 Engr Regt, 22 Engr Regt, A Coy, B Coy",
      randomizeOrder: true,
      shuffleOptions: false,
      showResult: true,
      instructions: "1. Complete all questions.\n2. Submit before time limit.",
      totalMarks: 5,
      passingMarks: 3,
      isActive: true,
      createdBy: "Maj S. Gupta"
    }
  });

  // Link exam questions
  await prisma.examQuestion.createMany({
    data: questions.map((q, idx) => ({
      examId: exam.id,
      questionId: q.id,
      order: idx + 1
    }))
  });

  // 4. Create attempts and responses for candidates
  const scores = [
    { candidateIdx: 0, answers: ["D", "A", "C", "100", "A"], durationOffset: 12, practicalMarks: 18, vivaMarks: 17, subjectiveMarks: 16 }, // Amit Kumar
    { candidateIdx: 1, answers: ["D", "A", "A", "100", "A"], durationOffset: 15, practicalMarks: 19, vivaMarks: 18, subjectiveMarks: 17 }, // Rajesh Singh
    { candidateIdx: 2, answers: ["D", "B", "C", "50", "A"],  durationOffset: 8,  practicalMarks: 15, vivaMarks: 14, subjectiveMarks: 13 }, // Vikram Sharma
    { candidateIdx: 3, answers: ["D", "A", "C", "100", "A"], durationOffset: 10, practicalMarks: 20, vivaMarks: 19, subjectiveMarks: 18 }, // Sunita Rao
    { candidateIdx: 4, answers: ["B", "B", "C", "10", "B"],  durationOffset: 18, practicalMarks: 10, vivaMarks: 8,  subjectiveMarks: 9  }  // Gurpreet Singh
  ];

  for (const score of scores) {
    const candidate = candidates[score.candidateIdx];
    const startTime = new Date(Date.now() - 1000 * 60 * 60 * 2); // 2 hours ago
    const submitTime = new Date(startTime.getTime() + 1000 * 60 * score.durationOffset);

    // Create the attempt
    const attempt = await prisma.attempt.create({
      data: {
        examId: exam.id,
        candidateId: candidate.id,
        startTime,
        submitTime,
        status: "submitted",
        practicalMarks: score.practicalMarks,
        vivaMarks: score.vivaMarks,
        subjectiveMarks: score.subjectiveMarks
      }
    });

    // Create responses
    let totalAwarded = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const selected = score.answers[i];
      
      const isCorrect = q.correctOptions.toLowerCase().trim() === selected.toLowerCase().trim();
      const marksAwarded = isCorrect ? q.marks : 0;
      totalAwarded += marksAwarded;

      await prisma.response.create({
        data: {
          attemptId: attempt.id,
          questionId: q.id,
          selectedOption: selected,
          marksAwarded
        }
      });
    }

    // Update attempt with final totalMarks awarded
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { totalMarks: totalAwarded }
    });
  }

  console.log("Mock attempts seeded successfully!");
}
