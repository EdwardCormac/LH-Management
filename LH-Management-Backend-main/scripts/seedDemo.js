/**
 * Seeds a demo General Secretary account plus sample lecture-hall bookings.
 *
 *   npm run seed:demo
 *
 * Safe to re-run: it resets the demo user's password and replaces only the
 * bookings made by the demo user. Nothing else in the database is touched.
 * Point MONGODB_URL at a dedicated demo database, not one holding real data.
 *
 * Only the low-privilege "gsec" role is created. No system administrator.
 */
const path = require("path");

// Optional: `npm run seed:demo -- --env=.env.live` seeds the database named in that file instead of .env.
const envArg = process.argv.slice(2).find((a) => a.startsWith("--env="));
const envFile = envArg
  ? path.resolve(process.cwd(), envArg.slice("--env=".length))
  : path.join(__dirname, "..", ".env");
if (require("dotenv").config({ path: envFile }).error) {
  console.error(`Could not read env file: ${envFile}`);
  process.exit(1);
}

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Gsec = require("../models/gsec");
const Booking = require("../models/Booking");

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo.gsec@example.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "LHDemo@2026";
const FACULTY_EMAIL = "faculty@lnmiit.ac.in"; // same value the booking form uses

// Builds a Date `daysFromNow` days ahead at "HH:MM".
const at = (daysFromNow, hhmm) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

const sample = (o) => ({
  bookedBy: DEMO_EMAIL,
  facultyMentorEmail: FACULTY_EMAIL,
  facultyStatus: "pending",
  assistantRegistrarStatus: "pending",
  systemAdministratorStatus: "pending",
  ...o,
});

// A spread of states so every tab of the GSec dashboard has content.
const bookings = () => [
  sample({
    ltNumber: 1, clubName: "Aaveg", reason: "Street play rehearsal",
    startDate: at(3, "18:00"), endDate: at(3, "20:00"), startTime: "18:00", endTime: "20:00",
    avSupport: "no",
    facultyStatus: "approved", assistantRegistrarStatus: "approved",
  }),
  sample({
    ltNumber: 19, clubName: "Cipher", reason: "Intro to CTF workshop",
    startDate: at(5, "17:00"), endDate: at(5, "19:30"), startTime: "17:00", endTime: "19:30",
    avSupport: "yes",
    facultyStatus: "approved", assistantRegistrarStatus: "approved", systemAdministratorStatus: "approved",
  }),
  sample({
    ltNumber: 2, clubName: "Quizzinga", reason: "Inter-hostel quiz finals",
    startDate: at(8, "18:30"), endDate: at(8, "21:00"), startTime: "18:30", endTime: "21:00",
    avSupport: "yes",
  }),
  sample({
    ltNumber: 1, clubName: "Cybros", reason: "Hackathon kickoff",
    startDate: at(10, "16:00"), endDate: at(10, "18:00"), startTime: "16:00", endTime: "18:00",
    avSupport: "no",
    facultyStatus: "approved",
  }),
  sample({
    ltNumber: 2, clubName: "Astronomy Club", reason: "Night sky observation briefing",
    startDate: at(4, "19:00"), endDate: at(4, "20:30"), startTime: "19:00", endTime: "20:30",
    avSupport: "no",
    facultyStatus: "approved", assistantRegistrarStatus: "rejected",
  }),
];

async function main() {
  if (!process.env.MONGODB_URL) {
    console.error("MONGODB_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected to", mongoose.connection.name);

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (user) {
    user.password = hashed;
    user.role = "gsec";
    user.name = "Demo General Secretary";
    await user.save();
  } else {
    user = await User.create({
      name: "Demo General Secretary",
      email: DEMO_EMAIL,
      password: hashed,
      role: "gsec",
    });
  }

  await Gsec.findOneAndUpdate(
    { gsecId: user._id },
    { gsecId: user._id, rollNumber: "DEMO001", councilName: "Cultural Council" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const removed = await Booking.deleteMany({ bookedBy: DEMO_EMAIL });
  const created = await Booking.insertMany(bookings());

  console.log(`Demo user ready: ${DEMO_EMAIL} (role: gsec)`);
  console.log(`Replaced ${removed.deletedCount} old demo bookings with ${created.length} new ones.`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seeding failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
