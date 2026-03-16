import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function POS({ cabangList, activeCabangId }) {
    const [menus, setMenus] = useState([]);
    const [kategoris, setKategoris] = useState([]);
    const [activeKategori, setActiveKategori] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    // Cart State
    const [cart, setCart] = useState([]);
    const [orderType, setOrderType] = useState("dine_in");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [tableNumber, setTableNumber] = useState("");
    const [customerName, setCustomerName] = useState("");

    // Checkout Modal
    const [successOrder, setSuccessOrder] = useState(null);

    useEffect(() => {
        fetchKategoris();
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [activeKategori, activeCabangId]);

    const fetchKategoris = async () => {
        const res = await api.getKategori();
        if (res?.status === 'success') setKategoris(res.data);
    };

    const fetchMenus = async () => {
        setLoading(true);
        let url = '/api/menu';
        const params = [];
        if (activeKategori !== 'all') params.push(`kategori_id=${activeKategori}`);
        if (activeCabangId) params.push(`cabang_id=${activeCabangId}`);

        if (params.length > 0) url += `?${params.join('&')}`;

        const res = await api.apiFetch(url);
        if (res?.status === 'success') {
            setMenus(res.data);
        }
        setLoading(false);
    };

    const filteredMenus = menus.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

    const addToCart = (menu) => {
        setCart(prev => {
            const existing = prev.find(item => item.menu.id === menu.id);
            if (existing) {
                return prev.map(item => item.menu.id === menu.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { menu, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.menu.id === id) {
                const newQty = item.qty + delta;
                return newQty > 0 ? { ...item, qty: newQty } : item;
            }
            return item;
        }));
    };

    const removeCartItem = (id) => setCart(prev => prev.filter(item => item.menu.id !== id));

    const subtotal = cart.reduce((sum, item) => sum + (item.menu.price * item.qty), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        let targetCabangId = activeCabangId;
        if (!targetCabangId && cabangList.length > 0) {
            targetCabangId = cabangList[0].id;
        }

        if (!targetCabangId) {
            alert("Pilih Cabang terlebih dahulu atau pastikan ada Cabang di database!");
            return;
        }

        const payload = {
            cabang_id: parseInt(targetCabangId),
            order_type: orderType,
            table_number: tableNumber,
            customer_name: customerName,
            payment_method: paymentMethod,
            lines: cart.map(c => ({
                menu_id: c.menu.id,
                qty: c.qty,
            }))
        };

        const res = await api.createOrder(payload);
        if (res?.status === 'success') {
            setSuccessOrder(res.data);
            setCart([]);
            setTableNumber("");
            setCustomerName("");
        } else {
            alert("Gagal membuat order: " + (res?.message || 'Error Server'));
        }
    };

    return (
        // PERBAIKAN: Hapus max-w dan ganti dengan w-full
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-7rem)] animate-fade-in w-full">

            {/* --- Menu Catalog Section --- */}
            {/* PERBAIKAN: Tambah min-w-0 agar elemen ini tidak meluber ke kanan */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Controls */}
                <div className="mb-6 space-y-5 shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Katalog Menu</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Pilih menu untuk ditambahkan ke pesanan.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Cari menu..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full sm:max-w-xs px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-all outline-none placeholder:text-slate-400 shadow-sm"
                        />

                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
                            <button
                                onClick={() => setActiveKategori('all')}
                                className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${activeKategori === 'all' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                Semua
                            </button>
                            {kategoris.map(k => (
                                <button
                                    key={k.id}
                                    onClick={() => setActiveKategori(k.id)}
                                    className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${activeKategori === k.id ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    {k.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                                <div className="text-sm font-medium text-slate-500">Memuat menu...</div>
                            </div>
                        </div>
                    ) : filteredMenus.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-2xl py-16 flex flex-col items-center justify-center text-center shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800">Menu tidak ditemukan</h3>
                            <p className="text-sm text-slate-500 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                            {filteredMenus.map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => addToCart(m)}
                                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group flex flex-col h-full relative"
                                >
                                    {m.is_bestseller && (
                                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                    )}
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{m.kategori?.name}</div>
                                    <div className="font-bold text-slate-800 text-sm leading-snug mb-3 group-hover:text-brand-600 transition-colors">{m.name}</div>

                                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-50">
                                        <div className="font-bold text-slate-800 text-sm">{formatRupiah(m.price)}</div>
                                        <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-800 group-hover:text-white group-hover:border-slate-800 transition-all font-medium pb-0.5">
                                            +
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Cart Section --- */}
            {/* PERBAIKAN: Responsif Cart. Di laptop biasa 340px, di layar besar (xl) 380px. Dihapus min-h-nya */}
            <div className="w-full lg:w-[340px] xl:w-[380px] bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col shrink-0 h-full overflow-hidden">

                {/* Cart Header */}
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base text-slate-800 tracking-tight">Detail Pesanan</h3>
                    {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="text-[11px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider transition-colors">
                            Kosongkan
                        </button>
                    )}
                </div>

                {/* Order Meta */}
                <div className="p-4 border-b border-slate-50 space-y-4 shrink-0">
                    <div className="flex bg-slate-100/80 p-1 rounded-xl">
                        {['dine_in', 'take_away', 'delivery'].map(type => (
                            <button
                                key={type}
                                onClick={() => setOrderType(type)}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all capitalize ${orderType === type ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">No. Meja</label>
                            <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="-" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 outline-none transition-all font-medium text-slate-700" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">Pelanggan</label>
                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 outline-none transition-all font-medium text-slate-700" />
                        </div>
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <div className="w-10 h-10 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mb-2"></div>
                            <p className="text-xs font-medium">Belum ada pesanan</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map(c => (
                                <div key={c.menu.id} className="flex items-start justify-between group">
                                    <div className="flex-1 pr-3">
                                        <div className="font-semibold text-slate-800 text-xs leading-tight mb-0.5">{c.menu.name}</div>
                                        <div className="text-[11px] text-slate-400 font-medium">{formatRupiah(c.menu.price)}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="text-xs font-bold text-slate-800">{formatRupiah(c.menu.price * c.qty)}</div>
                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                                            <button onClick={() => updateQty(c.menu.id, -1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded text-xs font-medium transition-colors">−</button>
                                            <span className="w-3 text-center text-[11px] font-bold text-slate-700">{c.qty}</span>
                                            <button onClick={() => updateQty(c.menu.id, 1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded text-xs font-medium transition-colors">+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Summary & Checkout */}
                <div className="bg-slate-50/50 border-t border-slate-100 p-4 space-y-4 shrink-0">

                    {/* Payment Method */}
                    <div>
                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Pembayaran</div>
                        <div className="grid grid-cols-3 gap-2">
                            {['cash', 'card', 'qris'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all uppercase tracking-wider ${paymentMethod === method ? 'border-slate-800 bg-slate-800 text-white shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Calculation */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-medium text-slate-500">
                            <span>Subtotal</span>
                            <span className="text-slate-700">{formatRupiah(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-medium text-slate-500">
                            <span>Pajak (10%)</span>
                            <span className="text-slate-700">{formatRupiah(tax)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200/60 mt-1">
                            <span className="font-bold text-slate-800 text-sm">Total</span>
                            <span className="text-lg font-black text-brand-600 tracking-tight leading-none">{formatRupiah(total)}</span>
                        </div>
                    </div>

                    <button
                        disabled={cart.length === 0}
                        onClick={handleCheckout}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm tracking-wide shadow-md transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed">
                        Proses Pembayaran
                    </button>
                </div>
            </div>

            {/* --- Success Modal --- */}
            {successOrder && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-xl animate-slide-up border border-slate-100">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-xl mx-auto mb-4 border border-emerald-100">
                            ✓
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Pembayaran Berhasil</h2>
                        <p className="text-xs text-slate-500 mb-5">Pesanan diteruskan ke dapur.</p>

                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-5 text-left space-y-2">
                            <div className="flex justify-between border-b border-slate-200/60 pb-2">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">No. Order</span>
                                <span className="font-bold text-slate-800 text-xs">{successOrder.name}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                                <span className="font-black text-slate-800 text-base">{formatRupiah(successOrder.total_amount)}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setSuccessOrder(null)}
                            className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-colors"
                        >
                            Buat Order Baru
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}