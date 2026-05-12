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
import Dapur from "./pages/Dapur";
import Purchasing from "./pages/Purchasing";
import Pelanggan from "./pages/Pelanggan";
import Cabang from "./pages/Cabang";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activePage, setActivePage] = useState("pos");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState("--:--:--");
  const [cabangList, setCabangList] = useState([]);
  const [activeCabangId, setActiveCabangId] = useState("");
  const [adminViewMode, setAdminViewMode] = useState("global");


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
      setActiveCabangId(parsed.cabang_id);
      
      let normalizedRole = parsed.role === 'kasir' ? 'cashier' : (parsed.role === 'dapur' ? 'kitchen' : parsed.role);
      
      if (normalizedRole === 'cashier') {
        setActivePage("pos");
      } else if (normalizedRole === 'kitchen') {
        setActivePage("dapur");
      } else {
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
    setActivePage("pos");
  };

  const getNavItems = (role) => {
    if ((role === 'owner' || role === 'admin') && adminViewMode === 'manager') {
        return [
          { id: "dashboard", label: "Dashboard Cabang" },
          { id: "pos", label: "Kasir (POS)" },
          { id: "dapur", label: "Layar Dapur (KDS)" },
          { id: "inventory", label: "Stok Etalase Makanan" },
          { id: "bahan_baku", label: "Gudang Bahan Mentah" },
          { id: "purchasing", label: "Pembelian & Supplier" },
          { id: "wastage", label: "Barang Rusak / Wastage" },
          { id: "orders", label: "Riwayat Transaksi" },
          { id: "back_global", label: "⬅️ Kembali Global" }
        ];
    }

    switch (role) {
      case 'owner':
      case 'admin':
        return [
          { id: "dashboard", label: "Dashboard Global" },
          { id: "cabang", label: "Manajemen Cabang" },
          { id: "report", label: "Laporan Keuangan" },
          { id: "menu", label: "Master Menu & Harga" },
          { id: "orders", label: "Riwayat Transaksi" },
          { id: "pelanggan", label: "Pelanggan & Loyalty" },
        ];
      case 'manager':
        return [
          { id: "dashboard", label: "Dashboard Cabang" },
          { id: "pos", label: "Kasir (POS)" },
          { id: "dapur", label: "Layar Dapur (KDS)" },
          { id: "inventory", label: "Stok Etalase Makanan" },
          { id: "bahan_baku", label: "Gudang Bahan Mentah" },
          { id: "purchasing", label: "Pembelian & Supplier" },
          { id: "wastage", label: "Barang Rusak / Wastage" },
          { id: "orders", label: "Riwayat Transaksi" },
        ];
      case 'cashier':
      case 'kasir':
        return [
          { id: "pos", label: "Kasir (POS)" },
          { id: "pelanggan", label: "Pelanggan & Loyalty" },
          { id: "orders", label: "Riwayat Transaksi" },
        ];
      case 'kitchen':
      case 'dapur':
        return [
          { id: "dapur", label: "Layar Dapur (KDS)" },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(userData?.role);

  const pageTitles = {
    dashboard: 'Dashboard Global', dashboard_cabang: 'Dashboard Manajer Cabang', pos: 'Kasir', orders: 'Riwayat Transaksi harian', dapur: 'Dapur (Kitchen Display)',
    inventory: 'Stok Etalase', bahan_baku: 'Bahan Baku Mentah', menu: 'Kelola Menu', report: 'Laporan Keuangan',
    wastage: 'Barang Rusak', purchasing: 'Pembelian & Supplier', pelanggan: 'Pelanggan & Loyalty', cabang: 'Manajemen Cabang'
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={(data) => {
      localStorage.setItem("restoran_user", JSON.stringify(data));
      setUserData(data);
      setIsLoggedIn(true);
      setActiveCabangId(data.cabang_id);
      
      let normalizedRole = data.role === 'kasir' ? 'cashier' : (data.role === 'dapur' ? 'kitchen' : data.role);
      if (normalizedRole === 'cashier') {
        setActivePage("pos");
      } else if (normalizedRole === 'kitchen') {
        setActivePage("dapur");
      } else {
        setActivePage("dashboard");
      }
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

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <button key={item.id}
              onClick={() => { 
                if (item.id === 'back_global') {
                    setAdminViewMode('global');
                    setActivePage('cabang');
                    setSidebarOpen(false);
                    return;
                }
                setActivePage(item.id); 
                setSidebarOpen(false); 
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${item.id === 'back_global' ? 'text-red-500 hover:bg-red-50 font-bold border border-red-100 mt-4' : (activePage === item.id ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100")}`}>
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
            <div className="text-xs text-gray-400 capitalize">Role: {userData?.role}</div>
          </div>
          { (userData?.role === 'owner' || userData?.role === 'admin') ? (
            <button onClick={handleLogout} className="text-sm shadow-sm border border-red-200 text-red-500 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">Logout</button>
          ) : (
            <div className="flex gap-1.5">
               <button onClick={handleLogout} className="text-sm shadow-sm border border-red-200 text-red-500 font-medium transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50" title="Logout & Kembali ke Launcher">🚪 Logout</button>
            </div>
          )}
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
          {activePage === "dashboard" && (userData?.role === 'owner' || userData?.role === 'admin') && adminViewMode === 'global' && <DashboardAdmin cabangId={activeCabangId} onNavigate={(page) => setActivePage(page)} />}
          {activePage === "dashboard" && (userData?.role === 'manager' || ((userData?.role === 'owner' || userData?.role === 'admin') && adminViewMode === 'manager')) && <DashboardCabang cabangId={activeCabangId} />}
          {activePage === "dashboard_cabang" && <DashboardCabang cabangId={activeCabangId} />}
          {activePage === "cabang" && <Cabang onOpenManagerDashboard={(id) => { 
              setActiveCabangId(id); 
              setAdminViewMode("manager");
              setActivePage("dashboard"); 
          }} />}
          {activePage === "pos" && <POS cabangList={cabangList} activeCabangId={activeCabangId} />}
          {activePage === "dapur" && <Dapur cabangId={activeCabangId} />}
          {activePage === "orders" && <Orders cabangId={activeCabangId} userRole={userData?.role} />}
          {activePage === "inventory" && <Inventory activeCabangId={activeCabangId} />}
          {activePage === "bahan_baku" && <BahanBaku cabangId={activeCabangId} />}
          {activePage === "menu" && <Menu cabangId={activeCabangId} />}
          {activePage === "report" && <Report cabangId={activeCabangId} userRole={userData?.role} />}
          {activePage === "wastage" && <Wastage cabangId={activeCabangId} />}
          {activePage === "purchasing" && <Purchasing cabangList={cabangList} activeCabangId={activeCabangId} />}
          {activePage === "pelanggan" && <Pelanggan cabangId={activeCabangId} userRole={userData?.role} />}
        </div>
      </main>

      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-50 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}