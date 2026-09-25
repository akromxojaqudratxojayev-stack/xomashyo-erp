import React from 'react';
import { 
  Truck, 
  Store, 
  TrendingUp, 
  Wallet, 
  Settings, 
  LogOut, 
  UserCheck,
  FileCheck
} from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onLogout }) {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'hisobchi':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">💰 Hisobchi</span>;
      case 'dastafchik':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">🚚 Dastafchik</span>;
      case 'admin':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">👑 Admin</span>;
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'dastafka', label: 'Dastafka & Gaz', icon: Truck },
    { id: 'stores', label: 'Do\'konlar', icon: Store },
    { id: 'sales', label: 'Sotuv', icon: TrendingUp },
    { id: 'finance', label: 'Kassa & Moliya', icon: Wallet },
    { id: 'reconciliation', label: 'Sverka (Oyni Yopish)', icon: FileCheck },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo va Tizim nomi */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-slate-900 block leading-tight">
                Xomashyo ERP
              </span>
              <span className="text-xs text-slate-500 hidden sm:block">
                Karton & Salafan Boshqaruvi
              </span>
            </div>
          </div>

          {/* Desktop Navigatsiya tugmalari */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Foydalanuvchi ma'lumoti va Chiqish */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 flex items-center justify-end space-x-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>{currentUser.name}</span>
              </div>
              <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
            </div>

            <button
              onClick={onLogout}
              title="Chiqish"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobil pastki / yuqori navigatsiya paneli */}
      <div className="md:hidden border-t border-slate-200 bg-slate-50/80 px-2 py-1.5 flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
                isActive ? 'text-emerald-700 bg-emerald-100/70' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
