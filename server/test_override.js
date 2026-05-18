import { prisma } from "./src/config/prisma.js";

async function testOverride() {
  const attempt = await prisma.attempt.findFirst();
  if (!attempt) {
    console.log("No attempts found");
    return;
  }
  
  console.log("Found Attempt ID:", attempt.id);
  console.log("Current Marks:", attempt.totalMarks);

  // Directly call the logic
  const parsedMarks = 5;
  const reason = "Direct override test";

  // Simulate controller logic
  const existingAttempt = await prisma.attempt.findUnique({
    where: { id: attempt.id },
    include: { exam: true }
  });

  if (parsedMarks > existingAttempt.exam.totalMarks) {
    console.log("Failed: exceeds marks");
    return;
  }

  const updated = await prisma.attempt.update({
    where: { id: attempt.id },
    data: { totalMarks: parsedMarks },
    include: { candidate: true, exam: true }
  });
  
  console.log("Updated Attempt Marks:", updated.totalMarks);
}

testOverride().then(() => prisma.$disconnect());
