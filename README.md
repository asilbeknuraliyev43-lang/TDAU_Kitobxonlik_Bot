# 📚 KITOBXON — Gamifikatsiyalangan Telegram Bot va Mini App

Yoshlarni kitob mutolaasiga jalb qiluvchi, o‘qilgan sahifalarni avtomatik kuzatuvchi, testlar (gate mexanizmi) va tanlovlar orqali tanga (coin) hamda faxriy yutuq sertifikatlari beruvchi zamonaviy Telegram Mini App va Telegraf Bot ekotizimi.

---

## 🚀 Texnologik Stack

- **Bot va Backend API:** Node.js (TypeScript, Express, Telegraf)
- **Ma'lumotlar bazasi:** SQLite (Wasm - `sql.js`, nolinchi C++ kompilyatsiyasi talabi, PostgreSQL/Supabase bilan 100% mos)
- **Frontend (Mini App):** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas-Confetti, Canvas/PDF sertifikat generatori
- **Telegram Integratsiyasi:** Telegram WebApp SDK, `initData` HMAC-SHA256 xavfsizlik tekshiruvi, Haptic Feedback (vibratsiya), Referal mexanizmi

---

## 📱 BotFather'da Mini App'ni sozlash (Menu Button & Main App)

1. Telegramda [@BotFather](https://t.me/BotFather) ga kiring.
2. `/mybots` buyrug‘ini yuboring va botingizni tanlang (`8700635237:AAEpnrYoGsUefOEzKXqSIFAYpK6JqLGRPWU`).
3. **Bot Settings** -> **Menu Button** -> **Configure menu button**:
   - URL: Mini App joylashtirilgan havola (masalan: `https://your-domain.vercel.app` yoki ngrok/localtunnel URL)
   - Button Title: `🚀 Ilovani Ochish`
4. **Bot Settings** -> **Main App** -> **Enable Main App** va URL manzilini kiriting.

---

## 🛠️ Loyihani Ishga Tushirish (Quickstart)

### 1. Backend'ni ishga tushirish:
```bash
cd backend
npm install
npm run dev
```
Backend API `http://localhost:5000` portida va Telegram Bot polling rejimida ishga tushadi.

### 2. Frontend'ni ishga tushirish:
```bash
cd frontend
npm install
npm run dev
```
Mini App `http://localhost:5173` manzilida ochiladi.

---

## 🌟 Asosiy Imkoniyatlar

1. **🏠 Asosiy (Home):**
   - Dinamik bannerlar karuseli
   - Kitobxon Premium promo-kartasi
   - Haftalik tanlov (progress bar va taymer bilan)
   - Kitobxonlar Kubogi saralangan testlari
   - Mashhur kitoblar javoni

2. **📚 Kutubxona (Library):**
   - Kategoriya va qidiruv filtrlari
   - 2 ustunli kartochkalar, sevimlilar (yurakcha)
   - Kitob tafsilotlari sahifasi
   - **In-App E-Reader:** Sahifalarni varaqlash, o‘qish vaqti taymeri va sahifalar hisobini backend'ga avtomatik sinxronizatsiya qilish
   - **Qog‘oz kitob buyurtma qilish**
   - **Izohlar va baholash:** Sifatli sharhlar uchun avtomatik +10 tanga mukofoti

3. **🥇 Kubok (Cup & Quizzes):**
   - **Gate Mexanizmi:** Foydalanuvchi kitobni kamida 20–30 bet o‘qimaguncha test qulflangan holatda bo‘ladi va o‘qish progressi ko‘rsatiladi.
   - **Interaktiv Viktorina:** Har bir savolga 40 soniyalik taymer, haptik tebranish, ball hisobi va g‘alaba qozonilganda konfetti animatsiyasi + tanga mukofoti.

4. **🏆 Tanlov (Contest):**
   - Yirik mavsumiy tanlovlar va mukofotlar (iPad, Kindle, 1 yillik Premium)
   - Umumiy jonli Leaderboard (Oltin, Kumush, Bronza podiumlari)

5. **🛍️ Market & Sertifikatlar:**
   - Tangalar evaziga sovg‘alar, promokodlar va kitoblar xarid qilish
   - **Dinamik Sertifikat Generatori:** Foydalanuvchi ismi, yutuq darajasi, sana va unikal ID bilan rasmiy yuqori sifatli sertifikat generatsiyasi va PNG/PDF yuklab olish

6. **👤 Sahifam (Profile):**
   - Profil kartasi va tangalar balansi
   - 4 ta asosiy statistika katakchalari: Kitoblar soni, O‘qish soati, Kun seriyasi (Streak), Nishonlar
   - Referal tizimi (`https://t.me/bot?start=r_userId`)
   - Haptic feedback (vibratsiya) yoqish/o‘chirish

7. **🛡️ Admin Panel:**
   - Kitoblar qo‘shish va o‘chirish
   - Testlar va savollar boshqaruvi
   - Sharhlarni moderatsiya qilish (+10 tanga berish)
   - Buyurtmalar holatini boshqarish
