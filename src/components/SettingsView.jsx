import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Check, Fuel } from 'lucide-react';

export default function SettingsView({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  const [kartonPrice, setKartonPrice] = useState('');
  const [salafanPrice, setSalafanPrice] = useState('');
  const [gasRefillPrice, setGasRefillPrice] = useState('');
  const [gasRefillKm, setGasRefillKm] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resSet, resU] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/users')
      ]);

      const set = await resSet.json();
      const u = await resU.json();

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
        setTimeout(() => setSaveSuccess(false), 3000);
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      alert("Parol kamida 4 ta belgi bo'lishi kerak");
      return;
    }
    try {
      const res = await fetch(`/api/users/${selectedUserId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg("Parol muvaffaqiyatli o'zgartirildi");
        setNewPassword('');
        setTimeout(() => setPasswordMsg(''), 3000);
      } else {
        alert(data.error || 'Xatolik');
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-10 font-bold text-slate-500">Yuklanmoqda...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-black text-slate-800 flex items-center space-x-2">
        <Settings className="w-7 h-7 text-indigo-600" />
        <span>Sozlamalar va Parollar</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>Asosiy Narxlar va Sozlamalar</span>
          </h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Karton olish narxi (so'm)</label>
                <input type="number" value={kartonPrice} onChange={(e) => setKartonPrice(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salafan olish narxi (so'm)</label>
                <input type="number" value={salafanPrice} onChange={(e) => setSalafanPrice(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center space-x-2 mb-2">
                <Fuel className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-800">Gaz Kalkulyatori</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Zapravka (so'm)</label>
                  <input type="number" value={gasRefillPrice} onChange={(e) => setGasRefillPrice(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Necha km?</label>
                  <input type="number" value={gasRefillKm} onChange={(e) => setGasRefillKm(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-2">
                {saveSuccess ? <><Check className="w-4 h-4" /><span>Saqlandi!</span></> : <span>Sozlamalarni Saqlash</span>}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Parollar</span>
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordMsg && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl">{passwordMsg}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Xodim:</label>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Yangi parol:</label>
              <input type="text" minLength="4" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Kamida 4 ta belgi" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition">Parolni Yangilash</button>
          </form>
        </div>
      </div>
    </div>
  );
}
