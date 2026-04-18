import React, { useState, useEffect } from "react";
import { api } from "./api";

import Login from "./pages/Login";
import DashboardCabang from "./pages/DashboardCabang";
import DashboardAdmin from "./pages/Dashboard";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Inventory from "./pages/Inventory";
import BahanBaku from "./pages/BahanBaku";
import Report from "./pages/Report";
import Wastage from "./pages/Wastage";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activePage, setActivePage] = useState("pos");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState("--:--:--");
  const [cabangList, setCabangList] = useState([]);
  const [activeCabangId, setActiveCabangId] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("restoran_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUserData(parsed);
      setIsLoggedIn(true);
      if (parsed.role === 'cashier') {
        setActiveCabangId(parsed.cabang_id);
        setActivePage("dashboard");
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchMetadata();
    }
  }, [isLoggedIn, activeCabangId]);

  const fetchMetadata = async () => {
    const cs = await api.getCabang();
    if (cs?.status === 'success') setCabangList(cs.data);
  };

  const handleLogout = () => {
    localStorage.removeItem("restoran_user");
    setIsLoggedIn(false);
    setUserData(null);
    setActiveCabangId("");
  };

  const navItems = userData?.role === 'admin'
    ? [
      { id: "dashboard", label: "Dashboard" },
      { id: "menu", label: "Kelola Menu" }
    ]
    : [
      { id: "dashboard", label: "Dashboard" },
      { id: "pos", label: "Kasir" },
      { id: "orders", label: "Riwayat Transaksi" },
      { id: "inventory", label: "Stok Etalase" },
      { id: "bahan_baku", label: "Gudang Bahan" },
      { id: "wastage", label: "Barang Rusak" },
      { id: "report", label: "Laporan" },
    ];

  const pageTitles = {
    dashboard: 'Dashboard', pos: 'Kasir', orders: 'Riwayat Transaksi harian',
    inventory: 'Stok Etalase', bahan_baku: 'Bahan Baku Mentah', menu: 'Kelola Menu', report: 'Laporan Keuangan',
    wastage: 'Barang Rusak'
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={(data) => {
      localStorage.setItem("restoran_user", JSON.stringify(data));
      setUserData(data); setIsLoggedIn(true);
      if (data.role === 'cashier') { setActiveCabangId(data.cabang_id); setActivePage("dashboard"); }
    }} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className={`w-[220px] bg-white border-r border-gray-100 flex flex-col shrink-0 absolute md:relative transition-transform duration-300 z-[100] h-full ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-5 border-b border-gray-100">
          <h1 className="font-bold text-gray-800 text-base">Warung Nusantara</h1>
          <p className="text-gray-400 text-xs mt-0.5">POS System</p>
        </div>

        <div className="p-3 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-400 mb-1.5 px-1">Cabang</label>
          {userData?.role === 'admin' ? (
            <select value={activeCabangId} onChange={(e) => setActiveCabangId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none cursor-pointer">
              <option value="">Semua Cabang</option>
              {cabangList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600">
              {userData?.cabang_name || '-'}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <button key={item.id}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activePage === item.id ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}>
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activePage === item.id ? "bg-white/30 text-white" : "bg-gray-100 text-gray-500"}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 flex justify-between items-center">
          <div>
            <div className="text-sm font-semibold text-gray-700">{userData?.name}</div>
            <div className="text-xs text-gray-400 capitalize">{userData?.role || 'kasir'}</div>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50">Keluar</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 shrink-0 justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="md:hidden flex flex-col gap-1 p-2" onClick={() => setSidebarOpen(true)}>
              <span className="w-4 h-0.5 bg-gray-600 rounded"></span><span className="w-4 h-0.5 bg-gray-600 rounded"></span><span className="w-4 h-0.5 bg-gray-600 rounded"></span>
            </button>
            <h2 className="text-base font-semibold text-gray-800">{pageTitles[activePage] || activePage}</h2>
          </div>
          <div className="text-sm text-gray-400 font-medium">{time}</div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {activePage === "dashboard" && userData?.role === 'admin' && <DashboardAdmin cabangId={activeCabangId} />}
          {activePage === "dashboard" && userData?.role === 'cashier' && <DashboardCabang cabangId={activeCabangId} />}
          {activePage === "pos" && <POS cabangList={cabangList} activeCabangId={activeCabangId} />}
          {activePage === "orders" && <Orders cabangId={activeCabangId} />}
          {activePage === "inventory" && <Inventory activeCabangId={activeCabangId} />}
          {activePage === "bahan_baku" && <BahanBaku />}
          {activePage === "menu" && <Menu cabangId={activeCabangId} />}
          {activePage === "report" && <Report cabangId={activeCabangId} />}
          {activePage === "wastage" && <Wastage cabangId={activeCabangId} />}
        </div>
      </main>

      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-50 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}