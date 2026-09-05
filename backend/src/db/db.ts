import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqlDb: Database;

export interface StatementWrapper {
  run(...params: any[]): { lastInsertRowid: number; changes: number };
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

export function calculateUserLevel(coins: number, booksReadCount: number = 0) {
  const isUstoz = coins >= 1000 || booksReadCount >= 3;
  const rankName = isUstoz ? 'Ustoz' : 'Talaba';
  const rankIcon = isUstoz ? '🧑‍🏫' : '🎓';

  const targetBooksForKeys = 10;
  const booksLeft = Math.max(0, targetBooksForKeys - booksReadCount);
  const percent = Math.min(100, Math.round((booksReadCount / targetBooksForKeys) * 100));
  const filledBlocks = Math.min(10, Math.floor(percent / 10));
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = '🟧'.repeat(filledBlocks) + '⬛'.repeat(emptyBlocks);

  return {
    levelName: rankName,
    levelIcon: rankIcon,
    nextLevelName: isUstoz ? 'Bosh Ustoz' : 'Ustoz',
    targetCoins: isUstoz ? 5000 : 1000,
    coinsLeft: isUstoz ? 0 : Math.max(0, 1000 - coins),
    percent,
    progressBar,
    isUstoz,
    booksReadCount,
    booksLeftForKeys: booksLeft,
    hasSurveyUnlocked: booksReadCount >= 1,
    hasKeysUnlocked: booksReadCount >= 10,
    keysProgressPercent: percent,
  };
}

export const db = {
  prepare(sql: string): StatementWrapper {
    return {
      run(...params: any[]) {
        try {
          sqlDb.run(sql, params);
          const lastIdRes = sqlDb.exec('SELECT last_insert_rowid() as id');
          const lastId = lastIdRes[0]?.values[0]?.[0] as number;
          const changesRes = sqlDb.exec('SELECT changes() as changes');
          const changes = changesRes[0]?.values[0]?.[0] as number;
          saveDbToDisk();
          return { lastInsertRowid: lastId || 0, changes: changes || 0 };
        } catch (err) {
          console.error('SQL Run Error:', sql, params, err);
          throw err;
        }
      },
      get(...params: any[]) {
        try {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (err) {
          console.error('SQL Get Error:', sql, params, err);
          throw err;
        }
      },
      all(...params: any[]) {
        try {
          const results: any[] = [];
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (err) {
          console.error('SQL All Error:', sql, params, err);
          throw err;
        }
      },
    };
  },
  exec(sql: string) {
    sqlDb.exec(sql);
    saveDbToDisk();
  },
  transaction<T>(fn: () => T): () => T {
    return () => {
      try {
        sqlDb.exec('BEGIN TRANSACTION;');
      } catch (_) {}
      try {
        const res = fn();
        try {
          sqlDb.exec('COMMIT;');
        } catch (_) {}
        saveDbToDisk();
        return res;
      } catch (err) {
        try {
          sqlDb.exec('ROLLBACK;');
        } catch (_) {}
        throw err;
      }
    };
  },
};

function saveDbToDisk() {
  try {
    if (sqlDb) {
      const data = sqlDb.export();
      const buffer = Buffer.from(data);
      const dbPath = path.resolve(process.cwd(), config.databasePath);
      fs.writeFileSync(dbPath, buffer);
    }
  } catch (err) {
    console.error('Failed to save sqlite db to disk:', err);
  }
}

export async function initDb() {
  const SQL = await initSqlJs();
  const dbPath = path.resolve(process.cwd(), config.databasePath);

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  // Execute schema
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../../src/db/schema.sql');
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  sqlDb.exec(schemaSql);

  // Auto-migration checks
  try {
    sqlDb.exec('ALTER TABLE users ADD COLUMN phone_number TEXT;');
  } catch (_) {}
  try {
    sqlDb.exec('ALTER TABLE users ADD COLUMN last_daily_bonus_at DATETIME;');
  } catch (_) {}
  try {
    sqlDb.exec('ALTER TABLE users ADD COLUMN last_lucky_spin_at DATETIME;');
  } catch (_) {}
  try {
    sqlDb.exec('ALTER TABLE users ADD COLUMN is_profile_completed INTEGER DEFAULT 0;');
  } catch (_) {}
  try {
    sqlDb.exec('ALTER TABLE books ADD COLUMN preview_pages INTEGER DEFAULT 10;');
  } catch (_) {}
  try {
    sqlDb.exec('ALTER TABLE books ADD COLUMN unlock_price_coins INTEGER DEFAULT 50;');
  } catch (_) {}

  // Seed sample data if empty or if books contain old low prices
  const checkOldPrices = db.prepare('SELECT COUNT(*) as count FROM books WHERE unlock_price_coins < 100').get() as { count: number } | undefined;
  const bookCountRes = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
  
  if (!bookCountRes || bookCountRes.count === 0 || (checkOldPrices && checkOldPrices.count > 0)) {
    console.log('Refreshing books with updated higher coin economy...');
    db.prepare('DELETE FROM quiz_questions').run();
    db.prepare('DELETE FROM quizzes').run();
    db.prepare('DELETE FROM market_items').run();
    db.prepare('DELETE FROM books').run();
    seedData();
  } else {
    try {
      db.prepare('UPDATE books SET preview_pages = 50').run();
    } catch (_) {}
  }

  saveDbToDisk();
}

function seedData() {
  const now = new Date().toISOString();

  // 5 REAL BOOKS
  const realBooks = [
    {
      title: "1000 ta eng kerakli fe'llar",
      author: "Lug'at / Til o'rganuvchilar uchun",
      cover_url: '/uploads/covers/1000_ta_eng_kerakli_fellar_cover.png',
      pdf_url: '/uploads/books/1000_ta_eng_kerakli_fellar.pdf',
      description: "Rus va o'zbek tillaridagi eng faol, har kuni ishlatiladigan 1000 ta asosiy fe'llar to'plami va ularning aniq tarjimalari. Lug'at boyligini oshirish uchun ajralmas amaliy qo'llanma.",
      category: 'Rivojlanish',
      price: 35000,
      pages_count: 53,
      preview_pages: 50,
      unlock_price_coins: 150,
      rating_avg: 4.9,
      reviews_count: 48,
      sample_content: `1000 ta eng kerakli fe'llar lug'ati. Rus va o'zbek tillaridagi eng faol so'zlar.

1. Мочь — Qilmoq, uddalamoq
2. Сказать — Aytmoq
3. Говорить — Gapirmoq
4. Знать — Bilmoq
5. Стать — Bo'lmoq
6. Хотеть — Xohlamoq
7. Идти — Bormoq, yurmoq
8. Иметь — Ega bo'lmoq
9. Видеть — Ko'rmoq
10. Думать — O'ylamoq`,
    },
    {
      title: "Tana Tili — Manipulyatsiya San'ati",
      author: 'M. J. Rajabov, X. X. Rajabova',
      cover_url: '/uploads/covers/Tana_Tili_Manipulyatsiya_Sanati_cover.png',
      pdf_url: '/uploads/books/Tana_Tili_Manipulyatsiya_Sanati.pdf',
      description: "Insonning tana harakatlari, imo-ishoralari, yuz ifodalari, nigohlari va psixologik ta'sir o'tkazish san'ati bo'yicha mukammal amaliy qo'llanma.",
      category: 'Psixologiya',
      price: 48000,
      pages_count: 200,
      preview_pages: 50,
      unlock_price_coins: 150,
      rating_avg: 5.0,
      reviews_count: 64,
      sample_content: `I BOB. TANA HARAKATLARINING TILI HAQIDA UMUMIY TASAWURLAR.

Insonning xatti-harakatlari uning o'ziga xos tashrif qog'ozidir. Har bir aktyor va notiq o'zaro munosabat uchun tana holatlari va boshqa badan harakatlaridan foydalana olishiga qarab muvaffaqiyatga erishadi.

Tana tili orqali siz suhbatdoshingizning haqiqiy niyatlarini, yolg'on gapirayotganini yoki samimiyligini 1 soniyada aniqlashingiz mumkin.`,
    },
    {
      title: 'Meni unutma, senga sevishni men o‘rgatdim',
      author: 'Hakan Mengüç',
      cover_url: '/uploads/covers/Meni_unutma_senga_sevishni_men_orgatdim_cover.png',
      pdf_url: '/uploads/books/Meni_unutma_senga_sevishni_men_orgatdim.pdf',
      description: "Qalb va tuyg'ular, kechirish, sabr, sevgini his qilish va ruhiy xotirjamlik haqidagi butun dunyoda mashhur bo'lgan falsafiy-badiiy asar.",
      category: 'Badiiy',
      price: 52000,
      pages_count: 260,
      preview_pages: 50,
      unlock_price_coins: 150,
      rating_avg: 4.9,
      reviews_count: 82,
      sample_content: `Eng katta ayriliqqa uchragan inson — aslo kelmaydigan insonni go'yoki har on kelib qoladigandek umrining oxirigacha kutgan insondir.

Unutma: Ba'zida yo'qotish — aslida eng buyuk topilmaning boshlanishidir. Qalbingizni ranjitganlarni kechirish orqali o'zingizga ruhiy ozodlik va erkinlik baxsh etasiz.`,
    },
    {
      title: 'Hech bir uchrashuv tasodif emas',
      author: 'Hakan Mengüç',
      cover_url: '/uploads/covers/Hech_bir_uchrashuv_tasodif_emas_cover.png',
      pdf_url: '/uploads/books/Hech_bir_uchrashuv_tasodif_emas.pdf',
      description: "Hayotdagi insonlar, uchrashuvlar, sinovlar va taqdirning ma'nosi haqida chuqur ibratli falsafiy asar. Hayotingizga kirgan har bir insonning o'z sababi bor.",
      category: 'Rivojlanish',
      price: 42000,
      pages_count: 28,
      preview_pages: 50,
      unlock_price_coins: 150,
      rating_avg: 5.0,
      reviews_count: 55,
      sample_content: `Hech bir uchrashuv tasodif emas. Hayotimizga kirib kelgan har bir inson yo bizga saboq, yo in'om, yo sinov bo'lib keladi.

Taqdir yo'llarida duch kelgan har bir voqea sizni yanada kuchliroq va dono qilish uchun yuborilgan ilohiy rejaning bir qismidir.`,
    },
    {
      title: 'Anton Chexov. Tanlangan asarlar (1-jild)',
      author: 'Anton Pavlovich Chexov',
      cover_url: '/uploads/covers/Anton_Chexov_Tanlangan_asarlar_1_jild_cover.png',
      pdf_url: '/uploads/books/Anton_Chexov_Tanlangan_asarlar_1_jild.pdf',
      description: "Buyuk jahon adibi Anton Chexovning oltin merosiga aylangan mashhur qissa va satirik hikoyalari to'plami ('Chinovnikning o'limi', 'Semiz va oriq', 'Xameleon', 'Niqob' va boshqalar).",
      category: 'Klassika',
      price: 65000,
      pages_count: 692,
      preview_pages: 50,
      unlock_price_coins: 150,
      rating_avg: 4.8,
      reviews_count: 39,
      sample_content: `CHINOVNIKNING O'LIMI.

Go'zal oqshomlarning birida xuddi shunday go'zal ekzekutor Ivan Dmitrich Cheryakov ikkinchi qator kreslolarning birida o'tirib, binokldan "Kornevil qo'ng'iroqlari"ni tomosha qilardi. U tomosha qilar va o'zini saodatning eng yuqori cho'qqisida his etardi...

Birdan uning yuzi burishib, ko'zlari yumildi-da... puf deb aksirib yubordi!`,
    },
  ];

  const insertBook = db.prepare(`
    INSERT INTO books (title, author, cover_url, pdf_url, description, category, price, pages_count, preview_pages, unlock_price_coins, rating_avg, reviews_count, sample_content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  realBooks.forEach((b) => {
    insertBook.run(
      b.title,
      b.author,
      b.cover_url,
      b.pdf_url,
      b.description,
      b.category,
      b.price,
      b.pages_count,
      b.preview_pages,
      b.unlock_price_coins,
      b.rating_avg,
      b.reviews_count,
      b.sample_content,
      now
    );
  });

  // Quizzes & Questions
  const insertQuiz = db.prepare(`
    INSERT INTO quizzes (book_id, title, description, questions_count, pass_threshold_percent, reward_coins, reward_premium_days, entry_cost_coins, min_pages_required, time_per_question_seconds, type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const q1 = insertQuiz.run(
    2,
    '“Tana Tili va Manipulyatsiya” mahorat testi',
    'Inson psixologiyasi, imo-ishoralar va tana tili sirlari bo‘yicha Kubok viktorinasi.',
    4,
    75,
    250,
    3,
    0,
    15,
    40,
    'cup',
    now
  );

  const q2 = insertQuiz.run(
    3,
    '“Hakan Mengüç Falsafasi” intellektual testi',
    'Sabr, sevgini his qilish va ruhiy xotirjamlik sirlari bo‘yicha savollar.',
    4,
    75,
    250,
    3,
    0,
    15,
    40,
    'cup',
    now
  );

  const q3 = insertQuiz.run(
    5,
    '“Anton Chexov Asarlari” klassik testi',
    'Chexov hikoyalari, satira va qahramonlar xarakteri bo‘yicha viktorina.',
    4,
    75,
    250,
    3,
    0,
    15,
    40,
    'cup',
    now
  );

  const insertQuestion = db.prepare(`
    INSERT INTO quiz_questions (quiz_id, question_text, options, correct_option, time_limit_seconds)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Questions for Quiz 1 (Tana Tili)
  insertQuestion.run(
    q1.lastInsertRowid,
    'Tana tili qoidalariga ko‘ra, qo‘llarni ko‘krakda chalishtirib turish nimani bildiradi?',
    JSON.stringify(['To‘liq ochiqlik va ishonch', 'Himoyalanish, yopiqlik yoki noqulaylik', 'Haddan tashqari xursandchilik', 'Beparvolik']),
    1,
    40
  );
  insertQuestion.run(
    q1.lastInsertRowid,
    'Suhbatdosh siz bilan gaplashayotganda burniga yoki qulog‘iga tez-tez tegsa, bu ko‘pincha nimadan dalolat beradi?',
    JSON.stringify(['Ikkiyuzlamachilik yoki noqulaylik/yolg‘on', 'Mutlaq haqiqat', 'Suhbatdan zavqlanish', 'Charchoq']),
    0,
    40
  );
  insertQuestion.run(
    q1.lastInsertRowid,
    'Ochiq kaftlarni ko‘rsatib gapirish psixologiyada nimaning ramzi hisoblanadi?',
    JSON.stringify(['G‘azab', 'Samimiylik va halollik', 'Qo‘rquv', 'Beparvolik']),
    1,
    40
  );
  insertQuestion.run(
    q1.lastInsertRowid,
    'Ko‘z bilan uzoq vaqt to‘g‘ridan-to‘g‘ri nigoh tashlash nimanidir yashirmaslikdan tashqari yana nimani anglatishi mumkin?',
    JSON.stringify(['Dominantlik (hukmronlik) yoki chuqur qiziqish', 'Uyqu kelishi', 'G‘amginlik', 'Diqqat tarqoqligi']),
    0,
    40
  );

  // Questions for Quiz 2 (Hakan Mengüç)
  insertQuestion.run(
    q2.lastInsertRowid,
    'Hakan Mengüç ta’limotiga ko‘ra, qalb xotirjamligiga erishishning birinchi kaliti nima?',
    JSON.stringify(['Boylik to‘plash', 'Kechirish va o‘tmishni qo‘yib yuborish', 'Barcha bilan bahslashish', 'Yolg‘izlikda yashash']),
    1,
    40
  );
  insertQuestion.run(
    q2.lastInsertRowid,
    '“Hech bir uchrashuv tasodif emas” kitobining asosiy g‘oyasi nima?',
    JSON.stringify(['Hayotdagi har bir inson yo saboq, yo in’om bo‘lib keladi', 'Hamma narsa tasodifan yuz beradi', 'Insonlarga ishonmaslik kerak', 'Faqat o‘zingga ishonish lozim']),
    0,
    40
  );
  insertQuestion.run(
    q2.lastInsertRowid,
    'Tasavvuf falsafasida sabr qanday ta’riflanadi?',
    JSON.stringify(['Chidab yig‘lash', 'Tikonga qarab gulni, tunga qarab tongni ko‘ra olish', 'Harakatsiz kutish', 'Beparvo bo‘lish']),
    1,
    40
  );
  insertQuestion.run(
    q2.lastInsertRowid,
    'Muallif fikricha, sevgining eng yuksak darajasi qanday?',
    JSON.stringify(['Shartlarsiz va evazsiz sevish', 'Faqat o‘z manfaatini o‘ylash', 'Boshqalarni boshqarish', 'Talablar qo‘yish']),
    0,
    40
  );

  // Questions for Quiz 3 (Anton Chexov)
  insertQuestion.run(
    q3.lastInsertRowid,
    'Chexovning mashhur “Chinovnikning o‘limi” hikoyasida Ivan Dmitrich teatrda nima qilib qo‘yadi?',
    JSON.stringify(['Generaldan pul so‘raydi', 'Oldidagi generalning ustiga beixtiyor aksirib yuboradi', 'Kresloni sindirib qo‘yadi', 'Teatrda uxlab qoladi']),
    1,
    40
  );
  insertQuestion.run(
    q3.lastInsertRowid,
    'Chexovning mashhur iborasi: “Qisqalik — ...” jumlasini to‘ldiring.',
    JSON.stringify(['Aqllilik belgisidir', 'Iste’dodning singlisidir', 'Kuchsizlikdir', 'Fozillikdir']),
    1,
    40
  );
  insertQuestion.run(
    q3.lastInsertRowid,
    '“Xameleon” hikoyasidagi bosh qahramon Ochumelovning xarakteri qanday?',
    JSON.stringify(['Doimo adolatparvar', 'Vaziyatga qarab o‘z fikrini o‘zgartiruvchi laganbardor', 'Qo‘rqmas qahramon', 'Olim']),
    1,
    40
  );
  insertQuestion.run(
    q3.lastInsertRowid,
    'Anton Chexov adabiyotdan tashqari qaysi kasb egasi bo‘lgan?',
    JSON.stringify(['Muhandis', 'Shifokor (vrach)', 'Huquqshunos', 'Rassom']),
    1,
    40
  );

  // Market Items with High Coin Values
  const insertMarket = db.prepare(`
    INSERT INTO market_items (category, title, description, image_url, price_coins, stock, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMarket.run(
    'kitob',
    'Tana Tili — Manipulyatsiya San’ati (Qattiq muqova)',
    'Psixologiya bo‘yicha eng mashhur kitob qog‘oz nashrda uyingizga yetkazib beriladi.',
    '/uploads/covers/Tana_Tili_Manipulyatsiya_Sanati_cover.png',
    2500,
    15,
    1,
    now
  );

  insertMarket.run(
    'gadget',
    'Simsiz Audio Quloqchin (AirPods Pro analog)',
    'Kitobxonlar uchun yuqori sifatli ovozga ega audio-kitob quloqchini.',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80',
    6000,
    5,
    1,
    now
  );

  insertMarket.run(
    'promokod',
    'Premium Obuna (1 Oylik)',
    'Ilovadagi barcha kitoblarni to‘liq o‘qish va cheksiz imtiyozlar.',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    1500,
    999,
    1,
    now
  );

  // Contests
  const insertContest = db.prepare(`
    INSERT INTO contests (title, banner_url, prize_description, starts_at, ends_at, condition_type, condition_target, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  insertContest.run(
    'Haftalik Do‘stlar Tanlovi 🏆',
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0d0?w=800&auto=format&fit=crop&q=80',
    'Kindle Paperwhite elektron kitobi + 1500 Coin!',
    now,
    nextWeek,
    'referrals',
    5,
    1,
    now
  );

  // Banners
  const insertBanner = db.prepare(`
    INSERT INTO banners (title, subtitle, image_url, action_url, badge, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertBanner.run(
    'Haftalik Do‘stlar Tanlovi!',
    '5 ta do‘stingizni taklif qiling va Kindle Paperwhite yutib oling',
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0d0?w=800&auto=format&fit=crop&q=80',
    '#contest',
    'SUPER YUTUQ',
    1,
    now
  );

  insertBanner.run(
    'O‘qish vaqti — Coin vaqti!',
    'Har bir mutolaa daqiqasi uchun Coin ishlang',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
    '#library',
    'MUTOLAA',
    1,
    now
  );

  // Demo User
  db.prepare(`
    INSERT OR IGNORE INTO users (telegram_id, username, full_name, coin_balance, streak_days, last_active_at, created_at)
    VALUES ('123456789', 'kitobxon_user', 'Avazbek Komiljonovich', 250, 4, ?, ?)
  `).run(now, now);
}

export default db;

