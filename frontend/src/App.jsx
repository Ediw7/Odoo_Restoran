import React, { useState, useEffect } from "react";
import { api } from "./api";

import Login from "./pages/Login";
import DashboardCabang from "./pages/DashboardCabang";
import DashboardAdmin from "./pages/Dashboard";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Kitchen from "./pages/Kitchen";
import Menu from "./pages/Menu";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);


  const [activePage, setActivePage] = useState("pos");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState("--:--:--");

  const [cabangList, setCabangList] = useState([]);
  const [activeCabangId, setActiveCabangId] = useState("");
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchMetadata();
      let poll = setInterval(() => checkActiveOrders(), 10000);
      return () => clearInterval(poll);
    }
  }, [isLoggedIn, activeCabangId]);

  const fetchMetadata = async () => {
    const cs = await api.getCabang();
    if (cs?.status === 'success') {
      setCabangList(cs.data);
    }
    checkActiveOrders();
  };

  const checkActiveOrders = async () => {
    const res = await api.getOrders();
    if (res?.status === 'success') {
      let data = res.data;
      if (activeCabangId) {
        data = data.filter(o => o.cabang.id === parseInt(activeCabangId));
      }
      const cnt = data.filter(o => ['draft', 'confirmed', 'preparing', 'ready'].includes(o.state)).length;
      setActiveOrdersCount(cnt);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    setActiveCabangId("");
  };

  // Dinamis: Menu tergantung Role (Kasir vs Admin)
  const navItems = userData?.role === 'admin'
    ? [
      { id: "dashboard", icon: "🏢", label: "Pusat Kendali" },
      { id: "menu", icon: "📖", label: "Kelola Menu" }
    ]
    : [
      { id: "dashboard", icon: "📊", label: "Ringkasan Hari Ini" },
      { id: "pos", icon: "🛒", label: "Kasir (POS)" },
      { id: "orders", icon: "📋", label: "Order List", badge: activeOrdersCount },
      { id: "kitchen", icon: "👨‍🍳", label: "Kitchen Display" },
    ];

  // 1. Tampilkan Layar Login Jika Belum Masuk
  if (!isLoggedIn) {
    return <Login onLoginSuccess={(data) => {
      setUserData(data);
      setIsLoggedIn(true);


      if (data.role === 'cashier') {
        setActiveCabangId(data.cabang_id);
        setActivePage("pos");
        setActivePage("dashboard");
      }
    }} />;
  }


  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-800">
      <aside className={`w-[260px] bg-white border-r border-slate-200 flex flex-col shrink-0 absolute md:relative transition-transform duration-300 z-[100] h-full ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-xl shadow-sm">🍽️</div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm tracking-tight">Warung Nusantara</h1>
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">POS System</span>
            </div>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cabang Aktif</label>
          {userData?.role === 'admin' ? (
            <select
              value={activeCabangId}
              onChange={(e) => setActiveCabangId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 outline-none cursor-pointer">
              <option value="">Semua Cabang (Global)</option>
              {cabangList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div className="w-full bg-slate-200/50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 flex justify-between cursor-not-allowed">
              <span>{userData?.cabang_name || 'Tidak Ada'}</span>
              <span className="text-[10px] text-red-500 uppercase tracking-widest">Terkunci</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activePage === item.id ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {item.badge > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activePage === item.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-lg">👤</div>
            <div>
              <div className="text-sm font-bold text-slate-700">{userData?.name}</div>
              <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {userData?.role || 'CASHIER'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">🚪</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-6 shrink-0 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="md:hidden flex flex-col gap-1 p-2" onClick={() => setSidebarOpen(true)}>
              <span className="w-5 h-0.5 bg-slate-600 rounded"></span><span className="w-5 h-0.5 bg-slate-600 rounded"></span><span className="w-5 h-0.5 bg-slate-600 rounded"></span>
            </button>
            <div className="text-xl font-bold tracking-tight text-slate-800 capitalize">
              {activePage === "pos" ? "Kasir (POS)" : activePage === "dashboard" && userData?.role === 'cashier' ? "Ringkasan Hari Ini" : activePage.replace("-", " ")}
            </div>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-600 tracking-wider">{time}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Cek role untuk load Dashboard yang tepat */}
          {activePage === "dashboard" && userData?.role === 'admin' && <DashboardAdmin cabangId={activeCabangId} />}
          {activePage === "dashboard" && userData?.role === 'cashier' && <DashboardCabang cabangId={activeCabangId} />}

          {activePage === "pos" && <POS cabangList={cabangList} activeCabangId={activeCabangId} />}
          {activePage === "orders" && <Orders cabangId={activeCabangId} />}
          {activePage === "kitchen" && <Kitchen cabangId={activeCabangId} />}
          {activePage === "menu" && <Menu cabangId={activeCabangId} />}
        </div>
      </main>
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}