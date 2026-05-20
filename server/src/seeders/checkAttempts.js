import { prisma } from "../config/prisma.js";

async function run() {
  try {
    const attempts = await prisma.attempt.findMany({
      include: {
        candidate: { select: { name: true, armyNumber: true } },
        exam: { select: { title: true } }
      }
    });

    console.log("All attempts in DB:");
    attempts.forEach(a => {
      console.log(`- ID: ${a.id}, Candidate: ${a.candidate.armyNumber} (${a.candidate.name}), Exam: ${a.exam.title}, Status: ${a.status}, Prac: ${a.practicalMarks}, Viva: ${a.vivaMarks}, TotalMarks: ${a.totalMarks}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
