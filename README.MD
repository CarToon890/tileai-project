# ✦ TileAI

ระบบออกแบบและประมาณราคากระเบื้องด้วย AI สำหรับตลาดไทย

---

## User Flow

```
login.html → home.html → generator.html → receipt.html
```

1. **Login / Register** — สมัครสมาชิก หรือเข้าสู่ระบบ
2. **Home** — หน้าหลัก
3. **Generator** — พิมพ์ลวดลาย เลือกวัสดุ/ขนาด/พื้นที่ → Generate หรือ Upload รูปกระเบื้อง → ดู 3D Preview + ราคาประมาณการ
4. **Receipt** — ใบเสร็จราคาสำหรับพิมพ์

---

## Tech Stack

| Layer     | Technology                         |
| --------- | ---------------------------------- |
| Backend   | Node.js + Express 5                |
| Database  | PostgreSQL (Supabase)              |
| AI Image  | OpenAI gpt-image-1                 |
| 3D Viewer | Three.js r128                      |
| Font      | IBM Plex Sans Thai + IBM Plex Mono |

---

## Setup

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

## API Endpoints

| Method | Path              | Description                            |
| ------ | ----------------- | -------------------------------------- |
| POST   | `/register`       | สมัครสมาชิก                            |
| POST   | `/login`          | เข้าสู่ระบบ                            |
| POST   | `/generate-tile`  | สร้างรูปกระเบื้องด้วย AI (gpt-image-1) |
| POST   | `/upload-room`    | Upload รูปห้อง (max 15MB)              |
| GET    | `/tiles/:userId`  | ดึง gallery ของ user                   |
| DELETE | `/tile/:id`       | ลบกระเบื้อง                            |
| GET    | `/factory-config` | ดึงราคาวัสดุและค่าแรง                  |
| GET    | `/uploads/*`      | Static files                           |

---

## ราคาวัสดุ (ปี 2568)

| วัสดุ     | 30×30 | 60×60   | 60×120  | 80×80   | ค่าแรง        |
| --------- | ----- | ------- | ------- | ------- | ------------- |
| เซรามิก   | 150 ฿ | 200 ฿   | 250 ฿   | 220 ฿   | 350 ฿/ตร.ม.   |
| แกรนิตโต้ | 400 ฿ | 450 ฿   | 550 ฿   | 500 ฿   | 425 ฿/ตร.ม.   |
| หินอ่อน   | 900 ฿ | 1,200 ฿ | 1,500 ฿ | 1,300 ฿ | 1,050 ฿/ตร.ม. |
| ลายไม้    | 400 ฿ | 500 ฿   | 600 ฿   | 550 ฿   | 450 ฿/ตร.ม.   |

ราคาต่อ ตร.ม. — ไม่รวมค่ากาวและยาแนว

---

## Files

```
tileai-project/
├── server.js           # Express backend
├── generator.html      # หน้าหลัก — สร้าง/upload กระเบื้อง + ราคา
├── receipt.html        # ใบเสร็จ
├── room3d.js           # Three.js 3D viewer
├── login.html
├── register.html
├── home.html
└── styles.css
```

---

## หมายเหตุ

- ต้อง restore Supabase project ที่ [supabase.com](https://supabase.com) ก่อนใช้งาน ถ้า free tier หยุดทำงาน
- Upload รูปกระเบื้องใช้ `URL.createObjectURL` — ไม่เก็บใน localStorage
- Gallery โหลดจาก server เท่านั้น ต้องการ Supabase ที่ active อยู่
