const express = require("express");
const bcrypt=require("bcrypt")
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const gsecRoutes = require("./routes/gsecRoutes");
const assistantRegistrarRoutes = require("./routes/assistantRegistrarRoutes");
const guardRoutes = require("./routes/guardRoutes");
const facultyMentorRoutes = require("./routes/facultyMentorRoutes");
const systemAdministratorRoutes = require("./routes/systemAdministratorRoutes");
const verifyToken = require("./middlewares/verifyToken");
const { connectDB } = require("./config/database");
const expressSession = require("express-session");
var cors = require("cors");
const cron = require("node-cron");
const Booking = require("./models/Booking");
const {
  isProd,
  SESSION_SECRET,
  CLIENT_ORIGINS,
  CRON_SECRET,
  PORT,
} = require("./config/env");

// Needed on Vercel so "secure" cookies work behind the platform proxy.
app.set("trust proxy", 1);
//middlewares

app.use(
  cors({
    credentials: true,
    origin: CLIENT_ORIGINS,
  })
);

app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  expressSession({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, sameSite: "none" }, // Set to true if using HTTPS
  })
);

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

connectDB();
app.use("/auth", authRoutes);
app.use("/facultyMentor", facultyMentorRoutes);
app.use("/gsec", gsecRoutes);
app.use("/guard", guardRoutes);
app.use("/systemAdministrator", systemAdministratorRoutes);
app.use("/assistantRegistrar", assistantRegistrarRoutes);

app.get("/api/user", verifyToken, (req, res) => {
  const userData = req.user;
  res.status(200).json({ user: userData });
});
app.get("/deleteUnwanted", async (req, res) => {
  // Called daily by Vercel Cron (see vercel.json). With CRON_SECRET set, Vercel sends it as a Bearer token.
  // Without it, the route is only open in local development.
  const authorized = CRON_SECRET
    ? req.headers.authorization === `Bearer ${CRON_SECRET}`
    : !isProd;
  if (!authorized) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const currentDate = new Date().toISOString();
  console.log("inside schedular", new Date());
  try {
    const result = await Booking.deleteMany({ endDate: { $lt: currentDate } });
    console.log(`${result?.deletedCount} bookings deleted`);
    if (result.deletedCount === 0) {
      console.log("No bookings found to delete.");
      return res.status(200).json({ message: "No bookings found to delete." });
    }

    console.log(`${result.deletedCount} bookings deleted`);
    return res
      .status(200)
      .json({ message: `${result.deletedCount} bookings deleted` });
  } catch (err) {
    console.error("Error occurred while deleting bookings:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
// node-cron only works in a long-running process. On Vercel (serverless) the
// cleanup runs through the Vercel Cron entry in vercel.json instead.
if (!process.env.VERCEL) {
  cron.schedule("22 21 * * *", async () => {
    const currentDate = new Date().toISOString();
    console.log("inside schedular");
    try {
      const result = await Booking.deleteMany({ endDate: { $lt: currentDate } });
      console.log(`${result.deletedCount} bookings deleted`);
    } catch (err) {
      console.error("Error occurred while deleting bookings:", err);
    }
  });
}

// Vercel imports the exported app; locally we start the server ourselves.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`connected on port ${PORT}`);
  });
}

module.exports = app;



