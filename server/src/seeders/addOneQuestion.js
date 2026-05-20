import { prisma } from "../config/prisma.js";

async function addOneQuestion() {
  try {
    const existing = await prisma.question.findFirst({
      where: { text: "Is Node.js single-threaded by default?" }
    });

    if (existing) {
      console.log("Question already exists!");
    } else {
      const q = await prisma.question.create({
        data: {
          type: "truefalse",
          text: "Is Node.js single-threaded by default?",
          optionA: "True",
          optionB: "False",
          correctOptions: "A",
          category: "Technical",
          subject: "Programming",
          topic: "NodeJS",
          difficulty: "Easy",
          bloom: "Remembering",
          marks: 1,
          explanation: "Node.js runs Javascript code in a single thread, although under the hood it uses thread pools via libuv."
        }
      });
      console.log("Successfully added 1 more question to make it 40! ID:", q.id);
    }
  } catch (err) {
    console.error("Error adding question:", err);
  } finally {
    await prisma.$disconnect();
  }
}

addOneQuestion();
