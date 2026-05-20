import { prisma } from "../config/prisma.js";

async function check() {
  try {
    const counts = await prisma.question.groupBy({
      by: ['type'],
      _count: { _all: true }
    });
    console.log("Counts by type:", counts);

    const total = await prisma.question.count();
    console.log("Total questions in DB:", total);

    const allQ = await prisma.question.findMany({
      select: { type: true, marks: true }
    });
    console.log("Sample types/marks:", allQ.slice(0, 10));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
