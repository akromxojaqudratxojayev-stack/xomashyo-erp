import pg from 'pg';
const { Pool } = pg;

// Neon (PostgreSQL) ga ulanish
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y5SrA7ZDGNmB@ep-super-bread-b4b2s406-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// SQLite so'rovlarini Postgres formatiga o'tkazuvchi funksiya (? -> $1, $2)
function convertQuery(sql) {
  let idx = 1;
  // Sqlite's ON CONFLICT(key) DO UPDATE SET value = excluded.value 
  // needs to be ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
  let res = sql.replace(/\?/g, () => `$${idx++}`);
  res = res.replace(/excluded\.value/gi, 'EXCLUDED.value');
  return res;
}

// SQLite API sini emulyatsiya qiluvchi obyekt
const db = {
  prepare: (sql) => {
    const pgSql = convertQuery(sql);
    
    return {
      get: async (...args) => {
        let params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await pool.query(pgSql, params);
        return res.rows[0];
      },
      all: async (...args) => {
        let params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await pool.query(pgSql, params);
        return res.rows;
      },
      run: async (...args) => {
        let params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        let finalSql = pgSql;
        if (finalSql.trim().toUpperCase().startsWith('INSERT') && !finalSql.toUpperCase().includes('RETURNING') && !finalSql.toUpperCase().includes('INTO SETTINGS')) {
           finalSql += ' RETURNING id';
        }
        try {
          const res = await pool.query(finalSql, params);
          let lastInsertRowid = null;
          if (res.rows && res.rows.length > 0 && res.rows[0].id) {
              lastInsertRowid = res.rows[0].id;
          }
          return {
            changes: res.rowCount,
            lastInsertRowid
          };
        } catch (err) {
          console.error("SQL Run Error:", finalSql, params, err);
          throw err;
        }
      }
    };
  }
};

export async function initDatabase() {
  try {
    console.log('PostgreSQL bazaga ulanilmoqda...');
    
    // Foydalanuvchilar jadvali
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL
      )
    `).run();

    // Sozlamalar jadvali
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `).run();

    // Do'konlar jadvali
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        address TEXT,
        phone TEXT,
        contact_person TEXT
      )
    `).run();

    // Do'konni arxivga olish (soft delete) uchun ustun qo'shish
    try {
      await db.prepare(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1`).run();
    } catch (e) {
      console.log('Ustun allaqachon mavjud yoki xatolik (is_active)', e.message);
    }

    // Dastafkalar jadvali (bugungi yo'nalishlar)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES stores(id),
        date TEXT NOT NULL,
        status TEXT DEFAULT 'KUTILMOQDA',
        order_index INTEGER DEFAULT 0,
        karton_kg REAL DEFAULT 0,
        salafan_kg REAL DEFAULT 0,
        karton_price_snapshot REAL DEFAULT 0,
        salafan_price_snapshot REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_type TEXT,
        notes TEXT,
        completed_at TIMESTAMP,
        postponed_reason TEXT,
        postponed_date TEXT
      )
    `).run();

    // Dastafchik kunlik reys va yoqilg'i
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS driver_trips (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        total_km REAL DEFAULT 0,
        gas_spent_sum REAL DEFAULT 0,
        last_lat REAL,
        last_lng REAL,
        updated_at TIMESTAMP,
        is_active INTEGER DEFAULT 0
      )
    `).run();

    // Savdolar (yuk topshirish)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES stores(id),
        date TEXT NOT NULL,
        buyer_name TEXT,
        material_type TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        price_per_kg REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        payment_type TEXT,
        notes TEXT
      )
    `).run();

    // Xarajatlar jadvali
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        distance_km REAL,
        description TEXT
      )
    `).run();

    // Yangi qo'shilgan jadvallar va ustunlar (Modul: Ta'sischilar, Kategoriyalar, Sverka)
    try {
      await db.prepare('ALTER TABLE stores ADD COLUMN IF NOT EXISTS network_name TEXT').run();
      await db.prepare('ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1').run();
      await db.prepare('ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1').run();
      await db.prepare('ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1').run();
    } catch(e) { console.log('ALTER xatoligi (ehtimol ustunlar bor):', e.message); }

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS founders (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        balance REAL DEFAULT 0
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS founder_transactions (
        id SERIAL PRIMARY KEY,
        founder_id INTEGER REFERENCES founders(id),
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        notes TEXT,
        is_active INTEGER DEFAULT 1
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS month_closures (
        id SERIAL PRIMARY KEY,
        closure_date TEXT NOT NULL,
        closed_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Dastlabki uchriditellar va kategoriyalar
    const defaultCategories = ["Yoqilg'i", "Tushlik", "Zavod xarajati", "Soliq", "Arenda"];
    for(const cat of defaultCategories) {
      try {
        const exists = await db.prepare('SELECT id FROM expense_categories WHERE name = ?').get(cat);
        if(!exists) await db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(cat);
      } catch(e) {}
    }

    const defaultFounders = ["Akrom", "Saidaziz", "A'lo"];
    for(const f of defaultFounders) {
      try {
        const exists = await db.prepare('SELECT id FROM founders WHERE name = ?').get(f);
        if(!exists) await db.prepare('INSERT INTO founders (name) VALUES (?)').run(f);
      } catch(e) {}
    }

    // Dastlabki admin profilini yaratish
    const adminExists = await db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
    if (!adminExists) {
      await db.prepare("INSERT INTO users (username, password, role, name) VALUES ('admin', 'admin123', 'admin', 'Asosiy Administrator')").run();
      await db.prepare("INSERT INTO users (username, password, role, name) VALUES ('hisobchi', '123456', 'hisobchi', 'Hisobchi')").run();
      await db.prepare("INSERT INTO users (username, password, role, name) VALUES ('dastafchik', '123456', 'dastafchik', 'Dastafchik')").run();
      console.log('Asosiy foydalanuvchilar bazaga qo`shildi.');
    }
    
    console.log('PostgreSQL baza muvaffaqiyatli tayyorlandi!');
  } catch (error) {
    console.error('Bazaga ulanishda xatolik:', error);
  }
}

export default db;
