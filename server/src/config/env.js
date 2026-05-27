import "dotenv/config";

const requiredVars = [
  "PORT",
  "CORS_ORIGIN",
  "ACCESS_TOKEN_SECRET",
  "ACCESS_TOKEN_EXPIRY",
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.error(`❌  Missing required env variable: ${key}`);
    process.exit(1);
  }
}

const cleanCorsOrigin = (origin) => {
  if (!origin) return "";
  return origin.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
};

const env = Object.freeze({
  PORT: Number(process.env.PORT) || 8000,
  CORS_ORIGIN: cleanCorsOrigin(process.env.CORS_ORIGIN),
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  NODE_ENV: process.env.NODE_ENV || "development",
});

export default env;
