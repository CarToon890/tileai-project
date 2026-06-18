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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
    
    // Vercel deployment: Save directly as base64 data URL to avoid read-only filesystem errors
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

/* ---------------- LAYOUT OPTIMIZATION ---------------- */

app.post("/api/optimize-layout", (req, res) => {
  try {
    const { roomW, roomL, tileW, tileL, grout = 0.2, origin = "center", obstacles = [] } = req.body;
    
    if (!roomW || !roomL || !tileW || !tileL) {
      return res.status(400).send("Missing required dimensions");
    }

    const tW = tileW + grout;
    const tL = tileL + grout;
    
    let startX = 0;
    let startY = 0;
    
    if (origin === "center") {
      // Place center of a tile at center of the room
      const centerX = roomW / 2;
      const centerY = roomL / 2;
      // Find the furthest negative coordinate we need to start from
      const numLeft = Math.ceil((centerX + tileW/2) / tW);
      const numBottom = Math.ceil((centerY + tileL/2) / tL);
      startX = centerX - tileW/2 - (numLeft * tW);
      startY = centerY - tileL/2 - (numBottom * tL);
    }
    
    const layout = [];
    let totalUsed = 0;
    let fullCount = 0;
    let cutCount = 0;
    const scrapInventory = [];
    
    // Total area of the room minus obstacles
    let roomArea = roomW * roomL;
    for (const obs of obstacles) {
      roomArea -= (obs.w * obs.h);
    }
    
    // Helper for boolean subtraction
    function subtractObstacles(rect, obsList) {
      let pieces = [rect];
      for (const obs of obsList) {
        let newPieces = [];
        for (const p of pieces) {
          const pR = p.x + p.w;
          const pB = p.y + p.h;
          const oR = obs.x + obs.w;
          const oB = obs.y + obs.h;
          
          const ix1 = Math.max(p.x, obs.x);
          const iy1 = Math.max(p.y, obs.y);
          const ix2 = Math.min(pR, oR);
          const iy2 = Math.min(pB, oB);
          
          if (ix1 >= ix2 || iy1 >= iy2) {
            newPieces.push(p);
            continue;
          }
          
          if (p.y < iy1) newPieces.push({x: p.x, y: p.y, w: p.w, h: iy1 - p.y});
          if (pB > iy2)  newPieces.push({x: p.x, y: iy2, w: p.w, h: pB - iy2});
          if (p.x < ix1) newPieces.push({x: p.x, y: iy1, w: ix1 - p.x, h: iy2 - iy1});
          if (pR > ix2)  newPieces.push({x: ix2, y: iy1, w: pR - ix2, h: iy2 - iy1});
        }
        pieces = newPieces.filter(p => p.w > 0 && p.h > 0);
      }
      return pieces;
    }

    // Helper for allocating from scrap
    function allocatePiece(w, h) {
      let bestIdx = -1;
      let minWaste = Infinity;
      for (let i = 0; i < scrapInventory.length; i++) {
        let s = scrapInventory[i];
        if (s.w >= w && s.h >= h) {
          let waste = (s.w * s.h) - (w * h);
          if (waste < minWaste) { minWaste = waste; bestIdx = i; }
        } else if (s.w >= h && s.h >= w) {
          let waste = (s.w * s.h) - (w * h);
          if (waste < minWaste) { minWaste = waste; bestIdx = i; }
        }
      }
      
      let scrap;
      let usedNew = false;
      if (bestIdx !== -1) {
        scrap = scrapInventory.splice(bestIdx, 1)[0];
      } else {
        scrap = {w: tileW, h: tileL};
        usedNew = true;
      }
      
      let fitW = w, fitH = h;
      if (scrap.w >= h && scrap.h >= w && (scrap.w < w || scrap.h < h)) {
        fitW = h; fitH = w;
      } else if (scrap.w >= w && scrap.h >= h) {
        fitW = w; fitH = h;
      } else {
        fitW = w; fitH = h;
      }

      let scrap1, scrap2;
      if (scrap.w - fitW > scrap.h - fitH) {
        scrap1 = {w: scrap.w - fitW, h: scrap.h};
        scrap2 = {w: fitW, h: scrap.h - fitH};
      } else {
        scrap1 = {w: scrap.w, h: scrap.h - fitH};
        scrap2 = {w: scrap.w - fitW, h: fitH};
      }
      
      if (scrap1.w >= 5 && scrap1.h >= 5) scrapInventory.push(scrap1);
      if (scrap2.w >= 5 && scrap2.h >= 5) scrapInventory.push(scrap2);
      
      return usedNew;
    }

    for (let x = startX; x < roomW; x += tW) {
      for (let y = startY; y < roomL; y += tL) {
        const tx1 = x;
        const ty1 = y;
        const tx2 = x + tileW;
        const ty2 = y + tileL;
        
        const ix1 = Math.max(0, tx1);
        const iy1 = Math.max(0, ty1);
        const ix2 = Math.min(roomW, tx2);
        const iy2 = Math.min(roomL, ty2);
        
        if (ix1 < ix2 && iy1 < iy2) {
          let baseRect = { x: ix1, y: iy1, w: ix2 - ix1, h: iy2 - iy1 };
          let remainingPieces = subtractObstacles(baseRect, obstacles);
          
            // It is full only if it matches exactly tile size and has no missing chunks
            // Use a small tolerance for floating point inaccuracies
            let isFull = (
              remainingPieces.length === 1 && 
              Math.abs(remainingPieces[0].w - tileW) < 0.001 && 
              Math.abs(remainingPieces[0].h - tileL) < 0.001
            );
            
            if (isFull) {
              totalUsed++;
              fullCount++;
              layout.push({
                x: remainingPieces[0].x,
                y: remainingPieces[0].y,
                w: remainingPieces[0].w,
                h: remainingPieces[0].h,
                originalX: tx1,
                originalY: ty1,
                type: "full"
              });
            } else {
              for (const p of remainingPieces) {
                if (p.w >= 1 && p.h >= 1) { // Ignore slivers < 1cm
                  let usedNew = allocatePiece(p.w, p.h);
                  if (usedNew) totalUsed++;
                  cutCount++;
                  layout.push({
                    x: p.x,
                    y: p.y,
                    w: p.w,
                    h: p.h,
                    originalX: tx1,
                    originalY: ty1,
                    type: "cut"
                  });
                }
              }
            }
        }
      }
    }

    
    const tileArea = (tileW * tileL) * totalUsed;
    const wasteArea = Math.max(0, tileArea - roomArea);
    const wastePercent = totalUsed > 0 ? (wasteArea / tileArea) * 100 : 0;
    
    res.json({
      layout,
      summary: {
        fullTiles: fullCount,
        cutTiles: cutCount,
        totalUsed: totalUsed,
        wastePercent: wastePercent.toFixed(1)
      }
    });

  } catch (err) {
    console.error("Optimize layout error:", err);
    res.status(500).send("Optimization failed");
  }
});

/* ---------------- EXPORT (Vercel) ---------------- */

module.exports = app;

// local dev
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log("🚀 Server running on port " + PORT));
}