import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";

const seedSuperAdmin = async () => {
  try {
    // 1. Seed Super Admin
    const armyNumber = process.env.SUPER_ADMIN_ARMY_NUMBER || "IC-12345A";
    const rank = process.env.SUPER_ADMIN_RANK || "Brigadier";
    const name = process.env.SUPER_ADMIN_NAME || "R.K. Sharma";
    const unit = process.env.SUPER_ADMIN_UNIT || "HQ BEG";
    const trade = process.env.SUPER_ADMIN_TRADE || "Master Admin";
    const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe@123";

    if (!armyNumber || !password) {
      console.error("❌  Missing SUPER_ADMIN_ARMY_NUMBER or SUPER_ADMIN_PASSWORD in .env");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
      where: { armyNumber: armyNumber.toUpperCase() },
      update: {
        rank,
        name,
        unit,
        trade,
        password: hashedPassword,
        role: "super_admin",
        isActive: true
      },
      create: {
        armyNumber: armyNumber.toUpperCase(),
        rank,
        name,
        unit,
        trade,
        password: hashedPassword,
        role: "super_admin",
        isActive: true
      }
    });

    // Also delete standard outdated SA0000001 admin if it exists
    if (armyNumber.toUpperCase() !== "SA0000001") {
      await prisma.user.deleteMany({
        where: { armyNumber: "SA0000001" }
      });
    }

    console.log("✅  Super Admin upserted successfully:");
    console.log(`   Army Number : ${admin.armyNumber}`);
    console.log(`   Name        : ${admin.name}`);
    console.log(`   Role        : ${admin.role}`);
    console.log("");

    // 2. Seed default Exam Officer for testing
    const existingOfficer = await prisma.user.findFirst({
      where: { role: "exam_officer", armyNumber: "EO0000001" },
    });

    if (existingOfficer) {
      console.log(`⚠️  Exam Officer already exists: ${existingOfficer.armyNumber} (${existingOfficer.name})`);
    } else {
      const officerHashedPassword = await bcrypt.hash("ChangeMe@123", 10);
      const officer = await prisma.user.create({
        data: {
          armyNumber: "EO0000001",
          rank: "Captain",
          name: "Exam Officer Test",
          unit: "BEG",
          trade: "Instructor",
          password: officerHashedPassword,
          role: "exam_officer",
        },
      });

      console.log("✅  Default Exam Officer seeded successfully:");
      console.log(`   Army Number : ${officer.armyNumber}`);
      console.log(`   Name        : ${officer.name}`);
      console.log(`   Role        : ${officer.role}`);
      console.log("");
    }

    // 3. Seed default Candidate 1 for testing (Spr Himanshu)
    const existingCandidate1 = await prisma.user.findFirst({
      where: { role: "candidate", armyNumber: "CAND0001" },
    });

    if (existingCandidate1) {
      console.log(`⚠️  Candidate 1 already exists: ${existingCandidate1.armyNumber} (${existingCandidate1.name})`);
    } else {
      const candidateHashedPassword = await bcrypt.hash("Password@123", 10);
      const candidate = await prisma.user.create({
        data: {
          armyNumber: "CAND0001",
          rank: "Spr",
          name: "Himanshu",
          unit: "21 Engr Regt",
          trade: "Engine Driver",
          password: candidateHashedPassword,
          role: "candidate",
        },
      });

      console.log("✅  Default Candidate 1 seeded successfully:");
      console.log(`   Army Number : ${candidate.armyNumber}`);
      console.log(`   Name        : ${candidate.name}`);
      console.log(`   Role        : ${candidate.role}`);
      console.log("");
    }

    // 4. Seed default Candidate 2 for testing (Spr Amit)
    const existingCandidate2 = await prisma.user.findFirst({
      where: { role: "candidate", armyNumber: "CAND0002" },
    });

    if (existingCandidate2) {
      console.log(`⚠️  Candidate 2 already exists: ${existingCandidate2.armyNumber} (${existingCandidate2.name})`);
    } else {
      const candidateHashedPassword = await bcrypt.hash("Password@123", 10);
      const candidate = await prisma.user.create({
        data: {
          armyNumber: "CAND0002",
          rank: "Spr",
          name: "Amit Kumar",
          unit: "21 Engr Regt",
          trade: "Field Engineer",
          password: candidateHashedPassword,
          role: "candidate",
        },
      });

      console.log("✅  Default Candidate 2 seeded successfully:");
      console.log(`   Army Number : ${candidate.armyNumber}`);
      console.log(`   Name        : ${candidate.name}`);
      console.log(`   Role        : ${candidate.role}`);
      console.log("");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌  Seeder failed:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedSuperAdmin();
