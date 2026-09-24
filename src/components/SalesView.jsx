import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  Plus, 
  DollarSign, 
  Calendar, 
  Tag, 
  FileText 
} from 'lucide-react';

export default function SalesView() {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Yangi sotuv formasi
  const [showModal, setShowModal] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [materialType, setMaterialType] = useState('KARTON');
  const [weightKg, setWeightKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentType, setPaymentType] = useState('NAQD');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resS, resSt] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/stats')
      ]);
      const sData = await resS.json();
      const stData = await resSt.json();

      setSales(Array.isArray(sData) ? sData : []);
      setStats(stData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Jami summa hisoblash
  const calculatedTotal = Math.max(
    0, 
    (Number(weightKg || 0) * Number(pricePerKg || 0)) - Number(discountAmount || 0)
  );

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName,
          material_type: materialType,
          weight_kg: weightKg,
          price_per_kg: pricePerKg,
          discount_amount: discountAmount,
          payment_type: paymentType,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setBuyerName('');
        setWeightKg('');
        setPricePerKg('');
        setDiscountAmount('0');
        setNotes('');
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* 1. OMBOR QOLDIG'I KARTALARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              📦 Ombordagi Karton
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats?.stock?.karton_kg?.toLocaleString() || 0} <span className="text-sm font-semibold text-slate-500">kg</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
              Jami olingan: {stats?.turnover?.total_karton_bought_kg?.toLocaleString() || 0} kg
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              🛍️ Ombordagi Salafan
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats?.stock?.salafan_kg?.toLocaleString() || 0} <span className="text-sm font-semibold text-slate-500">kg</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
              Jami olingan: {stats?.turnover?.total_salafan_bought_kg?.toLocaleString() || 0} kg
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider block">
              💰 Jami Sotuv Tushumi
            </span>
            <div className="text-2xl font-black mt-1">
              {stats?.financial?.total_sales_income?.toLocaleString() || 0} <span className="text-sm font-normal">so'm</span>
            </div>
            <span className="text-[11px] text-emerald-200 mt-1 block">
              Zavod va xaridorlardan tushgan
            </span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Sotuv</span>
          </button>
        </div>

      </div>

      {/* 2. SOTUVLAR TARIXI JADVALI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Xomashyo Sotuvlari Tarixi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Qayta ishlash zavodlariga va ulgurji xaridorlarga topshirilgan xomashyolar
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Yuklanmoqda...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            Hozircha xomashyo sotuvlari kiritilmagan. "Yangi Sotuv" tugmasini bosing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Sana</th>
                  <th className="py-3 px-4 font-bold">Xaridor / Zavod</th>
                  <th className="py-3 px-4 font-bold">Xomashyo turi</th>
                  <th className="py-3 px-4 font-bold">Vazni (kg)</th>
                  <th className="py-3 px-4 font-bold">1 kg narxi</th>
                  <th className="py-3 px-4 font-bold">Skidka</th>
                  <th className="py-3 px-4 font-bold">Jami Summa</th>
                  <th className="py-3 px-4 font-bold">To'lov</th>
                  <th className="py-3 px-4 font-bold">Qayd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-medium whitespace-nowrap text-slate-500">{s.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.buyer_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        s.material_type === 'KARTON' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {s.material_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{s.weight_kg?.toLocaleString()} kg</td>
                    <td className="py-3 px-4">{s.price_per_kg?.toLocaleString()} so'm</td>
                    <td className="py-3 px-4 text-rose-600 font-semibold">
                      {s.discount_amount > 0 ? `-${s.discount_amount.toLocaleString()} so'm` : '0'}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700 text-sm whitespace-nowrap">
                      {s.total_amount?.toLocaleString()} so'm
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                        {s.payment_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate">{s.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* YANGI SOTUV MODALI */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                Xomashyoni Sotish (Zavod/Xaridorga)
              </h3>
              <p className="text-xs text-slate-500">
                Vazn, narx va agar skidka berilgan bo'lsa uni kiriting
              </p>
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xaridor / Zavod nomi *
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Masalan: 'Toshkent Qog'oz Fabrikasi' yoki 'Akbar aka'"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xomashyo turi *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMaterialType('KARTON')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      materialType === 'KARTON'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📦 Karton / Makulatura
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialType('SALAFAN')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      materialType === 'SALAFAN'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🛍️ Salafan / Paket
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vazni (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="Masalan: 450"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1 kg narxi (so'm) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(e.target.value)}
                    placeholder="Masalan: 2200"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              {/* Skidka (Chegirma) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Skidka / Chegirma summasi (so'mda, ixtiyoriy):
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="Masalan: 20000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Jami tushum */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Jami hisoblangan tushum:</span>
                <span className="text-lg font-black text-emerald-700">
                  {calculatedTotal.toLocaleString()} so'm
                </span>
              </div>

              {/* To'lov usuli */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To'lov shakli:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['NAQD', 'KARTA', 'PERECHISLENIYE'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaymentType(type)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition ${
                        paymentType === type 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Izoh / Qayd:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition"
                >
                  Sotuvni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
