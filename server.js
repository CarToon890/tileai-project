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
app.use(express.static(__dirname));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------------- MULTER ---------------- */

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG and PNG allowed"));
  },
});

/* ---------------- AUTH ---------------- */

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const check = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (check.rows.length > 0) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, hashed]);
    res.json({ message: "Registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) return res.status(401).json({ message: "Wrong password" });

    res.json({
      message: "Login success",
      user: { id: result.rows[0].id, email: result.rows[0].email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login error" });
  }
});

/* ---------------- UPLOAD ROOM ---------------- */

app.post("/upload-room", (req, res) => {
  upload.single("roomImage")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  });
});

/* ---------------- GENERATE TILE ---------------- */

app.post("/generate-tile", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const fullPrompt = `Seamless ceramic tile texture, ${prompt}, tileable pattern, top view, 4K resolution, photorealistic`;

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      size: "1024x1024",
    });

    const imageBase64 = result.data[0].b64_json;
    const fileName = uuidv4() + ".png";
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

    res.json({ tileUrl: `/uploads/${fileName}` });
  } catch (err) {
    console.error("AI image error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ---------------- AI CHAT (NEW) ---------------- */

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, system, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    /* keep last 20 messages to avoid token overflow */
    const recent = messages.slice(-20);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system || "คุณคือผู้เชี่ยวชาญด้านกระเบื้องและการออกแบบห้อง ตอบเป็นภาษาไทย" },
        ...recent,
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
    res.json({ reply });

  } catch (err) {
    console.error("Chat AI error:", err);
    res.status(500).json({ error: "Chat failed", reply: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
  }
});

/* ---------------- FACTORY CONFIG (preset palettes & prices) ---------------- */

app.get("/factory-config", (req, res) => {
  res.json({
    sizes: {
      "30x30": 70,
      "60x60": 120,
      "60x120": 220,
      "80x80": 180,
    },
    palettes: [
      { name: "Mono Series", colors: ["#fff", "#d9d9d9", "#bfbfbf"], multiplier: 1 },
      { name: "Luxury Marble", colors: ["#fff", "#f2f2f2", "#d4af37", "#444"], multiplier: 1.25 },
      { name: "Terracotta", colors: ["#c4623a", "#e8d5b0", "#8b7355"], multiplier: 1.1 },
      { name: "Nordic Stone", colors: ["#c4bdb5", "#8c7f74", "#2c2825"], multiplier: 1.0 },
    ],
  });
});

/* ---------------- START SERVER ---------------- */

app.listen(3000, () => {
  console.log("🚀 TileAI Server running on http://localhost:3000");
  console.log("📄 Pages: tile-form.html → room-view.html → chat.html");
});
