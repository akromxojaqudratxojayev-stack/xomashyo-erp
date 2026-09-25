import React, { useState, useEffect } from 'react';
import { Calendar, Filter, CheckCircle, Search, AlertCircle, RefreshCw, Layers } from 'lucide-react';

export default function ReconciliationView() {
  const [deliveries, setDeliveries] = useState([]);
  const [stores, setStores] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterNetwork, setFilterNetwork] = useState('');
  const [filterStoreId, setFilterStoreId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Partner verification (Sverka)
  const [partnerAmount, setPartnerAmount] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resDel, resStores, resClosures] = await Promise.all([
        fetch('/api/reconciliation'), // We created this endpoint
        fetch('/api/stores'),
        fetch('/api/month-closures')
      ]);
      const dataDel = await resDel.json();
      const dataStores = await resStores.json();
      const dataClosures = await resClosures.json();

      setDeliveries(Array.isArray(dataDel) ? dataDel : []);
      setStores(Array.isArray(dataStores) ? dataStores : []);
      setClosures(Array.isArray(dataClosures) ? dataClosures : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Set default dates for current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const handleCloseMonth = async () => {
    if (!window.confirm("Haqiqatan ham oyni yopmoqchimisiz? Barcha hisobotlar joriy sanadan boshlab noldan hisoblanadi.")) {
      return;
    }
    try {
      const res = await fetch('/api/month-closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          closure_date: new Date().toISOString().split('T')[0],
          closed_by: 'Admin'
        })
      });
      if (res.ok) {
        alert("Oy muvaffaqiyatli yopildi!");
        loadData();
      }
    } catch (err) {
      alert("Xatolik yuz berdi: " + err.message);
    }
  };

  // Filtrlangaan ma'lumotlar
  let filtered = deliveries.filter(d => {
    if (startDate && d.date < startDate) return false;
    if (endDate && d.date > endDate) return false;
    if (filterNetwork && d.network_name !== filterNetwork) return false;
    if (filterStoreId && d.store_id.toString() !== filterStoreId) return false;
    return true;
  });

  const totalKarton = filtered.reduce((acc, curr) => acc + (curr.karton_kg || 0), 0);
  const totalSalafan = filtered.reduce((acc, curr) => acc + (curr.salafan_kg || 0), 0);
  const totalSum = filtered.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

  const partnerDiff = partnerAmount ? parseFloat(partnerAmount) - totalSum : null;

  // Unikal tarmoqlar (networks)
  const networks = [...new Set(stores.map(s => s.network_name).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-black text-slate-800 flex items-center space-x-2">
          <Layers className="w-7 h-7 text-indigo-600" />
          <span>Sverka va Oyni Yopish</span>
        </h2>
        <button 
          onClick={handleCloseMonth}
          className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition"
        >
          <AlertCircle className="w-5 h-5" />
          <span>Joriy Oyni Yopish (Nollash)</span>
        </button>
      </div>

      {closures.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between text-amber-800">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm">Oxirgi marta oy yopilgan sana: {closures[0].closure_date}</span>
          </div>
          <span className="text-xs font-semibold">Tizim shu sanadan boshlab qoldiqlarni hisoblamoqda</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* FILTERS */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Filtrlar</span>
            </h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Davr (Dan - Gacha)</label>
              <div className="flex space-x-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tarmoq (Tarmoqli do'konlar)</label>
              <select value={filterNetwork} onChange={e => { setFilterNetwork(e.target.value); setFilterStoreId(''); }} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <option value="">-- Barchasi --</option>
                {networks.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Muayyan Do'kon</label>
              <select value={filterStoreId} onChange={e => setFilterStoreId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <option value="">-- Barchasi --</option>
                {stores.filter(s => filterNetwork ? s.network_name === filterNetwork : true).map(s => <option key={s.id} value={s.id}>{s.name} {s.network_name ? `(${s.network_name})` : ''}</option>)}
              </select>
            </div>
          </div>

          {/* SVERKA KALKULYATORI */}
          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-indigo-900 border-b border-indigo-200 pb-2 flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Sverka (Solishtirish)</span>
            </h3>
            <div>
              <label className="block text-xs font-semibold text-indigo-800 mb-1">Hamkor da'vo qilayotgan summa:</label>
              <input 
                type="number" 
                value={partnerAmount} 
                onChange={e => setPartnerAmount(e.target.value)} 
                placeholder="Summani kiriting..."
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-black text-indigo-900" 
              />
            </div>
            
            {partnerDiff !== null && (
              <div className={`mt-4 p-3 rounded-xl border ${partnerDiff === 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : (partnerDiff > 0 ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-rose-100 border-rose-300 text-rose-800')}`}>
                <div className="text-xs font-bold uppercase mb-1">Farq (Sverka):</div>
                <div className="text-lg font-black">
                  {partnerDiff > 0 ? '+' : ''}{partnerDiff.toLocaleString()} so'm
                </div>
                <div className="text-[10px] mt-1 font-medium">
                  {partnerDiff === 0 ? "Hisob-kitob to'g'ri (0)" : (partnerDiff > 0 ? "Hamkor ko'p so'rayapti" : "Hamkor kam so'rayapti (Biz qarzmiz)")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS */}
        <div className="md:col-span-3 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Jami Karton</div>
              <div className="text-xl font-black text-amber-600">{totalKarton} kg</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Jami Salafan</div>
              <div className="text-xl font-black text-blue-600">{totalSalafan} kg</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm text-center">
              <div className="text-[10px] font-bold text-slate-300 uppercase">Jami Summa (Biz bo'yicha)</div>
              <div className="text-xl font-black text-white">{totalSum.toLocaleString()} so'm</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 shadow-sm">
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4 font-bold">Sana</th>
                    <th className="py-3 px-4 font-bold">Do'kon (Tarmoq)</th>
                    <th className="py-3 px-4 font-bold">Karton</th>
                    <th className="py-3 px-4 font-bold">Salafan</th>
                    <th className="py-3 px-4 font-bold text-right">Summa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center font-medium text-slate-400">Bu davrda hech qanday ma'lumot topilmadi</td>
                    </tr>
                  ) : (
                    filtered.map((d, i) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-medium text-slate-500">{d.date}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          {d.store_name}
                          {d.network_name && <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] rounded uppercase">{d.network_name}</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          {d.karton_kg > 0 ? (
                            <div>
                              <span className="font-bold">{d.karton_kg} kg</span>
                              <span className="text-[9px] text-slate-400 ml-1">x {d.karton_price}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          {d.salafan_kg > 0 ? (
                            <div>
                              <span className="font-bold">{d.salafan_kg} kg</span>
                              <span className="text-[9px] text-slate-400 ml-1">x {d.salafan_price}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-extrabold text-emerald-700">
                          {d.total_price?.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
