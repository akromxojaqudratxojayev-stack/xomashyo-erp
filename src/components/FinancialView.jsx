import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, ShoppingBag, Fuel, DollarSign, Settings, 
  ShieldAlert, Check, Plus, Trash2, Key, AlertTriangle, Edit2, Users, List
} from 'lucide-react';

export default function FinancialView({ currentUser }) {
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [founders, setFounders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('FINANCE');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseDate, setExpenseDate] = useState('');

  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');

  const [showFounderModal, setShowFounderModal] = useState(false);
  const [selectedFounderId, setSelectedFounderId] = useState('');
  const [founderAmount, setFounderAmount] = useState('');
  const [founderNotes, setFounderNotes] = useState('');
  const [founderDate, setFounderDate] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resSt, resExp, resCat, resFounders] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/expenses'),
        fetch('/api/expense-categories'),
        fetch('/api/founders')
      ]);

      const st = await resSt.json();
      const exp = await resExp.json();
      const cat = await resCat.json();
      const fnd = await resFounders.json();

      setStats(st);
      setExpenses(Array.isArray(exp) ? exp : []);
      setExpenseCategories(Array.isArray(cat) ? cat : []);
      setFounders(Array.isArray(fnd) ? fnd : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const method = editingExpense ? 'PUT' : 'POST';
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expenseCategory,
          amount: expenseAmount,
          description: expenseDesc,
          date: expenseDate
        })
      });
      if (res.ok) {
        setShowExpenseModal(false);
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleEditExpense = (exp) => {
    setEditingExpense(exp);
    setExpenseCategory(exp.category);
    setExpenseAmount(exp.amount.toString());
    setExpenseDesc(exp.description || '');
    setExpenseDate(exp.date);
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Rostdan ham ushbu xarajatni o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  const openExpenseModal = () => {
    setEditingExpense(null);
    setExpenseCategory(expenseCategories[0]?.name || 'BOSHQA');
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setShowExpenseModal(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    try {
      const method = editingCat ? 'PUT' : 'POST';
      const url = editingCat ? `/api/expense-categories/${editingCat.id}` : '/api/expense-categories';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName })
      });
      setShowCatModal(false);
      loadData();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleEditCat = (cat) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setShowCatModal(true);
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm("Rostdan ham ushbu toifani o'chirmoqchimisiz?")) return;
    await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' });
    loadData();
  };

  const handleAddDividend = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/founder-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founder_id: selectedFounderId,
          amount: founderAmount,
          notes: founderNotes,
          date: founderDate
        })
      });
      setShowFounderModal(false);
      loadData();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-10 font-bold text-slate-500">Yuklanmoqda...</div>;
  }

  const isProfitPositive = (stats?.financial?.net_profit || 0) >= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { id: 'FINANCE', label: 'Asosiy Hisobotlar', icon: Wallet },
          { id: 'EXPENSES', label: 'Xarajatlar', icon: DollarSign },
          { id: 'CATEGORIES', label: 'Xarajat Toifalari', icon: List },
          { id: 'FOUNDERS', label: "Ta'sischilar", icon: Users }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === t.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'FINANCE' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jami Sotuv (Kirim)</span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl"><TrendingUp className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {stats?.financial?.total_sales_income?.toLocaleString() || 0} <span className="text-xs font-normal">so'm</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Do'konlarga To'langan</span>
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl"><ShoppingBag className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {stats?.financial?.total_purchases_cost?.toLocaleString() || 0} <span className="text-xs font-normal">so'm</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Boshqa Chiqimlar</span>
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl"><Fuel className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {stats?.financial?.total_expenses?.toLocaleString() || 0} <span className="text-xs font-normal">so'm</span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isProfitPositive ? 'bg-indigo-600 border-indigo-700' : 'bg-rose-600 border-rose-700'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Sof Foyda</span>
                <div className="p-2 bg-white/20 text-white rounded-xl"><Wallet className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-black text-white mt-2">
                {stats?.financial?.net_profit?.toLocaleString() || 0} <span className="text-xs font-medium text-indigo-100">so'm</span>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'EXPENSES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Chiqimlar va Xarajatlar Tarixi</span>
            </h3>
            <button onClick={openExpenseModal} className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Xarajat Qo'shish</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Sana</th>
                  <th className="py-3 px-4 font-bold">Toifa</th>
                  <th className="py-3 px-4 font-bold">Izoh</th>
                  <th className="py-3 px-4 font-bold">Summa</th>
                  <th className="py-3 px-4 font-bold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-medium text-slate-500">{exp.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{exp.category}</td>
                    <td className="py-3 px-4 font-medium">{exp.description || '-'}</td>
                    <td className="py-3 px-4 font-extrabold text-rose-600">-{exp.amount?.toLocaleString()} so'm</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => handleEditExpense(exp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'CATEGORIES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Xarajat Toifalari</h3>
            <button onClick={() => { setEditingCat(null); setCatName(''); setShowCatModal(true); }} className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold transition">
              <Plus className="w-3.5 h-3.5" />
              <span>Toifa Qo'shish</span>
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {expenseCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-slate-700 text-xs">{cat.name}</span>
                  <div className="flex space-x-1">
                    <button onClick={() => handleEditCat(cat)} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteCat(cat.id)} className="p-1 text-rose-600 hover:bg-rose-100 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'FOUNDERS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Ta'sischilar Balansi</span>
            </h3>
            <button onClick={() => { setSelectedFounderId(founders[0]?.id || ''); setFounderAmount(''); setFounderNotes(''); setShowFounderModal(true); }} className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Pul Yechish (Divident)</span>
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {founders.map(f => (
              <div key={f.id} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
                <div className="text-indigo-800 font-extrabold text-sm mb-1">{f.name}</div>
                <div className={`text-xl font-black ${f.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {f.balance?.toLocaleString()} <span className="text-xs font-normal">so'm</span>
                </div>
                <div className="text-[10px] text-indigo-400 font-medium uppercase mt-1">Joriy qoldiq</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">{editingExpense ? 'Xarajatni Tahrirlash' : 'Yangi Xarajat'}</h3>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Toifa:</label>
                <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                  {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Summasi (so'm):</label>
                <input type="number" required value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sana:</label>
                <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Izoh:</label>
                <input type="text" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Bekor qilish</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">{editingCat ? 'Toifani Tahrirlash' : 'Yangi Toifa'}</h3>
            <form onSubmit={handleSaveCat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Toifa nomi:</label>
                <input type="text" required value={catName} onChange={(e) => setCatName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Bekor qilish</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFounderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">Pul Yechish (Divident)</h3>
            <form onSubmit={handleAddDividend} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ta'sischi:</label>
                <select value={selectedFounderId} onChange={(e) => setSelectedFounderId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                  {founders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Summa (so'm):</label>
                <input type="number" required value={founderAmount} onChange={(e) => setFounderAmount(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sana:</label>
                <input type="date" required value={founderDate} onChange={(e) => setFounderDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Izoh (ixtiyoriy):</label>
                <input type="text" value={founderNotes} onChange={(e) => setFounderNotes(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setShowFounderModal(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Bekor qilish</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
