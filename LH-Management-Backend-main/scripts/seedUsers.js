/**
 * Creates or updates login accounts (and their role profile documents) from a JSON file.
 *
 *   npm run seed:users                                   # uses .env and scripts/users.seed.json
 *   npm run seed:users -- --env=.env.live                # target a different database
 *   npm run seed:users -- my-users.json --env=.env.live  # custom users file
 *
 * The users file is a JSON array, for example:
 *   [{ "email": "guard@lnmiit.ac.in", "password": "...", "role": "guard" }]
 * Optional per-role fields: name, rollNumber and councilName (gsec), clubName (facultyMentor).
 *
 * Keep the real users file out of git (scripts/users.seed.json is gitignored).
 * Safe to re-run: existing users get their password and role reset, nothing else is touched.
 */
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith("--env="));
const fileArg = args.find((a) => !a.startsWith("--"));

const envFile = envArg
  ? path.resolve(process.cwd(), envArg.slice("--env=".length))
  : path.join(__dirname, "..", ".env");
const usersFile = fileArg
  ? path.resolve(process.cwd(), fileArg)
  : path.join(__dirname, "users.seed.json");

const loaded = require("dotenv").config({ path: envFile });
if (loaded.error) {
  console.error(`Could not read env file: ${envFile}`);
  process.exit(1);
}

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");

const FACULTY_EMAIL = "faculty@lnmiit.ac.in"; // the booking form routes requests to this address

const ROLES = {
  gsec: {
    label: "General Secretary",
    model: require("../models/gsec"),
    idField: "gsecId",
    extra: (u) => ({ rollNumber: u.rollNumber || "N/A", councilName: u.councilName || "N/A" }),
  },
  facultyMentor: {
    label: "Faculty Mentor",
    model: require("../models/faculty"),
    idField: "facultyMentorId",
    extra: (u) => ({ clubName: u.clubName || "N/A" }),
  },
  assistantRegistrar: {
    label: "Assistant Registrar",
    model: require("../models/assistantRegistrar"),
    idField: "assistantRegistrarId",
    extra: () => ({}),
  },
  guard: {
    label: "Guard",
    model: require("../models/guard"),
    idField: "guardId",
    extra: () => ({}),
  },
  systemAdministrator: {
    label: "System Administrator",
    model: require("../models/systemAdministrator"),
    idField: "systemAdministratorId",
    extra: () => ({}),
  },
};

function loadAndValidate() {
  if (!fs.existsSync(usersFile)) {
    console.error(`Users file not found: ${usersFile}`);
    console.error("Copy scripts/users.seed.example.json to scripts/users.seed.json and edit it.");
    process.exit(1);
  }

  let list;
  try {
    list = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  } catch (err) {
    console.error(`Users file is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(list) || list.length === 0) {
    console.error("Users file must be a non-empty JSON array.");
    process.exit(1);
  }

  const seen = new Set();
  const problems = [];
  const users = list.map((u, i) => {
    const where = `entry ${i + 1}`;
    const email = typeof u.email === "string" ? u.email.trim() : "";
    if (!email.includes("@")) problems.push(`${where}: missing or invalid "email"`);
    if (typeof u.password !== "string" || u.password.length === 0) problems.push(`${where}: missing "password"`);
    if (!ROLES[u.role]) problems.push(`${where}: "role" must be one of ${Object.keys(ROLES).join(", ")}`);
    if (email && seen.has(email)) problems.push(`${where}: duplicate email ${email}`);
    seen.add(email);
    return { ...u, email };
  });

  if (problems.length) {
    console.error("Fix these problems in the users file:\n - " + problems.join("\n - "));
    process.exit(1);
  }

  // Warnings only; they don't stop the run.
  for (const u of users) {
    if (u.role !== "guard" && u.password.length < 10) {
      console.warn(`Warning: ${u.email} (${u.role}) has a short password. Anyone can try logging in on a public site.`);
    }
    if (u.role === "facultyMentor" && u.email !== FACULTY_EMAIL) {
      console.warn(`Note: booking requests are addressed to ${FACULTY_EMAIL}, so ${u.email} will see no requests.`);
    }
  }
  return users;
}

async function main() {
  const users = loadAndValidate();

  if (!process.env.MONGODB_URL) {
    console.error(`MONGODB_URL is not set in ${envFile}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URL);
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Users file: ${usersFile}\n`);

  for (const u of users) {
    const spec = ROLES[u.role];
    const hashed = await bcrypt.hash(u.password, 10);
    const name = u.name || spec.label;

    let user = await User.findOne({ email: u.email });
    const existed = Boolean(user);
    if (user) {
      user.password = hashed;
      user.role = u.role;
      user.name = name;
      await user.save();
    } else {
      user = await User.create({ name, email: u.email, password: hashed, role: u.role });
    }

    await spec.model.findOneAndUpdate(
      { [spec.idField]: user._id },
      { [spec.idField]: user._id, ...spec.extra(u) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`${existed ? "updated" : "created"}  ${u.email}  (${u.role})`);
  }

  console.log(`\nDone: ${users.length} account(s) processed.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seeding failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
