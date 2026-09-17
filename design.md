# Farm Money Tracker - Design Document

## 🎯 Project Overview
Farm Money Tracker เป็นแอปพลิเคชันสำหรับบันทึกรายรับ-รายจ่ายที่ออกแบบมาเพื่อเกษตรกรโดยเฉพาะ โดยเน้นการใช้งานที่ง่าย รวดเร็ว และเป็นมิตรต่อผู้ใช้งาน (User-friendly) โดยเฉพาะผู้สูงอายุหรือผู้ที่ไม่ถนัดเทคโนโลยีมากนัก

## 👥 Target Audience
- เกศตรกรชาวสวน ชาวไร่
- ผู้สูงอายุ หรือผู้ใช้ที่ต้องการแอปพลิเคชันที่มีความซับซ้อนน้อย
- ผู้ที่ต้องการจัดการบัญชีผ่านโทรศัพท์มือถือเป็นหลัก

## 🛠 Technology Stack
**Frontend:**
- **React (Vite):** สำหรับสร้าง User Interface ที่รวดเร็วและตอบสนองได้ดี
- **Tailwind CSS:** สำหรับจัดการ Styling และสร้างระบบ UI ที่ยืดหยุ่นและดูแลรักษาง่าย
- **Zustand:** สำหรับจัดการ State ภายในแอปพลิเคชัน (State Management)

**Backend & Database:**
- **Google Apps Script (GAS):** ทำหน้าที่เป็น API (Serverless) ในการรับส่งข้อมูลระหว่าง Frontend และ Database
- **Google Sheets:** ใช้เป็นฐานข้อมูล (Database) ฟรี เข้าถึงง่าย และผู้ใช้สามารถเปิดดูหรือสำรองข้อมูลในรูปแบบ Excel/Sheet ได้โดยตรง

## 🏛 Architecture
แอปพลิเคชันทำงานแบบ Client-Server Architecture แบบเบา (Lightweight):
1. **Client (React App):** ผู้ใช้ใช้งานหน้าเว็บ (สามารถนำไป Deploy บน Vercel ได้)
2. **API (GAS):** หน้าเว็บยิง Request (GET/POST) ไปยัง Google Apps Script Web App URL
3. **Database (Google Sheets):** GAS ทำการอ่าน/เขียนข้อมูลลงใน Sheet 3 หน้าหลัก ได้แก่:
   - `Users`: ข้อมูลผู้ใช้งาน
   - `Transactions`: ข้อมูลบันทึกรายรับ-รายจ่าย
   - `Categories`: หมวดหมู่ของรายรับและรายจ่าย

## 🎨 UI/UX Design Principles
การออกแบบเน้นหลักการ **"ชัดเจน อ่านง่าย กดง่าย"** (Accessibility-First)

### 1. Typography (ตัวอักษร)
- **Font Family:** ใช้ **Bai Jamjuree** เป็นฟอนต์หลัก เพื่อให้อ่านง่าย ดูทันสมัยแต่ยังคงความเป็นทางการที่สบายตา
- **Size:** ใช้ขนาดตัวอักษรที่ใหญ่กว่ามาตรฐานทั่วไป (เช่น `text-lg`, `text-xl`) เพื่อให้ผู้สูงอายุอ่านได้โดยไม่ต้องเพ่ง

### 2. Color Palette (โทนสี)
ใช้โทนสีธรรมชาติ (Nature/Farm Theme) เพื่อให้ความรู้สึกสบายตาและสื่อถึงการเกษตร
- **Primary Color:** โทนสีเขียว (`farm-50` ถึง `farm-900`)
- **Background:** สีเขียวอ่อนสุด (`bg-farm-50` / `#f0fdf4`) เพื่อลดความสว่างจ้าของหน้าจอ
- **Danger/Warning:** สีแดงที่ชัดเจนสำหรับรายจ่ายหรือปุ่มลบข้อมูล

### 3. Components & Layout
- **Mobile-First:** ออกแบบมาเพื่อให้แสดงผลบนหน้าจอโทรศัพท์มือถือได้อย่างสมบูรณ์แบบ
- **Large Touch Targets:** ปุ่มกด (Buttons) และช่องกรอกข้อมูล (Inputs) มีขนาดใหญ่ (`py-4`, `px-6`, `rounded-2xl`) เพื่อให้ใช้นิ้วกดบนมือถือได้แม่นยำ
- **Card Design:** ข้อมูลต่างๆ จะถูกจัดกลุ่มในรูปแบบกล่อง (Card) ที่มีขอบมนและเงาบางๆ เพื่อแยกแยะข้อมูลได้ชัดเจน
- **Custom Scrollbar:** ขยายขนาด Scrollbar ให้หนาขึ้น เพื่อให้ผู้ใช้สามารถแตะและเลื่อนหน้าจอได้ง่ายขึ้น

## 📱 Page Structure (โครงสร้างหน้าเว็บ)
- **Login (`Login.jsx`):** หน้าจอเข้าสู่ระบบ
- **Dashboard (`Dashboard.jsx`):** หน้าแรกที่แสดงสรุปยอดเงินรวม ภาพรวมรายรับ-รายจ่าย
- **Transactions (`Transactions.jsx`):** หน้ารายการบันทึกรายรับ-รายจ่าย และปุ่มสำหรับเพิ่มรายการใหม่ (Add Transaction Modal)
- **Categories (`Categories.jsx`):** หน้าสำหรับจัดการหมวดหมู่ (เพิ่ม/ลบ หมวดหมู่รายรับและรายจ่าย)
