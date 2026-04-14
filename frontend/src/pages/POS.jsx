import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function POS({ cabangList, activeCabangId }) {
    const [menus, setMenus] = useState([]);
    const [kategoris, setKategoris] = useState([]);
    const [activeKategori, setActiveKategori] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [cart, setCart] = useState([]);
    const [orderType, setOrderType] = useState("dine_in");
    const [tableNumber, setTableNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [successOrder, setSuccessOrder] = useState(null);
    const [occupiedTables, setOccupiedTables] = useState([]);

    useEffect(() => { fetchKategoris(); fetchOccupiedTables(); }, []);
    useEffect(() => { fetchMenus(); fetchOccupiedTables(); }, [activeKategori, activeCabangId]);

    const fetchOccupiedTables = async () => {
        let url = '/api/orders?limit=100';
        if (activeCabangId) url += `&cabang_id=${activeCabangId}`;
        const res = await api.apiFetch(url);
        if (res?.status === 'success') {
            const active = res.data.filter(o => ['draft', 'confirmed', 'preparing', 'ready'].includes(o.state));
            const tables = active.map(o => o.table_number.trim().toLowerCase()).filter(t => t);
            setOccupiedTables([...new Set(tables)]);
        }
    };

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
        if (res?.status === 'success') setMenus(res.data);
        setLoading(false);
    };

    // Filter search + sort: available first, out of stock last
    const filteredMenus = menus
        .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const aOut = a.use_stock && a.stock_qty <= 0;
            const bOut = b.use_stock && b.stock_qty <= 0;
            if (aOut === bOut) return 0;
            return aOut ? 1 : -1;
        });

    const isOutOfStock = (m) => m.use_stock && m.stock_qty <= 0;

    const addToCart = (menu) => {
        if (isOutOfStock(menu)) return; // block out of stock
        setCart(prev => {
            const existing = prev.find(item => item.menu.id === menu.id);
            if (existing) {
                // block if exceeds stock
                if (menu.use_stock && existing.qty + 1 > menu.stock_qty) return prev;
                return prev.map(item => item.menu.id === menu.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { menu, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.menu.id === id) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return item;
                // block if exceeds stock
                if (item.menu.use_stock && newQty > item.menu.stock_qty) return item;
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.menu.id !== id));

    const subtotal = cart.reduce((sum, item) => sum + (item.menu.price * item.qty), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const isTableOccupied = orderType === 'dine_in' && tableNumber && occupiedTables.includes(tableNumber.trim().toLowerCase());

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!tableNumber.trim() || !customerName.trim()) return alert("Nomor Meja dan Nama Pelanggan wajib diisi sebelum proses!");
        let targetCabangId = activeCabangId;
        if (!targetCabangId && cabangList.length > 0) targetCabangId = cabangList[0].id;
        if (!targetCabangId) return alert("Pilih cabang terlebih dahulu.");

        const payload = {
            cabang_id: parseInt(targetCabangId), order_type: orderType,
            table_number: tableNumber, customer_name: customerName,
            lines: cart.map(c => ({ menu_id: c.menu.id, qty: c.qty }))
        };

        const res = await api.createOrder(payload);
        if (res?.status === 'success') { setSuccessOrder(res.data); setCart([]); setTableNumber(""); setCustomerName(""); fetchMenus(); }
        else alert("Gagal: " + (res?.message || 'Error'));
    };

    return (
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-6.5rem)] animate-fade-in w-full">
            {/* Menu Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="mb-4 space-y-3 shrink-0">
                    <input type="text" placeholder="Cari menu..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full sm:max-w-xs px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-gray-400" />
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button onClick={() => setActiveKategori('all')}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeKategori === 'all' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            Semua
                        </button>
                        {kategoris.map(k => (
                            <button key={k.id} onClick={() => setActiveKategori(k.id)}
                                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeKategori === k.id ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {k.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
                        </div>
                    ) : filteredMenus.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl py-16 text-center">
                            <p className="font-medium text-gray-500">Menu tidak ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredMenus.map(m => {
                                const outOfStock = isOutOfStock(m);
                                const lowStock = m.use_stock && m.stock_qty > 0 && m.stock_qty <= 5;
                                return (
                                    <div key={m.id} onClick={() => addToCart(m)}
                                        className={`bg-white border rounded-xl p-4 transition-all flex flex-col h-full ${outOfStock ? 'border-gray-100 opacity-40 cursor-not-allowed' : 'border-orange-100 hover:border-orange-300 hover:shadow-sm cursor-pointer'}`}>
                                        <div className="text-xs text-gray-400 mb-1">{m.kategori?.name}</div>
                                        <div className="font-semibold text-gray-800 text-sm mb-1">{m.name}</div>
                                        {m.use_stock && (
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${outOfStock ? 'bg-red-400' : lowStock ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                                                <span className={`text-xs ${outOfStock ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                                    {outOfStock ? 'Habis' : `${m.stock_qty} porsi`}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-50">
                                            <span className="font-bold text-gray-800 text-sm">{formatRupiah(m.price)}</span>
                                            {!outOfStock && <span className="text-orange-500 font-bold text-sm">+</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart / Invoice */}
            <div className="w-full lg:w-[320px] xl:w-[350px] bg-white border border-gray-100 rounded-xl flex flex-col shrink-0 h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Pesanan</h3>
                    {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Hapus</button>
                    )}
                </div>

                <div className="p-3 border-b border-gray-100 space-y-3">
                    <div className="flex bg-gray-50 p-0.5 rounded-lg">
                        {['dine_in', 'take_away', 'delivery'].map(type => (
                            <button key={type} onClick={() => setOrderType(type)}
                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${orderType === type ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">No. Meja</label>
                            <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="-"
                                className={`w-full px-3 py-1.5 bg-gray-50 border rounded-lg text-sm outline-none transition-all ${isTableOccupied ? 'border-orange-400 focus:border-orange-500 bg-orange-50/50' : 'border-gray-200 focus:border-orange-400'}`} />
                            {isTableOccupied && <div className="text-[10px] text-orange-600 mt-1 font-medium">Meja aktif: Pesanan akan digabung</div>}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Pelanggan</label>
                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in"
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                        </div>
                    </div>
                    {orderType === 'dine_in' && occupiedTables.length > 0 && (
                        <div className="pt-2 border-t border-gray-50">
                            <label className="block text-[10px] text-gray-400 mb-1.5">Meja Aktif Saat Ini:</label>
                            <div className="flex flex-wrap gap-1.5">
                                {occupiedTables.map(t => (
                                    <button key={t} onClick={() => setTableNumber(t)}
                                        className={`px-3 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-md text-xs font-bold hover:bg-orange-100 transition-colors ${tableNumber.trim().toLowerCase() === t ? 'ring-2 ring-orange-400' : ''}`}>
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-300 text-sm">Belum ada item</div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map(c => (
                                <div key={c.menu.id} className="flex items-start justify-between">
                                    <div className="flex-1 pr-3">
                                        <div className="font-medium text-gray-800 text-sm">{c.menu.name}</div>
                                        <div className="text-xs text-gray-400">{formatRupiah(c.menu.price)}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="text-sm font-semibold text-gray-800">{formatRupiah(c.menu.price * c.qty)}</span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => c.qty === 1 ? removeFromCart(c.menu.id) : updateQty(c.menu.id, -1)} className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600">-</button>
                                            <span className="w-5 text-center text-xs font-semibold text-gray-700">{c.qty}</span>
                                            <button onClick={() => updateQty(c.menu.id, 1)} className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600">+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 p-4 space-y-3 shrink-0">

                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="text-gray-600">{formatRupiah(subtotal)}</span></div>
                        <div className="flex justify-between text-gray-400"><span>Pajak (10%)</span><span className="text-gray-600">{formatRupiah(tax)}</span></div>
                        <div className="flex justify-between pt-2 border-t border-gray-100 mt-1">
                            <span className="font-semibold text-gray-800">Total</span>
                            <span className="text-lg font-bold text-orange-600">{formatRupiah(total)}</span>
                        </div>
                    </div>
                    <button disabled={cart.length === 0 || !tableNumber.trim() || !customerName.trim()} onClick={handleCheckout}
                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        {isTableOccupied ? `Tambah ke Meja ${tableNumber.trim()}` : 'Proses Pesanan'}
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            {successOrder && (
                <div className="fixed inset-0 bg-black/30 z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-lg animate-scale-in">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">✓</div>
                        <h2 className="text-base font-semibold text-gray-800 mb-1">Pesanan Berhasil</h2>
                        <p className="text-sm text-gray-400 mb-4">Diteruskan ke dapur.</p>
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 text-left space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-400">No. Order</span><span className="font-semibold text-gray-800">{successOrder.name}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-400">Total</span><span className="font-bold text-gray-800">{formatRupiah(successOrder.total_amount)}</span></div>
                        </div>
                        <button onClick={() => { setSuccessOrder(null); fetchOccupiedTables(); }} className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors">Order Baru</button>
                    </div>
                </div>
            )}
        </div>
    );
}