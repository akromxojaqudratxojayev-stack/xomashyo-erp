import React, { useState, useEffect } from 'react';
import { Truck, ArrowRightCircle, Plus, FileText, CheckCircle, Edit2, Trash2 } from 'lucide-react';

export default function SalesView() {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [buyerName, setBuyerName] = useState('');
  const [materialType, setMaterialType] = useState('KARTON');
  const [weightKg, setWeightKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentType, setPaymentType] = useState('NAQD');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resSales, resStats] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/stats')
      ]);
      const dataSales = await resSales.json();
      const dataStats = await resStats.json();
      
      setSales(Array.isArray(dataSales) ? dataSales : []);
      setStats(dataStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingSale(null);
    setBuyerName('');
    setMaterialType('KARTON');
    setWeightKg('');
    setPricePerKg('');
    setDiscountAmount('0');
    setPaymentType('NAQD');
    setNotes('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setBuyerName(sale.buyer_name);
    setMaterialType(sale.material_type);
    setWeightKg(sale.weight_kg.toString());
    setPricePerKg(sale.price_per_kg.toString());
    setDiscountAmount((sale.discount_amount || 0).toString());
    setPaymentType(sale.payment_type || 'NAQD');
    setNotes(sale.notes || '');
    setSaleDate(sale.date);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Rostdan ham ushbu sotuvni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        buyer_name: buyerName,
        material_type: materialType,
        weight_kg: weightKg,
        price_per_kg: pricePerKg,
        discount_amount: discountAmount,
        payment_type: paymentType,
        notes,
        date: saleDate
      };
      const url = editingSale ? `/api/sales/${editingSale.id}` : '/api/sales';
      const method = editingSale ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        loadData();
      } else {
        const d = await res.json();
        alert(d.error || 'Xatolik');
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const w = parseFloat(weightKg) || 0;
  const p = parseFloat(pricePerKg) || 0;
  const d = parseFloat(discountAmount) || 0;
  const calculatedTotal = Math.max(0, (w * p) - d);

  if (loading) {
    return <div className="text-center py-10 font-bold text-slate-500">Yuklanmoqda...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center space-x-2">
            <ArrowRightCircle className="w-7 h-7 text-emerald-600" />
            <span>Sotuvlar (Zavod/Xaridor)</span>
          </h2>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition transform active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Yangi Sotuv Kiritish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">Ombor Qoldig'i</span>
            <div className="text-xl font-black text-slate-800 mt-1">
              Karton: <span className="text-amber-600">{stats?.warehouse?.karton_kg || 0} kg</span>
            </div>
          </div>
          <Truck className="w-8 h-8 text-slate-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">Ombor Qoldig'i</span>
            <div className="text-xl font-black text-slate-800 mt-1">
              Salafan: <span className="text-blue-600">{stats?.warehouse?.salafan_kg || 0} kg</span>
            </div>
          </div>
          <Truck className="w-8 h-8 text-slate-200" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Sotuvlar Tarixi</span>
          </h3>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">Hozircha hech qanday sotuv amalga oshirilmagan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Sana</th>
                  <th className="py-3 px-4 font-bold">Xaridor</th>
                  <th className="py-3 px-4 font-bold">Mahsulot</th>
                  <th className="py-3 px-4 font-bold">Vazn / Narx</th>
                  <th className="py-3 px-4 font-bold">Skidka</th>
                  <th className="py-3 px-4 font-bold">Jami summa</th>
                  <th className="py-3 px-4 font-bold">To'lov</th>
                  <th className="py-3 px-4 font-bold">Izoh</th>
                  <th className="py-3 px-4 font-bold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-xs font-semibold text-slate-500">{s.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{s.buyer_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide ${s.material_type === 'KARTON' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {s.material_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-700">{s.weight_kg} kg</div>
                      <div className="text-[10px] text-slate-500 font-medium">{s.price_per_kg?.toLocaleString()} so'm/kg</div>
                    </td>
                    <td className="py-3 px-4 text-rose-600 font-bold text-xs">{s.discount_amount > 0 ? `-${s.discount_amount.toLocaleString()} so'm` : '0'}</td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700 text-sm whitespace-nowrap">{s.total_amount?.toLocaleString()} so'm</td>
                    <td className="py-3 px-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">{s.payment_type}</span></td>
                    <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate text-xs">{s.notes || '-'}</td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => handleEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">{editingSale ? 'Sotuvni Tahrirlash' : 'Xomashyoni Sotish (Zavod/Xaridorga)'}</h3>
            </div>
            <form onSubmit={handleSaleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Xaridor / Zavod nomi *</label>
                <input type="text" required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Xomashyo turi *</label>
                  <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                    <option value="KARTON">Karton / Makulatura</option>
                    <option value="SALAFAN">Salafan / Paket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sana *</label>
                  <input type="date" required value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vazni (kg) *</label>
                  <input type="number" step="0.1" min="0" required value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">1 kg narxi (so'm) *</label>
                  <input type="number" min="0" required value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Skidka (Chegirma) summasi:</label>
                <input type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Jami hisoblangan:</span>
                <span className="text-lg font-black text-emerald-700">{calculatedTotal.toLocaleString()} so'm</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To'lov shakli:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['NAQD', 'KARTA', 'PERECHISLENIYE'].map((type) => (
                    <button key={type} type="button" onClick={() => setPaymentType(type)} className={`py-1.5 text-[11px] font-bold rounded-lg border ${paymentType === type ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Izoh / Qayd:</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Bekor qilish</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
