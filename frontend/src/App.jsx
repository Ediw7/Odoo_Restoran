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
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);


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
      } else if (parsed.role === 'owner' || parsed.role === 'admin') {
        setActivePage("dashboard");
        setStationMode("owner");
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
    setStationMode(null);
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
          { id: "orders", label: "Riwayat Transaksi" }
        ];
      case 'cashier':
        return [
          { id: "pos", label: "Kasir (POS)" },
          { id: "pelanggan", label: "Pelanggan & Loyalty" },
          { id: "orders", label: "Riwayat Transaksi" },
        ];
      case 'kitchen':
        return [
          { id: "dapur", label: "Layar Dapur (KDS)" },
        ];
      case 'warehouse':
        return [
          { id: "inventory", label: "Stok Etalase Makanan" },
          { id: "bahan_baku", label: "Gudang Bahan Mentah" },
          { id: "purchasing", label: "Pembelian & Supplier" },
          { id: "wastage", label: "Barang Rusak / Wastage" },
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

  if (!isLoggedIn) {
    return <Login onLoginSuccess={(data) => {
      localStorage.setItem("restoran_user", JSON.stringify(data));
      setUserData(data);
      setIsLoggedIn(true);
      setActiveCabangId(data.cabang_id);
      if (data.role === 'owner' || data.role === 'admin') {
          setStationMode('owner');
          setActivePage('dashboard');
      }
    }} />;
  }

  // --- RENDERING LAUNCHER (Jika Belum Pilih Stasiun & Bukan Owner/Admin) ---
  if (!stationMode && userData?.role !== 'owner' && userData?.role !== 'admin') {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Warung Nusantara</h1>
              <p className="text-sm text-gray-400 mt-0.5">Pilih stasiun kerja — {userData?.cabang_name || "Pusat"}</p>
            </div>
            <button onClick={handleLogout}
              className="text-xs font-semibold text-gray-400 hover:text-red-500 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors">
              Logout / Ganti Cabang
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <button onClick={() => { setStationMode("cashier"); setActivePage("pos"); }}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left shadow-sm hover:shadow-md hover:border-orange-200 transition-all group">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-sm font-black text-orange-500">POS</span>
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Kasir (POS)</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Input pesanan, bayar & cetak struk.</p>
              <div className="mt-4 text-xs font-semibold text-orange-400 group-hover:text-orange-500 transition-colors">Buka Kasir &rarr;</div>
            </button>

            <button onClick={() => { setStationMode("kitchen"); setActivePage("dapur"); }}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left shadow-sm hover:shadow-md hover:border-orange-200 transition-all group">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-sm font-black text-orange-500">KDS</span>
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Layar Dapur</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Antrean dan status masak real-time.</p>
              <div className="mt-4 text-xs font-semibold text-orange-400 group-hover:text-orange-500 transition-colors">Buka Dapur &rarr;</div>
            </button>

            <button onClick={() => { setStationMode("warehouse"); setActivePage("inventory"); }}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left shadow-sm hover:shadow-md hover:border-orange-200 transition-all group">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-xs font-black text-orange-500">WH</span>
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Gudang & Stok</h3>
              <p className="text-xs text-gray-400 leading-relaxed">PO pembelian, stok bahan & wastage.</p>
              <div className="mt-4 text-xs font-semibold text-orange-400 group-hover:text-orange-500 transition-colors">Buka Gudang &rarr;</div>
            </button>

            <button onClick={() => { setShowPinModal(true); setPinInput(""); setPinError(false); }}
              className="bg-orange-500 hover:bg-orange-600 border border-orange-500 rounded-2xl p-6 text-left shadow-sm hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-xs font-black text-white">MGR</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">Manajer / Owner</h3>
              <p className="text-xs text-orange-100 leading-relaxed">Analytics, omset, laba rugi & master.</p>
              <div className="mt-4 text-xs font-semibold text-white/80 group-hover:text-white transition-colors">Buka Dashboard &rarr;</div>
            </button>
          </div>

          <div className="mt-8 text-center text-[10px] text-gray-300 uppercase tracking-widest font-semibold">
            Warung Nusantara ERP &bull; Multi-Cabang
          </div>
        </div>

        {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPinModal(false)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 animate-in zoom-in duration-200"
              onClick={e => e.stopPropagation()}>
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-black text-orange-500">MGR</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Masukkan PIN Manajer</h3>
                <p className="text-xs text-gray-400 mt-1">Khusus Owner & Manajer Cabang</p>
              </div>

              {/* PIN Display */}
              <div className="flex justify-center gap-3 mb-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${pinInput.length > i ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
                    }`}>
                    {pinInput.length > i && <div className="w-3 h-3 rounded-full bg-orange-500" />}
                  </div>
                ))}
              </div>
              {pinError && (
                <p className="text-center text-xs text-red-500 font-bold mb-3 animate-shake">PIN Salah! Coba lagi.</p>
              )}
              {!pinError && <div className="mb-3" />}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button key={n}
                    onClick={() => {
                      if (pinInput.length < 4) {
                        const newPin = pinInput + n.toString();
                        setPinInput(newPin);
                        setPinError(false);
                        if (newPin.length === 4) {

                          const currentPin = userData?.manager_pin || '1234';
                          if (newPin === currentPin) {
                            setShowPinModal(false);
                            setStationMode("admin");
                            setActivePage("dashboard");
                          } else {
                            setPinError(true);
                            setTimeout(() => setPinInput(""), 800);
                          }
                        }
                      }
                    }}
                    className="h-13 py-3.5 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 border border-gray-100 rounded-xl text-lg font-bold text-gray-700 transition-all active:scale-95">
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => { setPinInput(""); setPinError(false); }}
                  className="h-13 py-3.5 bg-gray-50 hover:bg-red-50 hover:text-red-500 border border-gray-100 rounded-xl text-sm font-bold text-gray-400 transition-all active:scale-95">
                  Hapus
                </button>
                <button
                  onClick={() => {
                    if (pinInput.length < 4) {
                      const newPin = pinInput + "0";
                      setPinInput(newPin);
                      setPinError(false);
                      if (newPin.length === 4) {
                        if (newPin === (userData?.manager_pin || '1234')) {
                          setShowPinModal(false);
                          setStationMode("admin");
                          setActivePage("dashboard");
                        } else {
                          setPinError(true);
                          setTimeout(() => setPinInput(""), 800);
                        }
                      }
                    }
                  }}
                  className="h-13 py-3.5 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 border border-gray-100 rounded-xl text-lg font-bold text-gray-700 transition-all active:scale-95">
                  0
                </button>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="h-13 py-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl text-sm font-semibold text-gray-400 transition-all active:scale-95">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // Override nav items based on chosen station

  const activeNavItems = getNavItems(stationMode);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className={`w-[220px] bg-white border-r border-gray-100 flex flex-col shrink-0 absolute md:relative transition-transform duration-300 z-[100] h-full ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-5 border-b border-gray-100">
          <h1 className="font-bold text-gray-800 text-base">Warung Nusantara</h1>
          <p className="text-gray-400 text-xs mt-0.5">POS System</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {activeNavItems.map((item) => (
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
            <div className="text-xs text-gray-400 capitalize">Mode: {stationMode}</div>
          </div>
          { (userData?.role === 'owner' || userData?.role === 'admin') ? (
            <button onClick={handleLogout} className="text-sm shadow-sm border border-red-200 text-red-500 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">Logout</button>
          ) : (
            <div className="flex gap-1.5">
               <button onClick={() => setStationMode(null)} className="text-sm shadow-sm border border-gray-200 text-gray-500 font-medium transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100" title="Ganti Stasiun">🏢</button>
               <button onClick={handleLogout} className="text-sm shadow-sm border border-red-200 text-red-500 font-medium transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50" title="Logout">🚪</button>
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
          {activePage === "dashboard" && userData?.role === 'cashier' && <DashboardCabang cabangId={activeCabangId} />}
          {activePage === "cabang" && <Cabang />}
          {activePage === "pos" && <POS cabangList={cabangList} activeCabangId={activeCabangId} />}
          {activePage === "dapur" && <Dapur cabangId={activeCabangId} />}
          {activePage === "orders" && <Orders cabangId={activeCabangId} />}
          {activePage === "inventory" && <Inventory activeCabangId={activeCabangId} />}
          {activePage === "bahan_baku" && <BahanBaku />}
          {activePage === "menu" && <Menu cabangId={activeCabangId} />}
          {activePage === "report" && <Report cabangId={activeCabangId} />}
          {activePage === "wastage" && <Wastage cabangId={activeCabangId} />}
          {activePage === "purchasing" && <Purchasing cabangList={cabangList} activeCabangId={activeCabangId} />}
          {activePage === "pelanggan" && <Pelanggan />}
        </div>
      </main>

      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-50 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}