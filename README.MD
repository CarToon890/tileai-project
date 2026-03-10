# ✦ TileAI

ระบบออกแบบและประมาณราคากระเบื้องด้วย AI สำหรับตลาดไทย  
Demo: [tileai-project.vercel.app](https://tileai-project.vercel.app)

---

## User Flow

```
login.html → home.html → generator.html → receipt.html
```

1. **Login / Register** — สมัครสมาชิก หรือเข้าสู่ระบบ
2. **Home** — หน้าหลัก แสดง feature overview
3. **Generator** — พิมพ์ลวดลาย เลือกตัวเลือก → Generate หรือ Upload รูปกระเบื้อง → ดู 3D Preview + ราคาประมาณการ
4. **Receipt** — ใบเสร็จราคาสำหรับพิมพ์

---

## Tech Stack

| Layer     | Technology                         |
| --------- | ---------------------------------- |
| Backend   | Node.js + Express 5                |
| Database  | PostgreSQL (Supabase)              |
| AI Image  | OpenAI gpt-image-1                 |
| 3D Viewer | Three.js r128                      |
| Deploy    | Vercel (Serverless)                |
| Font      | IBM Plex Sans Thai + IBM Plex Mono |

---

## Project Structure

```
tileai-project/
├── server.js           # Express backend (Vercel serverless)
├── vercel.json         # Vercel config
├── package.json
└── public/
    ├── generator.html  # สร้าง/upload กระเบื้อง + คำนวณราคา
    ├── receipt.html    # ใบเสร็จ
    ├── room3d.js       # Three.js 3D viewer
    ├── login.html
    ├── register.html
    ├── home.html
    └── styles.css
```

---

## Setup (Local)

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. สร้างไฟล์ `.env`

```env
DATABASE_URL=your_supabase_connection_string
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

### 3. รันเซิร์ฟเวอร์

```bash
node server.js
```

เปิดที่ `http://localhost:3000`

---

## Deploy (Vercel)

### 1. ตั้ง Environment Variables บน Vercel Dashboard

```
DATABASE_URL        → Project Settings → Environment Variables
OPENAI_API_KEY      → Project Settings → Environment Variables
```

### 2. `vercel.json` ต้องอยู่ใน root

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/server.js" }]
}
```

### 3. Push ขึ้น GitHub — Vercel จะ deploy อัตโนมัติ

---

## API Endpoints

| Method | Path             | Description                            |
| ------ | ---------------- | -------------------------------------- |
| POST   | `/register`      | สมัครสมาชิก                            |
| POST   | `/login`         | เข้าสู่ระบบ                            |
| POST   | `/generate-tile` | สร้างรูปกระเบื้องด้วย AI (gpt-image-1) |
| POST   | `/upload-room`   | Upload รูปห้อง (max 15MB)              |
| GET    | `/tiles/:userId` | ดึง gallery ของ user                   |
| DELETE | `/tile/:id`      | ลบกระเบื้อง                            |

---

## ตัวเลือกการคำนวณราคา (generator.html)

| ตัวเลือก        | ค่าที่เลือกได้                      | ผล                      |
| --------------- | ----------------------------------- | ----------------------- |
| ขนาดกระเบื้อง   | 30×30, 60×60, 60×120, 80×80         | กระทบจำนวนแผ่น          |
| ประเภทวัสดุ     | เซรามิก, แกรนิตโต้, หินอ่อน, ลายไม้ | กระทบราคาวัสดุ + ค่าแรง |
| พื้นที่ปู       | ตร.ม.                               | พื้นที่ต่อห้อง          |
| จำนวนห้อง       | 1–99                                | คูณพื้นที่รวม           |
| % ของเสียสำรอง  | 5%, 10%, 15%                        | กระทบจำนวนแผ่น          |
| รูปแบบการปู     | แนวตรง, เฉียง 45°                   | เฉียง = ค่าวัสดุ ×1.15  |
| ชั้นของอาคาร    | ชั้น 1, ชั้น 2+                     | ชั้น 2+ = ค่าแรง ×1.20  |
| รวมค่าแรง       | toggle                              | เปิด/ปิดค่าแรงช่าง      |
| รวมค่ากาว+ยาแนว | toggle                              | บวกเพิ่ม 100 ฿/ตร.ม.    |

---

## ราคาวัสดุ (ปี 2568)

| วัสดุ     | 30×30 | 60×60   | 60×120  | 80×80   | ค่าแรง        |
| --------- | ----- | ------- | ------- | ------- | ------------- |
| เซรามิก   | 150 ฿ | 200 ฿   | 250 ฿   | 220 ฿   | 350 ฿/ตร.ม.   |
| แกรนิตโต้ | 400 ฿ | 450 ฿   | 550 ฿   | 500 ฿   | 425 ฿/ตร.ม.   |
| หินอ่อน   | 900 ฿ | 1,200 ฿ | 1,500 ฿ | 1,300 ฿ | 1,050 ฿/ตร.ม. |
| ลายไม้    | 400 ฿ | 500 ฿   | 600 ฿   | 550 ฿   | 450 ฿/ตร.ม.   |

ราคาต่อ ตร.ม. — อ้างอิงตลาดไทย ไม่ได้ดึงจาก API ภายนอก

---

## หมายเหตุ

- รูปที่ generate เก็บเป็น base64 ลง Supabase DB โดยตรง — ไม่ใช้ filesystem (Vercel read-only)
- Supabase free tier หยุดทำงานหลัง 7 วันไม่มี activity — ต้อง restore ที่ [supabase.com](https://supabase.com)
- AI generate รูปขนาด 1024×1024px เสมอ — ขนาดกระเบื้องที่เลือกไม่กระทบ resolution
- ราคา hardcode ใน frontend — ไม่ได้ดึงจากบริษัทใด
