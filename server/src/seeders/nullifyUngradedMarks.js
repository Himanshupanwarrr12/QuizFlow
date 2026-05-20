import { prisma } from "../config/prisma.js";

async function run() {
  try {
    // Nullify ungraded practical/viva marks in existing database records
    const result = await prisma.attempt.updateMany({
      where: {
        status: "submitted",
        practicalMarks: 0,
        vivaMarks: 0
      },
      data: {
        practicalMarks: null,
        vivaMarks: null
      }
    });
    console.log(`Successfully updated ${result.count} ungraded attempts to null!`);
  } catch (err) {
    console.error("Error nullifying ungraded marks:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
