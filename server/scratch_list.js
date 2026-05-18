import { prisma } from "./src/config/prisma.js";

async function main() {
  const users = await prisma.user.findMany();
  console.log(JSON.stringify(users.map(u => ({ id: u.id, armyNumber: u.armyNumber, name: u.name, role: u.role })), null, 2));
}

main().catch(console.error);
