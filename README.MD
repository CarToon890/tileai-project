# ECOTile
AI-Powered Tile Design & Cost Estimation System

ECOTile คือระบบเว็บแอปพลิเคชันอัจฉริยะที่ออกแบบมาเพื่อช่วยผู้ใช้งานและผู้รับเหมาในประเทศไทย ในการออกแบบลวดลายกระเบื้องด้วยเทคโนโลยีปัญญาประดิษฐ์ (AI) พร้อมระบบแสดงผลจำลองภาพ 3 มิติ (3D Viewer) และฟังก์ชันคำนวณการปูกระเบื้อง (Layout Optimization) อย่างแม่นยำ

Live Demo: [tileai-project.vercel.app](https://tileai-project.vercel.app)

---

## 1. คุณสมบัติเด่น (Key Features)

- AI Tile Generation: สร้างลวดลายกระเบื้องใหม่ที่ไม่ซ้ำใครผ่านคำสั่งข้อความ (Prompt) ด้วยโมเดล OpenAI
- 3D Room Visualizer: อัปโหลดภาพห้องของคุณและดูลวดลายกระเบื้องที่สร้างขึ้นในรูปแบบ 3 มิติ
- Smart Layout Optimization: ระบบคำนวณการปูกระเบื้อง 2D อัจฉริยะ สามารถจัดการจุดเริ่มต้นการปู ตัดกระเบื้องหลบสิ่งกีดขวาง (Obstacles) และคำนวณการนำเศษกระเบื้อง (Scrap) กลับมาใช้ใหม่ เพื่อหาเปอร์เซ็นต์การสูญเสีย (Waste %) ที่แท้จริง
- Smart Cost Calculator: ระบบคำนวณงบประมาณอัตโนมัติ โดยอ้างอิงจากขนาดพื้นที่, ขนาดกระเบื้อง, ประเภทวัสดุ, ค่าแรงช่าง, และเปอร์เซ็นต์เผื่อเสีย
- Quotation & Receipt: ออกใบเสนอราคาและใบเสร็จสรุปยอดค่าใช้จ่ายทั้งหมดในรูปแบบที่พร้อมนำไปใช้งานต่อ
- Cloud Storage: บันทึกประวัติการสร้างลวดลายกระเบื้องของผู้ใช้แต่ละคนผ่านระบบฐานข้อมูลบนคลาวด์

---

## 2. โครงสร้างเทคโนโลยี (Tech Stack)

- Frontend: HTML5, CSS3, Vanilla JavaScript, Three.js (สำหรับการเรนเดอร์ 3D)
- Backend: Node.js, Express.js 5
- Database: PostgreSQL (ให้บริการโดย Supabase)
- AI Integration: OpenAI API (gpt-image-1)
- Deployment: Vercel (Serverless Functions)
- Typography: IBM Plex Sans Thai

---

## 3. การติดตั้งระบบเพื่อใช้งานจริง (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- Node.js เวอร์ชัน 18.0 ขึ้นไป
- บัญชี Supabase สำหรับฐานข้อมูล PostgreSQL
- API Key จาก OpenAI

### ขั้นตอนการติดตั้ง (Installation)

1. ดาวน์โหลดโค้ดและเข้าไปที่โฟลเดอร์โปรเจกต์:
   ```bash
   git clone https://github.com/CarToon890/tileai-project.git
   cd tileai-project
   ```

2. ติดตั้งแพ็กเกจที่จำเป็น:
   ```bash
   npm install
   ```

3. สร้างไฟล์คอนฟิก `.env` ไว้ที่โฟลเดอร์หลักของโปรเจกต์ และกำหนดค่าดังนี้:
   ```text
   DATABASE_URL=your_supabase_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. เริ่มต้นการทำงานของเซิร์ฟเวอร์จำลอง:
   ```bash
   node server.js
   ```
   ระบบจะทำงานที่ URL: http://localhost:3000

---

## 4. โครงสร้างของโปรเจกต์ (Project Structure)

```text
ECOTile/
├── public/                 # โฟลเดอร์เก็บไฟล์ส่วนหน้าบ้าน (Frontend)
│   ├── generator.html      # หน้าออกแบบกระเบื้องด้วย AI
│   ├── optimization.html   # หน้าคำนวณ Layout การปูกระเบื้อง 2D
│   ├── optimization.js     # สคริปต์คำนวณเศษกระเบื้อง (Scrap Management)
│   ├── receipt.html        # หน้าแสดงใบเสร็จรับเงิน
│   ├── room3d.js           # สคริปต์ควบคุมการแสดงผล 3 มิติ (Three.js)
│   ├── login.html          # หน้าเข้าสู่ระบบ
│   ├── register.html       # หน้าลงทะเบียนผู้ใช้งานใหม่
│   ├── home.html           # หน้าแรกของเว็บไซต์
│   └── styles.css          # ไฟล์จัดการความสวยงามของเว็บไซต์
├── server.js               # โฟลเดอร์เก็บไฟล์ส่วนหลังบ้าน (Backend API)
├── package.json            # ไฟล์จัดการแพ็กเกจและเวอร์ชัน
└── vercel.json             # ไฟล์ตั้งค่าสำหรับการนำขึ้นระบบ Vercel
```

---

## 5. คู่มือการใช้งาน (User Workflow)

กระบวนการทำงานหลักของระบบถูกออกแบบมาให้เข้าใจง่าย:
1. Authentication: ผู้ใช้ใหม่ทำการสมัครสมาชิก (Register) หรือเข้าสู่ระบบ (Login)
2. Dashboard: เข้าสู่หน้าหลัก (Home) เพื่อดูภาพรวมบริการ
3. Generate: สร้างลายกระเบื้องผ่านหน้าต่างออกแบบ (Generator)
4. Layout Optimization: เข้าหน้าจำลองการปูกระเบื้อง (Optimization) กำหนดขนาดห้อง สิ่งกีดขวาง และดูการจัดเรียงกระเบื้องที่ดีที่สุดเพื่อประหยัดเศษ
5. View & Calculate: ตรวจสอบแบบ 3D Preview และคำนวณราคาประเมินเบื้องต้น
6. Export: สั่งพิมพ์หรือบันทึกข้อมูลสรุปค่าใช้จ่ายจากหน้าใบเสร็จ (Receipt)

---

## 6. API Endpoints

| Method | Path             | Description                            |
| ------ | ---------------- | -------------------------------------- |
| POST   | `/register`      | สมัครสมาชิก                            |
| POST   | `/login`         | เข้าสู่ระบบ                            |
| POST   | `/generate-tile` | สร้างรูปกระเบื้องด้วย AI (gpt-image-1) |
| POST   | `/upload-room`   | Upload รูปห้อง (max 15MB)              |
| GET    | `/tiles/:userId` | ดึง gallery ของ user                   |
| DELETE | `/tile/:id`      | ลบกระเบื้อง                            |
| POST   | `/api/optimize-layout` | คำนวณแผนผังการปูกระเบื้อง 2D (หลบสิ่งกีดขวาง & นำเศษกลับมาใช้) |

---

## 7. ข้อกำหนดและหมายเหตุ (Important Notes)

- ฐานข้อมูล: รูปภาพที่สร้างจาก AI จะถูกจัดเก็บในรูปแบบ Base64 ลงในฐานข้อมูล Supabase โดยตรง เนื่องจากข้อจำกัดของระบบ Vercel ที่เป็น Read-only filesystem
- ราคาวัสดุ: ข้อมูลราคาวัสดุและค่าแรงที่ใช้ในการคำนวณ เป็นราคาอ้างอิงมาตรฐานกลางในตลาดประเทศไทย ไม่ได้เชื่อมต่อกับฐานข้อมูลของร้านค้าวัสดุก่อสร้างใดๆ
- ขนาดรูปภาพ AI: รูปแบบและขนาดของรูปกระเบื้องที่ AI สร้างจะถูกกำหนดตายตัวไว้ที่ความละเอียด 1024x1024 พิกเซลเสมอ
