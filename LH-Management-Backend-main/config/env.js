// Central place for environment-driven settings.
// Locally these come from .env (see .env.example); on Vercel from Project Settings -> Environment Variables.
require("dotenv").config();

const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProd) {
    throw new Error("JWT_SECRET must be set in production");
  }
  JWT_SECRET = "dev-only-secret-do-not-use-in-production";
  console.warn("JWT_SECRET not set - using an insecure development default.");
}

module.exports = {
  isProd,
  JWT_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET || JWT_SECRET,
  // Comma-separated list of allowed frontend origins (CORS).
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Public signup lets anyone pick any role (including systemAdministrator), so it is off unless enabled.
  ALLOW_SIGNUP: process.env.ALLOW_SIGNUP === "true",
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when this variable is set.
  CRON_SECRET: process.env.CRON_SECRET,
  PORT: process.env.PORT || 9000,
};
