# Farm Money Tracker 🌱

แอปพลิเคชันสำหรับให้เกษตรกรบันทึกรายรับ-รายจ่ายของสวน โดยเน้นการใช้งานที่ง่าย ตัวอักษรใหญ่ และรองรับมือถือ พร้อมใช้ Google Sheets เป็นฐานข้อมูล

## 🛠 เทคโนโลยีที่ใช้
- Frontend: React (Vite) + Tailwind CSS + Zustand
- Backend/Database: Google Apps Script + Google Sheets

---

## 🚀 คู่มือการติดตั้งและใช้งาน

### 1. การตั้งค่า Google Sheets & Google Apps Script
ระบบนี้ใช้ Google Sheets เป็นฐานข้อมูล โดยมีขั้นตอนการตั้งค่าดังนี้:

1. **เปิด Google Sheet ของคุณ**
   เปิดไฟล์ [Google Sheet](https://docs.google.com/spreadsheets/d/105ybcR7e4RlPj3pFgYk_dnvk-5Wy30AsBVbtIGFBSN4/edit?usp=sharing) 
   *(หมายเหตุ: หากคุณไม่ได้เป็นเจ้าของ Sheet นี้ กรุณาไปที่ `ไฟล์ > ทำสำเนา` (File > Make a copy) เพื่อสร้าง Sheet เป็นของตัวเองก่อน)*

2. **เปิด Google Apps Script**
   - ใน Google Sheet ไปที่เมนู `ส่วนขยาย` (Extensions) > `Apps Script`

3. **คัดลอกโค้ดลง Apps Script**
   - ลบโค้ดเดิมทั้งหมดที่มีใน `Code.gs`
   - นำโค้ดจากไฟล์ `Code.gs` ที่อยู่ในโปรเจกต์นี้ ไปวางแทนที่
   - **สำคัญมาก:** ตรวจสอบบรรทัดที่ 1 `const SPREADSHEET_ID = '...';` ให้ตรงกับ ID ของ Google Sheet ของคุณ 
     *(ID คือข้อความยาวๆ ใน URL ระหว่าง `/d/` กับ `/edit`)*

4. **ตั้งค่าเริ่มต้นให้ฐานข้อมูล (Run Setup)**
   - ในหน้าต่าง Apps Script ให้เลือกฟังก์ชัน `setupSheets` จากเมนูดรอปดาวน์ด้านบน แล้วกดปุ่ม **▶ เรียกใช้ (Run)**
   - *ระบบจะขอสิทธิ์เข้าถึงบัญชี Google ของคุณ ให้กดยินยอม (Review permissions > เลือกบัญชี > Advanced > Go to...)*
   - เมื่อรันเสร็จ ระบบจะสร้าง Sheet ที่ชื่อ `Users`, `Transactions`, `Categories` ให้โดยอัตโนมัติ

5. **Deploy เป็น Web App (สร้าง API URL)**
   - กดปุ่ม **การทำให้ใช้งานได้ (Deploy)** ที่มุมขวาบน > เลือก **การทำให้ใช้งานได้รายการใหม่ (New deployment)**
   - ตรง "เลือกประเภท" (Select type) ให้คลิกที่ฟันเฟืองและเลือก **เว็บแอป (Web App)**
   - **คำอธิบาย:** พิมพ์ `v1`
   - **ดำเนินการในฐานะ (Execute as):** เลือก `ฉัน (Me)`
   - **ผู้มีสิทธิ์เข้าถึง (Who has access):** เลือก `ทุกคน (Anyone)` *(สำคัญมาก ไม่เช่นนั้นแอปจะดึงข้อมูลไม่ได้)*
   - กด **ทำให้ใช้งานได้ (Deploy)**
   - ระบบจะสร้าง **URL ของเว็บแอป (Web App URL)** ขึ้นมา ให้คัดลอก URL นี้เก็บไว้

---

### 2. การรันโปรเจกต์บนเครื่องของคุณ (Local Development)

1. **ติดตั้ง Node.js** บนเครื่อง (หากยังไม่มี แนะนำเวอร์ชัน 18+ ขึ้นไป)
2. **เปิด Terminal / Command Prompt** เข้าไปที่โฟลเดอร์โปรเจกต์ `farm-money-tracker`
3. **ติดตั้ง Package** โดยรันคำสั่ง:
   ```bash
   npm install
   ```
4. **ตั้งค่า Environment Variable**
   - สร้างไฟล์ชื่อ `.env` ในโฟลเดอร์ `farm-money-tracker`
   - ใส่ URL ของ Web App ที่ได้จากขั้นตอนที่ 1 ลงไป ดังนี้:
     ```env
     VITE_GAS_API_URL="วาง-URL-ของเว็บแอป-ที่นี่"
     ```
5. **รันโปรเจกต์**
   ```bash
   npm run dev
   ```
   เว็บจะเปิดขึ้นที่ `http://localhost:5173`
   *(รหัสผ่านทดสอบเริ่มต้นคือ Username: `admin` / Password: `1234`)*

---

### 3. การนำไปแขวนบนอินเทอร์เน็ต (Deploy บน Vercel)

1. อัปโหลดโค้ดโปรเจกต์นี้ขึ้น GitHub ของคุณ
2. สมัครและเข้าสู่ระบบ [Vercel](https://vercel.com/)
3. กด **Add New... > Project** และเลือก Repository ของคุณจาก GitHub
4. ก่อนกดปุ่ม Deploy ให้เลื่อนลงมาที่หัวข้อ **Environment Variables**
   - **Name:** `VITE_GAS_API_URL`
   - **Value:** *นำ Web App URL ที่ได้จากขั้นตอนที่ 1 มาใส่*
   - กดปุ่ม **Add**
5. กดปุ่ม **Deploy** และรอสักครู่ คุณก็จะได้เว็บไซต์ที่สามารถใช้งานจริงได้เลย!

---

## 🎨 การปรับแต่งเพิ่มเติม

- **เปลี่ยนสีหลักของเว็บ:** คุณสามารถแก้สี `farm` ในไฟล์ `tailwind.config.js` ได้
- **เพิ่มหมวดหมู่ตั้งต้น:** สามารถแก้ไขได้ในฟังก์ชัน `setupSheets` ภายใน `Code.gs` หรือเพิ่มผ่านแอปได้โดยตรง
- **ขนาดตัวอักษรและปุ่ม:** เน้นใช้ Tailwind class `text-lg`, `text-xl`, `py-4`, `px-6` เพื่อให้ปุ่มและข้อความมีขนาดใหญ่ กดง่าย อ่านง่าย สำหรับผู้สูงอายุ
