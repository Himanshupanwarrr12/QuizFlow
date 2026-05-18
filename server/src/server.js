import app from "./app.js";
import { prisma } from "./config/prisma.js";
import env from "./config/env.js";

const startServer = async () => {
  // Test Prisma connection (optional, as Prisma connects lazily)
  await prisma.$connect();
  console.log(`✅  Prisma SQLite connected!`);

  // Start Express
  app.listen(env.PORT, () => {
    console.log(`🚀  Server running on http://localhost:${env.PORT}`);
    console.log(`📋  API base : http://localhost:${env.PORT}/api/v1`);
    console.log(`🔧  Env      : ${env.NODE_ENV}`);
  });
};

startServer();
