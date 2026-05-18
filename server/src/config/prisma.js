import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/index.js";

// Local SQLite file path for offline usage
const sqliteFilePath = "./data/exam_portal.db";
const connectionUrl = `file:${sqliteFilePath}`;

// Create better-sqlite3 instance
const sqlite = new Database(sqliteFilePath);

// In Prisma 7, the adapter takes a config object with the URL
const adapter = new PrismaBetterSqlite3({ url: connectionUrl });

let prisma;

if (process.env.NODE_ENV === "production") {
  // Production: create new instance
  prisma = new PrismaClient({ adapter });
} else {
  // Development: reuse instance to prevent too many connections
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      adapter,
      log: ["query", "error", "warn"], // Log queries in development
    });
  }
  prisma = global.prisma;
}

// shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export { prisma };
