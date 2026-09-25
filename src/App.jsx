import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import DastafkaView from './components/DastafkaView';
import AdminStoresView from './components/AdminStoresView';
import SalesView from './components/SalesView';
import FinancialView from './components/FinancialView';
import ReconciliationView from './components/ReconciliationView';
import SettingsView from './components/SettingsView';
import { Download, Smartphone } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('xomashyo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dastafka');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'dastafchik') {
        setActiveTab('dastafka');
      } else if (currentUser.role === 'hisobchi') {
        setActiveTab('finance');
      } else if (currentUser.role === 'admin') {
        setActiveTab('stores');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('xomashyo_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      
      {showInstallBanner && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center justify-between shadow-md text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-emerald-300" />
            <span>Ilovani telefoningiz ekraniga (APK kabi) o'rnatib olishingiz mumkin!</span>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1 bg-white text-emerald-800 font-bold rounded-lg text-xs hover:bg-emerald-50 transition shadow"
          >
            O'rnatish
          </button>
        </div>
      )}

      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16 md:pb-8">
        {activeTab === 'dastafka' && <DastafkaView currentUser={currentUser} />}
        {activeTab === 'stores' && <AdminStoresView currentUser={currentUser} />}
        {activeTab === 'sales' && <SalesView currentUser={currentUser} />}
        {activeTab === 'finance' && <FinancialView currentUser={currentUser} />}
        {activeTab === 'settings' && <SettingsView currentUser={currentUser} />}
        {activeTab === 'reconciliation' && <ReconciliationView />}
      </main>

    </div>
  );
}
