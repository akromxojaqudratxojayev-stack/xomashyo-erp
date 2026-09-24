import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  ShoppingBag, 
  Fuel, 
  DollarSign, 
  Settings, 
  ShieldAlert, 
  Check, 
  Plus, 
  Trash2, 
  Key, 
  AlertTriangle 
} from 'lucide-react';

export default function FinancialView({ currentUser }) {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Narxlar formasi
  const [kartonPrice, setKartonPrice] = useState('');
  const [salafanPrice, setSalafanPrice] = useState('');
  const [gasRefillPrice, setGasRefillPrice] = useState('');
  const [gasRefillKm, setGasRefillKm] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Yangi xarajat qo'shish
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('BOSHQA');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Parolni o'zgartirish
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resSt, resSet, resExp, resU] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/settings'),
        fetch('/api/expenses'),
        fetch('/api/users')
      ]);

      const st = await resSt.json();
      const set = await resSet.json();
      const exp = await resExp.json();
      const u = await resU.json();

      setStats(st);
      setSettings(set);
      setExpenses(Array.isArray(exp) ? exp : []);
      setUsers(Array.isArray(u) ? u : []);

      if (set) {
        setKartonPrice(set.karton_buy_price || '1500');
        setSalafanPrice(set.salafan_buy_price || '3000');
        setGasRefillPrice(set.gas_refill_price || '85000');
        setGasRefillKm(set.gas_refill_km || '220');
      }

      if (u && u.length > 0 && !selectedUserId) {
        setSelectedUserId(u[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Narx va sozlamalarni saqlash
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          karton_buy_price: kartonPrice,
          salafan_buy_price: salafanPrice,
          gas_refill_price: gasRefillPrice,
          gas_refill_km: gasRefillKm
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Yangi xarajat qo'shish
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expenseCategory,
          amount: expenseAmount,
          description: expenseDesc
        })
      });
      if (res.ok) {
        setShowExpenseModal(false);
        setExpenseAmount('');
        setExpenseDesc('');
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Parolni o'zgartirish
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg('Parol muvaffaqiyatli o\'zgartirildi!');
        setNewPassword('');
        setTimeout(() => setPasswordMsg(''), 4000);
      } else {
        alert(data.error || 'Xatolik');
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const isProfitPositive = (stats?.financial?.net_profit || 0) >= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* 1. MOLIYAVIY ASOSIY KO'RSATKICHLAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sotuv (Kirim) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jami Sotuv (Kirim)</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats?.financial?.total_sales_income?.toLocaleString() || 0} <span className="text-xs font-normal">so'm</span>
          </div>
        </div>

        {/* Xarid (Chiqim) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Do'konlarga To'langan</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats?.financial?.total_purchases_cost?.toLocaleString() || 0} <span className="text-xs font-normal">so'm</span>
          </div>
        </div>

        {/* Gaz va Yoqilg'i */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gaz va Yoqilg'i</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats?.financial?.gas_expenses?.toLocaleString() || 0} <span className="text-xs font-normal">so'm</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">GPS masofasi asosida</span>
        </div>

        {/* Sof Foyda */}
        <div className={`p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between ${
          isProfitPositive 
            ? 'bg-gradient-to-br from-emerald-600 to-teal-700' 
            : 'bg-gradient-to-br from-rose-600 to-red-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">Sof Foyda</span>
            <div className="p-2 bg-white/20 rounded-xl">
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black mt-2">
            {stats?.financial?.net_profit?.toLocaleString() || 0} <span className="text-xs font-normal">so'm</span>
          </div>
          <span className="text-[10px] text-white/80 mt-1 block">
            = Sotuv - Xarid - Gaz - Chiqimlar
          </span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. NARXLAR VA GAZ SOZLAMALARI */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              <span>Joriy Narxlar & Gaz Normasi</span>
            </h3>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saqlandi!</span>
              </span>
            )}
          </div>

          {/* O'ZGARMAS NARX KAFOLATI XABARI */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">O'zgarmas narx kafolati:</span> Bu yerda narx o'zgartirilsa, faqat <b>kelgusi yangi operatsiyalar</b> uchun qo'llaniladi. Avval olingan va sotilgan mahsulotlarning arxiv narxlari aslo buzilmaydi!
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  📦 Karton olish narxi (so'm/kg):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={kartonPrice}
                  onChange={(e) => setKartonPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🛍️ Salafan olish narxi (so'm/kg):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={salafanPrice}
                  onChange={(e) => setSalafanPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                ⛽ Gaz Zapravka Ko'rsatkichlari:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    1 ta to'liq zapravka narxi (so'm):
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={gasRefillPrice}
                    onChange={(e) => setGasRefillPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    1 ta zapravkada yuradigan km:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={gasRefillKm}
                    onChange={(e) => setGasRefillKm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[11px] text-slate-500">
                  1 km yo'l tannarxi: <b className="text-emerald-700">{Math.round(Number(gasRefillPrice || 0) / Number(gasRefillKm || 1))} so'm/km</b>
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Narxlar va Gaz Sozlamalarini Saqlash
            </button>
          </form>
        </div>

        {/* 3. PAROLLARNI BOSHQARISH VA XAVFSIZLIK */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Key className="w-5 h-5 text-emerald-600" />
              <span>Xodimlar Parollarini Boshqarish</span>
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Hisobchi yoki Admin xodimlarning kirish parollarini shu yerdan xavfsiz yangilay oladi.
          </p>

          {passwordMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 font-medium">
              <Check className="w-4 h-4" />
              <span>{passwordMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Xodimni tanlang:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username} - {u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yangi Parol:
              </label>
              <input
                type="text"
                required
                minLength="4"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kamida 4 ta belgi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Parolni Yangilash
            </button>
          </form>

          {/* Foydalanuvchilar qisqa ro'yxati */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
              Tizimdagi Rollar:
            </span>
            <div className="space-y-1.5">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-800">{u.name}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 4. XARAJATLAR RO'YXATI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Chiqimlar va Xarajatlar Tarixi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              GPS orqali hisoblangan Gaz sarfi va boshqa kunlik xarajatlar
            </p>
          </div>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Xarajat Qo'shish</span>
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Hozircha xarajatlar kiritilmagan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Sana</th>
                  <th className="py-3 px-4 font-bold">Turi</th>
                  <th className="py-3 px-4 font-bold">Izoh / Tafsilot</th>
                  <th className="py-3 px-4 font-bold">Masofa (km)</th>
                  <th className="py-3 px-4 font-bold">Summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-medium text-slate-500">{exp.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        exp.category === 'GAZ' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {exp.category === 'GAZ' ? '⛽ GAZ' : '📌 BOSHQA'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{exp.description || '-'}</td>
                    <td className="py-3 px-4">{exp.distance_km ? `${exp.distance_km} km` : '-'}</td>
                    <td className="py-3 px-4 font-extrabold text-rose-600 text-sm">
                      -{exp.amount?.toLocaleString()} so'm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* XARAJAT QO'SHISH MODALI */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-800">Yangi Xarajat Kiritish</h3>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Xarajat turi:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpenseCategory('BOSHQA')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      expenseCategory === 'BOSHQA'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Boshqa Chiqim
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseCategory('GAZ')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      expenseCategory === 'GAZ'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Gaz / Yoqilg'i
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Summasi (so'm) *:</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Masalan: 35000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Izoh:</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Masalan: Tushlik yoki Mayda ehtiyot qism"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
