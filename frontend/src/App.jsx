import React, { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Kitchen from "./pages/Kitchen";
import Menu from "./pages/Menu";
import { api } from "./api";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState("--:--:--");

  const [cabangList, setCabangList] = useState([]);
  const [activeCabangId, setActiveCabangId] = useState("");

  // Common UI State
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);

    // Initial fetch
    fetchMetadata();

    return () => clearInterval(timer);
  }, []);

  // Also poll for active orders specifically
  useEffect(() => {
    let poll = setInterval(() => {
      if (activeCabangId !== undefined) {
        checkActiveOrders();
      }
    }, 10000);
    return () => clearInterval(poll);
  }, [activeCabangId]);

  const fetchMetadata = async () => {
    const cs = await api.getCabang();
    if (cs && cs.status === 'success') {
      setCabangList(cs.data);
    }
    checkActiveOrders();
  };

  const checkActiveOrders = async () => {
    const res = await api.getOrders();
    if (res && res.status === 'success') {
      const cnt = res.data.filter(o => ['draft', 'confirmed', 'preparing', 'ready'].includes(o.state)).length;
      setActiveOrdersCount(cnt);
    }
  };

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "pos", icon: "🛒", label: "Kasir (POS)" },
    { id: "orders", icon: "📋", label: "Order List", badge: activeOrdersCount },
    { id: "kitchen", icon: "👨‍🍳", label: "Kitchen Display" },
    { id: "menu", icon: "📖", label: "Kelola Menu" },
  ];

  return (
    // PERBAIKAN: Menggunakan div dengan flexbox h-screen untuk mengatur layout menyamping
    <div className="flex h-screen w-full overflow-hidden">

      {/* Sidebar */}
      <aside
        className={`sidebar w-[260px] bg-white border-r border-slate-200 flex flex-col shrink-0 absolute md:relative transition-transform duration-300 z-[100] h-full ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-orange-400 flex items-center justify-center text-xl shadow-lg shadow-brand-500/30 text-white">
              🍽️
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm tracking-tight leading-tight">Warung Nusantara</h1>
              <span className="text-brand-600 text-[10px] font-bold uppercase tracking-widest">POS System</span>
            </div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-600" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        {/* Branch Selector */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cabang Aktif (Filter)</label>
          <select
            value={activeCabangId}
            onChange={(e) => setActiveCabangId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all">
            <option value="">Semua Cabang (Global)</option>
            {cabangList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-medium text-slate-500">Odoo Connected</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors group ${activePage === item.id ? "bg-brand-50 text-brand-600" : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <span className={`text-lg ${activePage === item.id ? "text-brand-500" : ""}`}>{item.icon}</span>
              <span className={`flex-1 text-left ${activePage === item.id ? "font-semibold text-brand-600" : ""}`}>
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-brand-100 text-brand-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-lg">👤</div>
            <div>
              <div className="text-sm font-bold text-slate-700">Administrator</div>
              <div className="text-xs text-slate-500 font-medium">Session Aktif</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      {/* PERBAIKAN: Menggunakan h-full karena wrapper utamanya sudah h-screen */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-slate-50 text-slate-800">
        {/* Top Bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-6 shrink-0 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="md:hidden flex flex-col gap-1 p-2" onClick={() => setSidebarOpen(true)}>
              <span className="w-5 h-0.5 bg-slate-600 rounded"></span>
              <span className="w-5 h-0.5 bg-slate-600 rounded"></span>
              <span className="w-5 h-0.5 bg-slate-600 rounded"></span>
            </button>
            <div className="text-xl font-bold tracking-tight text-slate-800 capitalize">
              {activePage === "pos" ? "Kasir (POS)" : activePage.replace("-", " ")}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-600 tracking-wider">
              {time}
            </div>
            <div className="relative cursor-pointer p-2 hover:bg-slate-100 rounded-full transition-colors">
              <span className="text-xl">🔔</span>
              {activeOrdersCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {activeOrdersCount}
              </span>}
            </div>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          {activePage === "dashboard" && <Dashboard cabangId={activeCabangId} />}
          {activePage === "pos" && <POS cabangList={cabangList} activeCabangId={activeCabangId} />}
          {activePage === "orders" && <Orders cabangId={activeCabangId} />}
          {activePage === "kitchen" && <Kitchen cabangId={activeCabangId} />}
          {activePage === "menu" && <Menu cabangId={activeCabangId} />}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

    </div>
  );
}