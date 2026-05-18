import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // For SQLite, the 'url' is just the local file path prefix
    url: "file:./data/exam_portal.db",
  },
});
