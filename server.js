require("dotenv").config();
const express  = require("express");
const { Pool } = require("pg");
const bcrypt   = require("bcrypt");
const cors     = require("cors");
const path     = require("path");
const multer   = require("multer");
const OpenAI   = require("openai");
const fs       = require("fs");

const app = express();

/* ---------------- BASIC SETUP ---------------- */

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

/* ---------------- DATABASE ---------------- */

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch(err => console.error("DB Error:", err));

/* ---------------- OPENAI ---------------- */

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY missing");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------------- MULTER (memory storage) ---------------- */
// Vercel filesystem เป็น read-only ใช้ memoryStorage แทน

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

/* ---------------- AUTH ---------------- */

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).send("Missing fields");

    const check = await pool.query(
      "SELECT user_id FROM users WHERE email=$1",
      [email]
    );

    if (check.rows.length > 0)
      return res.status(400).send("Email exists");

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users(email,password) VALUES($1,$2)",
      [email, hashed]
    );

    res.send("Registered");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0)
      return res.status(400).send("User not found");

    const valid = await bcrypt.compare(password, result.rows[0].password);

    if (!valid)
      return res.status(401).send("Wrong password");

    res.json({
      user: {
        id:    result.rows[0].user_id,
        email: result.rows[0].email,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* ---------------- UPLOAD ROOM ---------------- */
// Vercel read-only — return base64 data URL แทน

app.post("/upload-room", upload.single("roomImage"), (req, res) => {
  if (!req.file)
    return res.status(400).send("No file");

  const base64 = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype;
  res.json({ imageUrl: `data:${mimeType};base64,${base64}` });
});

/* ---------------- GENERATE TILE ---------------- */
// บันทึกรูปเป็น base64 ลง DB แทนการเขียน disk

app.post("/generate-tile", async (req, res) => {
  try {
    let { prompt, userId, tileSize } = req.body;

    if (!prompt || !userId)
      return res.status(400).send("Missing data");

    userId = parseInt(userId);
    if (isNaN(userId))
      return res.status(400).send("Invalid userId");

    const fullPrompt = `
Seamless ceramic tile texture,
${prompt},
tileable pattern,
top view,
4K resolution,
photorealistic
`;

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      size:   "1024x1024",
    });

    const imageBase64 = result.data[0].b64_json;
    const tileUrl = `data:image/png;base64,${imageBase64}`;

    await pool.query(
      `INSERT INTO tiles (user_id, prompt, tile_url, tile_size)
       VALUES ($1, $2, $3, $4)`,
      [userId, prompt, tileUrl, tileSize || null]
    );

    res.json({ tileUrl });

  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).send("Generation failed");
  }
});

/* ---------------- GET USER TILES ---------------- */

app.get("/tiles/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId))
      return res.status(400).send("Invalid userId");

    const result = await pool.query(
      "SELECT id, prompt, tile_url, tile_size, created_at FROM tiles WHERE user_id=$1 ORDER BY created_at DESC",
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* ---------------- DELETE TILE ---------------- */

app.delete("/tile/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await pool.query(
      "SELECT id FROM tiles WHERE id=$1",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).send("Not found");

    await pool.query("DELETE FROM tiles WHERE id=$1", [id]);

    res.send("Deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/* ---------------- EXPORT (Vercel) ---------------- */

module.exports = app;

// local dev
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
}