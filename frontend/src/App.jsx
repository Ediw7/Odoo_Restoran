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
  const [stationMode, setStationMode] = useState(null);
  const [isDeviceLoggedIn, setIsDeviceLoggedIn] = useState(false);
  const [deviceData, setDeviceData] = useState(null);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalRole, setLoginModalRole] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);


  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedDevice = localStorage.getItem("restoran_device");
    const savedUser = localStorage.getItem("restoran_user");
    
    if (savedDevice) {
      setDeviceData(JSON.parse(savedDevice));
      setIsDeviceLoggedIn(true);
    }
    
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUserData(parsed);
      setIsLoggedIn(true);
      setActiveCabangId(parsed.cabang_id);
      
      if (parsed.role === 'cashier' || parsed.role === 'kasir') {
        setActivePage("pos");
      } else if (parsed.role === 'kitchen' || parsed.role === 'dapur') {
        setActivePage("dapur");
      } else if (parsed.role === 'manager') {
        setActivePage("dashboard");
      } else if (parsed.role === 'owner' || parsed.role === 'admin') {
        setActivePage("dashboard");
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn || isDeviceLoggedIn) {
      fetchMetadata();
    }
  }, [isLoggedIn, isDeviceLoggedIn, activeCabangId]);

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
  
  const handleDeviceLogout = () => {
    localStorage.removeItem("restoran_device");
    localStorage.removeItem("restoran_user");
    setIsDeviceLoggedIn(false);
    setDeviceData(null);
    setIsLoggedIn(false);
    setUserData(null);
  };

  const handleSubLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await api.login(loginForm.username, loginForm.password);
      if (res?.status === 'success') {
        const data = res.data;
        // Optionally verify role matches loginModalRole, but we let them in anyway if credentials are valid
        localStorage.setItem("restoran_user", JSON.stringify(data));
        setUserData(data);
        setIsLoggedIn(true);
        setActiveCabangId(data.cabang_id);
        
        if (data.role === 'cashier' || data.role === 'kasir') setActivePage('pos');
        else if (data.role === 'kitchen' || data.role === 'dapur') setActivePage('dapur');
        else if (data.role === 'manager') setActivePage('dashboard');
        else setActivePage('pos');
        
        setShowLoginModal(false);
        setLoginForm({username: '', password: ''});
      } else {
        setLoginError(res?.message || "Username / Password salah");
      }
    } catch {
      setLoginError("Gagal terhubung ke server");
    }
    setIsLoggingIn(false);
  };

  const getNavItems = (role) => {
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
    dashboard: 'Dashboard', pos: 'Kasir', orders: 'Riwayat Transaksi harian', dapur: 'Dapur (Kitchen Display)',
    inventory: 'Stok Etalase', bahan_baku: 'Bahan Baku Mentah', menu: 'Kelola Menu', report: 'Laporan Keuangan',
    wastage: 'Barang Rusak', purchasing: 'Pembelian & Supplier', pelanggan: 'Pelanggan & Loyalty', cabang: 'Manajemen Cabang'
  };

  if (!isDeviceLoggedIn && !isLoggedIn) {
    return <Login onLoginSuccess={(data) => {
      if (data.role === 'owner' || data.role === 'admin') {
        // Admin goes straight in
        localStorage.setItem("restoran_user", JSON.stringify(data));
        setUserData(data);
        setIsLoggedIn(true);
        setActiveCabangId(data.cabang_id);
        setActivePage('dashboard');
      } else {
        // Branch logs into Launcher
        localStorage.setItem("restoran_device", JSON.stringify(data));
        setDeviceData(data);
        setIsDeviceLoggedIn(true);
      }
    }} />;
  }

  // --- RENDERING LAUNCHER (If Device logged in but no specific staff logged in) ---
  if (isDeviceLoggedIn && !isLoggedIn && userData?.role !== 'owner' && userData?.role !== 'admin') {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Warung Nusantara</h1>
              <p className="text-sm text-gray-400 mt-0.5">Pilih stasiun kerja — {deviceData?.cabang_name || "Pusat"}</p>
            </div>
            <button onClick={handleDeviceLogout}
              className="text-xs font-semibold text-gray-400 hover:text-red-500 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors">
              Logout Device
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">

            <button onClick={() => { setLoginModalRole("Kasir"); setShowLoginModal(true); }}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left shadow-sm hover:shadow-md hover:border-orange-200 transition-all group">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-sm font-black text-orange-500">POS</span>
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Kasir (POS)</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Input pesanan, bayar & cetak struk.</p>
              <div className="mt-4 text-xs font-semibold text-orange-400 group-hover:text-orange-500 transition-colors">Login Kasir &rarr;</div>
            </button>

            <button onClick={() => { setLoginModalRole("Dapur"); setShowLoginModal(true); }}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left shadow-sm hover:shadow-md hover:border-orange-200 transition-all group">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-sm font-black text-orange-500">KDS</span>
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Layar Dapur</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Antrean dan status masak real-time.</p>
              <div className="mt-4 text-xs font-semibold text-orange-400 group-hover:text-orange-500 transition-colors">Login Dapur &rarr;</div>
            </button>

            <button onClick={() => { setLoginModalRole("Manager"); setShowLoginModal(true); }}
              className="bg-orange-500 hover:bg-orange-600 border border-orange-500 rounded-2xl p-6 text-left shadow-sm hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-xs font-black text-white">MGR</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">Manajer / Gudang</h3>
              <p className="text-xs text-orange-100 leading-relaxed">Dashboard, stok, pembelian, dsb.</p>
              <div className="mt-4 text-xs font-semibold text-white/80 group-hover:text-white transition-colors">Login Manajer &rarr;</div>
            </button>
          </div>

          <div className="mt-8 text-center text-[10px] text-gray-300 uppercase tracking-widest font-semibold">
            Warung Nusantara ERP &bull; Multi-Cabang
          </div>
        </div>

        {/* Login Sub-Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLoginModal(false)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in duration-200"
              onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Login {loginModalRole}</h3>
                <p className="text-xs text-gray-400 mt-1">Masukkan kredensial untuk role {loginModalRole}</p>
              </div>

              <form onSubmit={handleSubLogin} className="space-y-4">
                 {loginError && (
                    <div className="text-xs bg-red-50 text-red-500 p-2 rounded-lg text-center font-bold">{loginError}</div>
                 )}
                 <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Username / Email</label>
                    <input type="text" required value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500" placeholder={`akun_${loginModalRole.toLowerCase()}`} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Password</label>
                    <input type="password" required value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500" placeholder="••••••" />
                 </div>
                 
                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm">Batal</button>
                    <button type="submit" disabled={isLoggingIn} className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl text-sm shadow-md shadow-orange-500/20">{isLoggingIn ? "Cek..." : "Masuk"}</button>
                 </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
  // Override nav items based on chosen station



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
          {activePage === "dashboard" && (userData?.role === 'owner' || userData?.role === 'admin') && <DashboardAdmin cabangId={activeCabangId} />}
          {activePage === "dashboard" && userData?.role === 'manager' && <DashboardCabang cabangId={activeCabangId} />}
          {activePage === "cabang" && <Cabang />}
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