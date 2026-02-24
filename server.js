require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const OpenAI = require("openai");
const fs = require("fs");

const app = express();

/* ---------------- BASIC SETUP ---------------- */

app.use(express.json());
app.use(cors());

// เสิร์ฟไฟล์ static html
app.use(express.static(__dirname));

// สร้าง uploads folder ถ้ายังไม่มี
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// เสิร์ฟไฟล์รูป
app.use("/uploads", express.static(uploadDir));

/* ---------------- DATABASE ---------------- */

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing in .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("✅ Connected to Supabase PostgreSQL"))
  .catch((err) => console.error("❌ Database connection failed", err));

/* ---------------- OPENAI ---------------- */

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY missing in .env");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ---------------- MULTER CONFIG ---------------- */

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only JPG and PNG allowed"));
    } else {
      cb(null, true);
    }
  },
});

/* ---------------- AUTH ---------------- */

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).send("Email and password required");

  try {
    const check = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (check.rows.length > 0)
      return res.status(400).send("Email already exists");

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)",
      [email, hashed]
    );

    res.send("Registered successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Registration error");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).send("User not found");

    const valid = await bcrypt.compare(
      password,
      result.rows[0].password
    );

    if (!valid)
      return res.status(401).send("Wrong password");

    res.json({
      message: "Login success",
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});

/* ---------------- UPLOAD ROOM ---------------- */

app.post("/upload-room", (req, res) => {
  upload.single("roomImage")(req, res, function (err) {

    if (err) {
      console.error("Upload error:", err.message);
      return res.status(400).send(err.message);
    }

    if (!req.file)
      return res.status(400).send("No file uploaded");

    res.json({
      imageUrl: `/uploads/${req.file.filename}`,
    });
  });
});

/* ---------------- GENERATE TILE ---------------- */

app.post("/generate-tile", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt)
      return res.status(400).send("Prompt is required");

    const fullPrompt = `
    Seamless ceramic tile texture,
    ${prompt},
    tileable pattern, top view,
    4K resolution, photorealistic
    `;

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      size: "1024x1024",
    });

    const imageBase64 = result.data[0].b64_json;

    const fileName = uuidv4() + ".png";
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

    res.json({
      tileUrl: `/uploads/${fileName}`,
    });

  } catch (err) {
    console.error("AI error:", err);
    res.status(500).send("AI generation failed");
  }
});

/* ---------------- START SERVER ---------------- */

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});