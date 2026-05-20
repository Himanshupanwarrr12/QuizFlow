import { prisma } from "../config/prisma.js";

async function updateMarks() {
  try {
    const result = await prisma.question.updateMany({
      data: { marks: 1 }
    });
    console.log(`Successfully updated ${result.count} questions to be worth exactly 1 mark!`);

    // Double check the result
    const samples = await prisma.question.findMany({
      select: { type: true, marks: true },
      take: 10
    });
    console.log("Verified sample question marks:", samples);
  } catch (err) {
    console.error("Error updating question marks:", err);
  } finally {
    await prisma.$disconnect();
  }
}

updateMarks();
