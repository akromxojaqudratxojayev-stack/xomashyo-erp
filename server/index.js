import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db, { initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bazani ishga tushirish
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Foydali funksiyalar: 2 nuqta orasidagi masofani hisoblash (Haversine formula - km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Yer radiusi km da
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Bugungi sanani olish (YYYY-MM-DD)
function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Ertangi sanani olish (YYYY-MM-DD)
function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// 1. LOGIN VA FOYDALANUVCHILAR
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Login va parolni kiriting' });
    }
    const user = await db.prepare('SELECT id, username, role, name, password FROM users WHERE username = ?').get(username.trim());
    if (!user || user.password !== password.trim()) {
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.prepare('SELECT id, username, role, name FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Yangi parol kamida 4 belgidan iborat bo\'lishi kerak' });
    }
    await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPassword.trim(), userId);
    res.json({ success: true, message: 'Parol muvaffaqiyatli yangilandi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. SOZLAMALAR VA NARXLAR
// ==========================================
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updates = req.body; // { karton_buy_price: 1600, ... }
    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [k, v] of Object.entries(updates)) {
      await stmt.run(k, String(v));
    }
    res.json({ success: true, message: 'Sozlamalar saqlandi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. DO'KONLAR BAZASI
// ==========================================
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await db.prepare('SELECT * FROM stores WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC').all();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stores', async (req, res) => {
  try {
    const { name, phone, address, lat, lng, contact_person, network_name } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: 'Do\'kon nomi va lokatsiyasini ko\'rsating' });
    }
    const stmt = db.prepare(`
      INSERT INTO stores (name, phone, address, lat, lng, contact_person, network_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt.run(name.trim(), phone || '', address || '', Number(lat), Number(lng), contact_person || '', network_name || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, lat, lng, contact_person, network_name } = req.body;
    await db.prepare(`
      UPDATE stores 
      SET name = ?, phone = ?, address = ?, lat = ?, lng = ?, contact_person = ?, network_name = ?
      WHERE id = ?
    `).run(name.trim(), phone || '', address || '', Number(lat), Number(lng), contact_person || '', network_name || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Do'konni butunlay o'chirmasdan faqat "is_active = 0" (arxiv) qilib qo'yamiz.
    // Shunda barcha eski hisobot va savdolar saqlanib qoladi!
    await db.prepare('UPDATE stores SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. DASTAFKA VA REYS
// ==========================================
app.get('/api/deliveries', async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();
    const rows = await db.prepare(`
      SELECT 
        d.*,
        s.name as store_name,
        s.phone as store_phone,
        s.address as store_address,
        s.lat as store_lat,
        s.lng as store_lng,
        s.contact_person as store_contact
      FROM deliveries d
      JOIN stores s ON d.store_id = s.id
      WHERE d.date = ?
      ORDER BY 
        CASE d.status
          WHEN 'KUTILMOQDA' THEN 1
          WHEN 'BAJARILDI' THEN 2
          WHEN 'TAYYORMAS' THEN 3
          ELSE 4
        END,
        d.order_index ASC, 
        d.id ASC
    `).all(date);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bugungi reysga do'konlarni biriktirish (Admin)
app.post('/api/deliveries/assign', async (req, res) => {
  try {
    const { store_ids, date } = req.body;
    const targetDate = date || getTodayDate();
    if (!Array.isArray(store_ids) || store_ids.length === 0) {
      return res.status(400).json({ error: 'Do\'kon tanlanmadi' });
    }

    const checkStmt = db.prepare('SELECT id FROM deliveries WHERE store_id = ? AND date = ?');
    const insertStmt = db.prepare(`
      INSERT INTO deliveries (store_id, date, status, order_index)
      VALUES (?, ?, 'KUTILMOQDA', ?)
    `);

    let addedCount = 0;
    let idx = 0;
    for (const store_id of store_ids) {
      const exists = await checkStmt.get(store_id, targetDate);
      if (!exists) {
        await insertStmt.run(store_id, targetDate, idx);
        addedCount++;
      }
      idx++;
    }

    res.json({ success: true, addedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tartibni yangilash (Marshrut optimallashtirish)
app.post('/api/deliveries/reorder', async (req, res) => {
  try {
    const { ordered_ids } = req.body; // [12, 15, 8]
    if (Array.isArray(ordered_ids)) {
      const updateStmt = db.prepare('UPDATE deliveries SET order_index = ? WHERE id = ?');
      let index = 0;
      for (const id of ordered_ids) {
        await updateStmt.run(index, id);
        index++;
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Do'konda ishni yakunlash ("BAJARILDI")
app.post('/api/deliveries/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { karton_kg, salafan_kg, payment_type, paid_amount, notes } = req.body;

    // Hozirgi joriy narxlarni sozlamalardan olish (SNAPSHOT - o'zgarmas narxlar kafolati)
    const kartonPriceRow = await db.prepare('SELECT value FROM settings WHERE key = ?').get('karton_buy_price');
    const salafanPriceRow = await db.prepare('SELECT value FROM settings WHERE key = ?').get('salafan_buy_price');

    const kartonPrice = Number(kartonPriceRow ? kartonPriceRow.value : 1500);
    const salafanPrice = Number(salafanPriceRow ? salafanPriceRow.value : 3000);

    const k_kg = Number(karton_kg) || 0;
    const s_kg = Number(salafan_kg) || 0;
    const total = (k_kg * kartonPrice) + (s_kg * salafanPrice);
    const paid = paid_amount != null ? Number(paid_amount) : total;

    await db.prepare(`
      UPDATE deliveries
      SET 
        status = 'BAJARILDI',
        karton_kg = ?,
        salafan_kg = ?,
        karton_price_snapshot = ?,
        salafan_price_snapshot = ?,
        total_amount = ?,
        paid_amount = ?,
        payment_type = ?,
        notes = ?,
        completed_at = NOW()
      WHERE id = ?
    `).run(k_kg, s_kg, kartonPrice, salafanPrice, total, paid, payment_type || 'NAQD', notes || '', id);

    res.json({ 
      success: true, 
      data: {
        total_amount: total,
        kartonPrice,
        salafanPrice
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buyurtmani qoldirish ("TAYYORMAS" -> Ertangi kunga o'tadi)
app.post('/api/deliveries/:id/postpone', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const tomorrow = getTomorrowDate();

    // Hozirgi buyurtma ma'lumotlarini olish
    const current = await db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }

    // Bugungi yozuvni 'TAYYORMAS' ga o'tkazish
    await db.prepare(`
      UPDATE deliveries 
      SET status = 'TAYYORMAS', postponed_reason = ?, postponed_date = ?
      WHERE id = ?
    `).run(reason || 'Mahsulot tayyor emas / Magazin yopiq', tomorrow, id);

    // Ertangi kun uchun yangi reysga avtomat qo'shish (agar ertaga allaqachon mavjud bo'lmasa)
    const existsTomorrow = await db.prepare('SELECT id FROM deliveries WHERE store_id = ? AND date = ?').get(current.store_id, tomorrow);
    if (!existsTomorrow) {
      await db.prepare(`
        INSERT INTO deliveries (store_id, date, status, notes)
        VALUES (?, ?, 'KUTILMOQDA', ?)
      `).run(current.store_id, tomorrow, `Avval qoldirilgan: ${reason || 'Tayyormas'}`);
    }

    res.json({ success: true, message: 'Buyurtma ertangi kunga surildi', postponedTo: tomorrow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. GPS VA GAZ (YOQILG'I) KALKULYATORI
// ==========================================
app.get('/api/trip/today', async (req, res) => {
  try {
    const today = getTodayDate();
    let trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
    
    // Agar bugungi reys hali ochilmagan bo'lsa, yangi yaratish
    if (!trip) {
      const resInsert = await db.prepare('INSERT INTO driver_trips (date, total_km, gas_spent_sum, is_active) VALUES (?, 0, 0, 1)').run(today);
      trip = { id: resInsert.lastInsertRowid, date: today, total_km: 0, gas_spent_sum: 0, is_active: 1 };
    }

    // Gaz narxi va km normasi
    const refillPrice = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_price')?.value || 85000);
    const refillKm = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_km')?.value || 220);
    const costPerKm = refillPrice / refillKm;

    res.json({
      ...trip,
      refillPrice,
      refillKm,
      costPerKm: Math.round(costPerKm)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GPS lokatsiyani yangilash va masofa qo'shish
app.post('/api/trip/update-location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'Koordinatalar yo\'q' });
    }

    const today = getTodayDate();
    let trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
    if (!trip) {
      await db.prepare('INSERT INTO driver_trips (date, total_km, gas_spent_sum, last_lat, last_lng, is_active) VALUES (?, 0, 0, ?, ?, 1)').run(today, lat, lng);
      trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
      return res.json({ trip, addedKm: 0 });
    }

    let addedKm = 0;
    if (trip.last_lat && trip.last_lng) {
      addedKm = calculateDistance(trip.last_lat, trip.last_lng, lat, lng);
      // Agar juda kichik siljish bo'lsa (50 metrdan kam), hisobga olmaslik (GPS shovqini)
      if (addedKm < 0.05) addedKm = 0;
      // Agar 1 ta sakrash 50 kmdan ortiq bo'lsa (GPS xatosi), hisobga olmaslik
      if (addedKm > 50) addedKm = 0;
    }

    const newTotalKm = Math.round((trip.total_km + addedKm) * 10) / 10;

    const refillPrice = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_price')?.value || 85000);
    const refillKm = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_km')?.value || 220);
    const costPerKm = refillPrice / refillKm;
    const gasSpent = Math.round(newTotalKm * costPerKm);

    await db.prepare(`
      UPDATE driver_trips
      SET total_km = ?, gas_spent_sum = ?, last_lat = ?, last_lng = ?, updated_at = NOW()
      WHERE id = ?
    `).run(newTotalKm, gasSpent, lat, lng, trip.id);

    // Xarajatlar jadvalida bugungi gazni sinxronlashtirish
    const existingExpense = await db.prepare("SELECT id FROM expenses WHERE date = ? AND category = 'GAZ'").get(today);
    if (existingExpense) {
      await db.prepare('UPDATE expenses SET amount = ?, distance_km = ?, description = ? WHERE id = ?')
        .run(gasSpent, newTotalKm, `GPS orqali gaz (${newTotalKm} km)`, existingExpense.id);
    } else if (gasSpent > 0) {
      await db.prepare("INSERT INTO expenses (date, category, amount, distance_km, description) VALUES (?, 'GAZ', ?, ?, ?)")
        .run(today, gasSpent, newTotalKm, `GPS orqali gaz (${newTotalKm} km)`);
    }

    res.json({
      success: true,
      total_km: newTotalKm,
      gas_spent_sum: gasSpent,
      addedKm: Math.round(addedKm * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qo'lda spidometr km kiritish (agar haydovchi GPS o'rniga qo'lda kiritmoqchi bo'lsa)
app.post('/api/trip/manual-km', async (req, res) => {
  try {
    const { total_km } = req.body;
    const km = Number(total_km) || 0;
    const today = getTodayDate();

    const refillPrice = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_price')?.value || 85000);
    const refillKm = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_km')?.value || 220);
    const costPerKm = refillPrice / refillKm;
    const gasSpent = Math.round(km * costPerKm);

    let trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
    if (!trip) {
      await db.prepare('INSERT INTO driver_trips (date, total_km, gas_spent_sum, is_active) VALUES (?, ?, ?, 1)').run(today, km, gasSpent);
    } else {
      await db.prepare("UPDATE driver_trips SET total_km = ?, gas_spent_sum = ?, updated_at = NOW() WHERE id = ?").run(km, gasSpent, trip.id);
    }

    // Xarajatga yozish
    const existingExpense = await db.prepare("SELECT id FROM expenses WHERE date = ? AND category = 'GAZ'").get(today);
    if (existingExpense) {
      await db.prepare('UPDATE expenses SET amount = ?, distance_km = ?, description = ? WHERE id = ?')
        .run(gasSpent, km, `Spidometr bo'yicha gaz (${km} km)`, existingExpense.id);
    } else {
      await db.prepare("INSERT INTO expenses (date, category, amount, distance_km, description) VALUES (?, 'GAZ', ?, ?, ?)")
        .run(today, gasSpent, km, `Spidometr bo'yicha gaz (${km} km)`);
    }

    res.json({ success: true, total_km: km, gas_spent_sum: gasSpent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. XOMASHYO SOTUV BO'LIMI (Zavod/Xaridorga)
// ==========================================
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await db.prepare('SELECT * FROM sales WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC').all();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { buyer_name, material_type, weight_kg, price_per_kg, discount_amount, payment_type, notes, date } = req.body;
    const w = Number(weight_kg) || 0;
    const p = Number(price_per_kg) || 0;
    const disc = Number(discount_amount) || 0;
    const total = Math.max(0, (w * p) - disc);

    const saleDate = date || getTodayDate();

    const stmt = db.prepare(`
      INSERT INTO sales (date, buyer_name, material_type, weight_kg, price_per_kg, discount_amount, total_amount, payment_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(saleDate, buyer_name.trim(), material_type, w, p, disc, total, payment_type || 'NAQD', notes || '');
    res.json({ success: true, id: result.lastInsertRowid, total_amount: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_name, material_type, weight_kg, price_per_kg, discount_amount, payment_type, notes, date } = req.body;
    const w = Number(weight_kg) || 0;
    const p = Number(price_per_kg) || 0;
    const disc = Number(discount_amount) || 0;
    const total = Math.max(0, (w * p) - disc);

    await db.prepare(`
      UPDATE sales SET buyer_name = ?, material_type = ?, weight_kg = ?, price_per_kg = ?, discount_amount = ?, total_amount = ?, payment_type = ?, notes = ?, date = ? WHERE id = ?
    `).run(buyer_name.trim(), material_type, w, p, disc, total, payment_type || 'NAQD', notes || '', date || getTodayDate(), id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('UPDATE sales SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. XARAJATLAR (Gaz va boshqalar)
// ==========================================
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await db.prepare('SELECT * FROM expenses WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC').all();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const expDate = date || getTodayDate();
    const result = await db.prepare(`
      INSERT INTO expenses (date, category, amount, description)
      VALUES (?, ?, ?, ?)
    `).run(expDate, category || 'BOSHQA', Number(amount) || 0, description || '');
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, description, date } = req.body;
    await db.prepare(`
      UPDATE expenses SET category = ?, amount = ?, description = ?, date = ? WHERE id = ?
    `).run(category, Number(amount) || 0, description || '', date || getTodayDate(), id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('UPDATE expenses SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. UMUMIY HISOBOT, KASSA VA OMBOR STATISTIKASI
// ==========================================

app.get('/api/settings', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updates = req.body; // { karton_buy_price: 1600, ... }
    const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [k, v] of Object.entries(updates)) {
      await stmt.run(k, String(v));
    }
    res.json({ success: true, message: 'Sozlamalar saqlandi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. DO'KONLAR BAZASI
// ==========================================
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await db.prepare('SELECT * FROM stores WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC').all();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stores', async (req, res) => {
  try {
    const { name, phone, address, lat, lng, contact_person, network_name } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: 'Do\'kon nomi va lokatsiyasini ko\'rsating' });
    }
    const stmt = db.prepare(`
      INSERT INTO stores (name, phone, address, lat, lng, contact_person, network_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = await stmt.run(name.trim(), phone || '', address || '', Number(lat), Number(lng), contact_person || '', network_name || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, lat, lng, contact_person, network_name } = req.body;
    await db.prepare(`
      UPDATE stores 
      SET name = ?, phone = ?, address = ?, lat = ?, lng = ?, contact_person = ?, network_name = ?
      WHERE id = ?
    `).run(name.trim(), phone || '', address || '', Number(lat), Number(lng), contact_person || '', network_name || null, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Do'konni butunlay o'chirmasdan faqat "is_active = 0" (arxiv) qilib qo'yamiz.
    // Shunda barcha eski hisobot va savdolar saqlanib qoladi!
    await db.prepare('UPDATE stores SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. DASTAFKA VA REYS
// ==========================================
app.get('/api/deliveries', async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();
    const rows = await db.prepare(`
      SELECT 
        d.*,
        s.name as store_name,
        s.phone as store_phone,
        s.address as store_address,
        s.lat as store_lat,
        s.lng as store_lng,
        s.contact_person as store_contact
      FROM deliveries d
      JOIN stores s ON d.store_id = s.id
      WHERE d.date = ?
      ORDER BY 
        CASE d.status
          WHEN 'KUTILMOQDA' THEN 1
          WHEN 'BAJARILDI' THEN 2
          WHEN 'TAYYORMAS' THEN 3
          ELSE 4
        END,
        d.order_index ASC, 
        d.id ASC
    `).all(date);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bugungi reysga do'konlarni biriktirish (Admin)
app.post('/api/deliveries/assign', async (req, res) => {
  try {
    const { store_ids, date } = req.body;
    const targetDate = date || getTodayDate();
    if (!Array.isArray(store_ids) || store_ids.length === 0) {
      return res.status(400).json({ error: 'Do\'kon tanlanmadi' });
    }

    const checkStmt = db.prepare('SELECT id FROM deliveries WHERE store_id = ? AND date = ?');
    const insertStmt = db.prepare(`
      INSERT INTO deliveries (store_id, date, status, order_index)
      VALUES (?, ?, 'KUTILMOQDA', ?)
    `);

    let addedCount = 0;
    let idx = 0;
    for (const store_id of store_ids) {
      const exists = await checkStmt.get(store_id, targetDate);
      if (!exists) {
        await insertStmt.run(store_id, targetDate, idx);
        addedCount++;
      }
      idx++;
    }

    res.json({ success: true, addedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tartibni yangilash (Marshrut optimallashtirish)
app.post('/api/deliveries/reorder', async (req, res) => {
  try {
    const { ordered_ids } = req.body; // [12, 15, 8]
    if (Array.isArray(ordered_ids)) {
      const updateStmt = db.prepare('UPDATE deliveries SET order_index = ? WHERE id = ?');
      let index = 0;
      for (const id of ordered_ids) {
        await updateStmt.run(index, id);
        index++;
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Do'konda ishni yakunlash ("BAJARILDI")
app.post('/api/deliveries/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { karton_kg, salafan_kg, payment_type, paid_amount, notes } = req.body;

    // Hozirgi joriy narxlarni sozlamalardan olish (SNAPSHOT - o'zgarmas narxlar kafolati)
    const kartonPriceRow = await db.prepare('SELECT value FROM settings WHERE key = ?').get('karton_buy_price');
    const salafanPriceRow = await db.prepare('SELECT value FROM settings WHERE key = ?').get('salafan_buy_price');

    const kartonPrice = Number(kartonPriceRow ? kartonPriceRow.value : 1500);
    const salafanPrice = Number(salafanPriceRow ? salafanPriceRow.value : 3000);

    const k_kg = Number(karton_kg) || 0;
    const s_kg = Number(salafan_kg) || 0;
    const total = (k_kg * kartonPrice) + (s_kg * salafanPrice);
    const paid = paid_amount != null ? Number(paid_amount) : total;

    await db.prepare(`
      UPDATE deliveries
      SET 
        status = 'BAJARILDI',
        karton_kg = ?,
        salafan_kg = ?,
        karton_price_snapshot = ?,
        salafan_price_snapshot = ?,
        total_amount = ?,
        paid_amount = ?,
        payment_type = ?,
        notes = ?,
        completed_at = NOW()
      WHERE id = ?
    `).run(k_kg, s_kg, kartonPrice, salafanPrice, total, paid, payment_type || 'NAQD', notes || '', id);

    res.json({ 
      success: true, 
      data: {
        total_amount: total,
        kartonPrice,
        salafanPrice
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buyurtmani qoldirish ("TAYYORMAS" -> Ertangi kunga o'tadi)
app.post('/api/deliveries/:id/postpone', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const tomorrow = getTomorrowDate();

    // Hozirgi buyurtma ma'lumotlarini olish
    const current = await db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }

    // Bugungi yozuvni 'TAYYORMAS' ga o'tkazish
    await db.prepare(`
      UPDATE deliveries 
      SET status = 'TAYYORMAS', postponed_reason = ?, postponed_date = ?
      WHERE id = ?
    `).run(reason || 'Mahsulot tayyor emas / Magazin yopiq', tomorrow, id);

    // Ertangi kun uchun yangi reysga avtomat qo'shish (agar ertaga allaqachon mavjud bo'lmasa)
    const existsTomorrow = await db.prepare('SELECT id FROM deliveries WHERE store_id = ? AND date = ?').get(current.store_id, tomorrow);
    if (!existsTomorrow) {
      await db.prepare(`
        INSERT INTO deliveries (store_id, date, status, notes)
        VALUES (?, ?, 'KUTILMOQDA', ?)
      `).run(current.store_id, tomorrow, `Avval qoldirilgan: ${reason || 'Tayyormas'}`);
    }

    res.json({ success: true, message: 'Buyurtma ertangi kunga surildi', postponedTo: tomorrow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. GPS VA GAZ (YOQILG'I) KALKULYATORI
// ==========================================
app.get('/api/trip/today', async (req, res) => {
  try {
    const today = getTodayDate();
    let trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
    
    // Agar bugungi reys hali ochilmagan bo'lsa, yangi yaratish
    if (!trip) {
      const resInsert = await db.prepare('INSERT INTO driver_trips (date, total_km, gas_spent_sum, is_active) VALUES (?, 0, 0, 1)').run(today);
      trip = { id: resInsert.lastInsertRowid, date: today, total_km: 0, gas_spent_sum: 0, is_active: 1 };
    }

    // Gaz narxi va km normasi
    const refillPrice = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_price')?.value || 85000);
    const refillKm = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_km')?.value || 220);
    const costPerKm = refillPrice / refillKm;

    res.json({
      ...trip,
      refillPrice,
      refillKm,
      costPerKm: Math.round(costPerKm)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GPS lokatsiyani yangilash va masofa qo'shish
app.post('/api/trip/update-location', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'Koordinatalar yo\'q' });
    }

    const today = getTodayDate();
    let trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
    if (!trip) {
      await db.prepare('INSERT INTO driver_trips (date, total_km, gas_spent_sum, last_lat, last_lng, is_active) VALUES (?, 0, 0, ?, ?, 1)').run(today, lat, lng);
      trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
      return res.json({ trip, addedKm: 0 });
    }

    let addedKm = 0;
    if (trip.last_lat && trip.last_lng) {
      addedKm = calculateDistance(trip.last_lat, trip.last_lng, lat, lng);
      // Agar juda kichik siljish bo'lsa (50 metrdan kam), hisobga olmaslik (GPS shovqini)
      if (addedKm < 0.05) addedKm = 0;
      // Agar 1 ta sakrash 50 kmdan ortiq bo'lsa (GPS xatosi), hisobga olmaslik
      if (addedKm > 50) addedKm = 0;
    }

    const newTotalKm = Math.round((trip.total_km + addedKm) * 10) / 10;

    const refillPrice = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_price')?.value || 85000);
    const refillKm = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_km')?.value || 220);
    const costPerKm = refillPrice / refillKm;
    const gasSpent = Math.round(newTotalKm * costPerKm);

    await db.prepare(`
      UPDATE driver_trips
      SET total_km = ?, gas_spent_sum = ?, last_lat = ?, last_lng = ?, updated_at = NOW()
      WHERE id = ?
    `).run(newTotalKm, gasSpent, lat, lng, trip.id);

    // Xarajatlar jadvalida bugungi gazni sinxronlashtirish
    const existingExpense = await db.prepare("SELECT id FROM expenses WHERE date = ? AND category = 'GAZ'").get(today);
    if (existingExpense) {
      await db.prepare('UPDATE expenses SET amount = ?, distance_km = ?, description = ? WHERE id = ?')
        .run(gasSpent, newTotalKm, `GPS orqali gaz (${newTotalKm} km)`, existingExpense.id);
    } else if (gasSpent > 0) {
      await db.prepare("INSERT INTO expenses (date, category, amount, distance_km, description) VALUES (?, 'GAZ', ?, ?, ?)")
        .run(today, gasSpent, newTotalKm, `GPS orqali gaz (${newTotalKm} km)`);
    }

    res.json({
      success: true,
      total_km: newTotalKm,
      gas_spent_sum: gasSpent,
      addedKm: Math.round(addedKm * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qo'lda spidometr km kiritish (agar haydovchi GPS o'rniga qo'lda kiritmoqchi bo'lsa)
app.post('/api/trip/manual-km', async (req, res) => {
  try {
    const { total_km } = req.body;
    const km = Number(total_km) || 0;
    const today = getTodayDate();

    const refillPrice = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_price')?.value || 85000);
    const refillKm = Number(await db.prepare('SELECT value FROM settings WHERE key = ?').get('gas_refill_km')?.value || 220);
    const costPerKm = refillPrice / refillKm;
    const gasSpent = Math.round(km * costPerKm);

    let trip = await db.prepare('SELECT * FROM driver_trips WHERE date = ?').get(today);
    if (!trip) {
      await db.prepare('INSERT INTO driver_trips (date, total_km, gas_spent_sum, is_active) VALUES (?, ?, ?, 1)').run(today, km, gasSpent);
    } else {
      await db.prepare("UPDATE driver_trips SET total_km = ?, gas_spent_sum = ?, updated_at = NOW() WHERE id = ?").run(km, gasSpent, trip.id);
    }

    // Xarajatga yozish
    const existingExpense = await db.prepare("SELECT id FROM expenses WHERE date = ? AND category = 'GAZ'").get(today);
    if (existingExpense) {
      await db.prepare('UPDATE expenses SET amount = ?, distance_km = ?, description = ? WHERE id = ?')
        .run(gasSpent, km, `Spidometr bo'yicha gaz (${km} km)`, existingExpense.id);
    } else {
      await db.prepare("INSERT INTO expenses (date, category, amount, distance_km, description) VALUES (?, 'GAZ', ?, ?, ?)")
        .run(today, gasSpent, km, `Spidometr bo'yicha gaz (${km} km)`);
    }

    res.json({ success: true, total_km: km, gas_spent_sum: gasSpent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. XOMASHYO SOTUV BO'LIMI (Zavod/Xaridorga)
// ==========================================
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await db.prepare('SELECT * FROM sales WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC').all();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { buyer_name, material_type, weight_kg, price_per_kg, discount_amount, payment_type, notes, date } = req.body;
    const w = Number(weight_kg) || 0;
    const p = Number(price_per_kg) || 0;
    const disc = Number(discount_amount) || 0;
    const total = Math.max(0, (w * p) - disc);

    const saleDate = date || getTodayDate();

    const stmt = db.prepare(`
      INSERT INTO sales (date, buyer_name, material_type, weight_kg, price_per_kg, discount_amount, total_amount, payment_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(saleDate, buyer_name.trim(), material_type, w, p, disc, total, payment_type || 'NAQD', notes || '');
    res.json({ success: true, id: result.lastInsertRowid, total_amount: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_name, material_type, weight_kg, price_per_kg, discount_amount, payment_type, notes, date } = req.body;
    const w = Number(weight_kg) || 0;
    const p = Number(price_per_kg) || 0;
    const disc = Number(discount_amount) || 0;
    const total = Math.max(0, (w * p) - disc);

    await db.prepare(`
      UPDATE sales SET buyer_name = ?, material_type = ?, weight_kg = ?, price_per_kg = ?, discount_amount = ?, total_amount = ?, payment_type = ?, notes = ?, date = ? WHERE id = ?
    `).run(buyer_name.trim(), material_type, w, p, disc, total, payment_type || 'NAQD', notes || '', date || getTodayDate(), id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('UPDATE sales SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. XARAJATLAR (Gaz va boshqalar)
// ==========================================
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await db.prepare('SELECT * FROM expenses WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC').all();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const expDate = date || getTodayDate();
    const result = await db.prepare(`
      INSERT INTO expenses (date, category, amount, description)
      VALUES (?, ?, ?, ?)
    `).run(expDate, category || 'BOSHQA', Number(amount) || 0, description || '');
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, description, date } = req.body;
    await db.prepare(`
      UPDATE expenses SET category = ?, amount = ?, description = ?, date = ? WHERE id = ?
    `).run(category, Number(amount) || 0, description || '', date || getTodayDate(), id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare('UPDATE expenses SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. UMUMIY HISOBOT, KASSA VA OMBOR STATISTIKASI
// ==========================================

app.get('/api/stats', async (req, res) => {
  try {
    const lastClosureRow = await db.prepare('SELECT closure_date FROM month_closures ORDER BY closure_date DESC, id DESC LIMIT 1').get();
    let minDateQuery = "";
    let params = [];

    if (lastClosureRow && lastClosureRow.closure_date) {
      minDateQuery = " AND date >= ? ";
      params.push(lastClosureRow.closure_date);
    }

    const buyStats = await db.prepare(`
      SELECT 
        COALESCE(SUM(karton_kg), 0) as total_karton_bought_kg,
        COALESCE(SUM(salafan_kg), 0) as total_salafan_bought_kg,
        COALESCE(SUM(total_amount), 0) as total_bought_sum
      FROM deliveries
      WHERE status = 'BAJARILDI' AND (is_active = 1 OR is_active IS NULL) ${minDateQuery}
    `).get(...params);

    const saleKarton = await db.prepare(`
      SELECT 
        COALESCE(SUM(weight_kg), 0) as total_sold_kg,
        COALESCE(SUM(total_amount), 0) as total_sold_sum
      FROM sales
      WHERE material_type = 'KARTON' AND (is_active = 1 OR is_active IS NULL) ${minDateQuery}
    `).get(...params);

    const saleSalafan = await db.prepare(`
      SELECT 
        COALESCE(SUM(weight_kg), 0) as total_sold_kg,
        COALESCE(SUM(total_amount), 0) as total_sold_sum
      FROM sales
      WHERE material_type = 'SALAFAN' AND (is_active = 1 OR is_active IS NULL) ${minDateQuery}
    `).get(...params);

    const totalSoldSum = saleKarton.total_sold_sum + saleSalafan.total_sold_sum;

    const buyStatsAll = await db.prepare(`
      SELECT 
        COALESCE(SUM(karton_kg), 0) as total_karton_bought_kg,
        COALESCE(SUM(salafan_kg), 0) as total_salafan_bought_kg
      FROM deliveries
      WHERE status = 'BAJARILDI' AND (is_active = 1 OR is_active IS NULL)
    `).get();
    
    const saleKartonAll = await db.prepare(`SELECT COALESCE(SUM(weight_kg), 0) as total_sold_kg FROM sales WHERE material_type = 'KARTON' AND (is_active = 1 OR is_active IS NULL)`).get();
    const saleSalafanAll = await db.prepare(`SELECT COALESCE(SUM(weight_kg), 0) as total_sold_kg FROM sales WHERE material_type = 'SALAFAN' AND (is_active = 1 OR is_active IS NULL)`).get();

    const kartonStockKg = Math.max(0, buyStatsAll.total_karton_bought_kg - saleKartonAll.total_sold_kg);
    const salafanStockKg = Math.max(0, buyStatsAll.total_salafan_bought_kg - saleSalafanAll.total_sold_kg);

    const gasExpense = await db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category = 'GAZ' AND (is_active = 1 OR is_active IS NULL) ${minDateQuery}`).get(...params).total;
    const otherExpense = await db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category != 'GAZ' AND (is_active = 1 OR is_active IS NULL) ${minDateQuery}`).get(...params).total;
    const totalExpenses = gasExpense + otherExpense;

    const netProfit = totalSoldSum - buyStats.total_bought_sum - totalExpenses;

    res.json({
      stock: {
        karton_kg: Math.round(kartonStockKg * 10) / 10,
        salafan_kg: Math.round(salafanStockKg * 10) / 10
      },
      warehouse: {
        karton_kg: Math.round(kartonStockKg * 10) / 10,
        salafan_kg: Math.round(salafanStockKg * 10) / 10
      },
      turnover: {
        total_karton_bought_kg: buyStats.total_karton_bought_kg,
        total_salafan_bought_kg: buyStats.total_salafan_bought_kg,
        total_karton_sold_kg: saleKarton.total_sold_kg,
        total_salafan_sold_kg: saleSalafan.total_sold_kg
      },
      financial: {
        total_sales_income: totalSoldSum,
        total_purchases_cost: buyStats.total_bought_sum,
        gas_expenses: gasExpense,
        other_expenses: otherExpense,
        total_expenses: totalExpenses,
        net_profit: netProfit
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Settings
app.get('/api/settings', async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM settings ORDER BY id DESC LIMIT 1').get();
    res.json(row || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Settings
app.post('/api/settings', async (req, res) => {
  try {
    const { karton_buy_price, salafan_buy_price, gas_refill_price, gas_refill_km } = req.body;
    await db.prepare(`
      INSERT INTO settings (karton_buy_price, salafan_buy_price, gas_refill_price, gas_refill_km)
      VALUES (?, ?, ?, ?)
    `).run(karton_buy_price, salafan_buy_price, gas_refill_price, gas_refill_km);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Yangi Qism: Founders (Ta'sischilar) API
// ==========================================
app.get('/api/founders', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM founders ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/founders', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.prepare('INSERT INTO founders (name) VALUES (?)').run(name);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/founders/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await db.prepare('UPDATE founders SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/founders/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM founders WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Founder Transactions (Divident olish/qo'shish)
// ==========================================
app.get('/api/founder-transactions/:founder_id', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM founder_transactions WHERE founder_id = ? ORDER BY date DESC, id DESC').all(req.params.founder_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/founder-transactions', async (req, res) => {
  try {
    const { founder_id, amount, notes, date } = req.body;
    
    await db.prepare(`
      INSERT INTO founder_transactions (founder_id, amount, notes, date)
      VALUES (?, ?, ?, ?)
    `).run(founder_id, amount, notes, date || getTodayDate());
    
    // Ta'sischi balansini yangilash
    await db.prepare(`
      UPDATE founders 
      SET balance = balance - ?
      WHERE id = ?
    `).run(amount, founder_id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Xarajat Toifalari (Expense Categories) API
// ==========================================
app.get('/api/expense-categories', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expense-categories', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name.toUpperCase());
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expense-categories/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await db.prepare('UPDATE expense_categories SET name = ? WHERE id = ?').run(name.toUpperCase(), req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expense-categories/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM expense_categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Oyni Yopish (Month Closures) API
// ==========================================
app.get('/api/month-closures', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM month_closures ORDER BY closure_date DESC, id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/month-closures', async (req, res) => {
  try {
    const { closure_date, closed_by } = req.body;
    const result = await db.prepare('INSERT INTO month_closures (closure_date, closed_by) VALUES (?, ?)').run(closure_date, closed_by || '');
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Sverka API (Bajarilgan reyslar ro'yxati)
// ==========================================
app.get('/api/reconciliation', async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT 
        d.id, d.store_id, d.date, d.status,
        d.karton_kg, d.salafan_kg, d.karton_price, d.salafan_price, d.total_price,
        s.name as store_name, s.network_name
      FROM deliveries d
      JOIN stores s ON d.store_id = s.id
      WHERE d.status = 'BAJARILDI' AND (d.is_active = 1 OR d.is_active IS NULL)
      ORDER BY d.date DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static frontend buildni taqdim qilish
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Barcha boshqa yo'nalishlar uchun index.html qaytarish (SPA routing)
app.get('*', async (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`рџљЂ Xomashyo Boshqaruv Serveri ishga tushdi: http://localhost:${PORT}`);
  console.log(`рџ“± Mahalliy tarmoqda (telefon orqali ulanish uchun ham tayyor)!`);
});


