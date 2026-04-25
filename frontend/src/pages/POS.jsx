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
    const [customerPhone, setCustomerPhone] = useState("");
    const [loyalty, setLoyalty] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("cash"); // cash, card, qris, transfer
    const [successOrder, setSuccessOrder] = useState(null);
    const [rewardClaimed, setRewardClaimed] = useState(null);
    const [activeOrderForName, setActiveOrderForName] = useState(null);
    const [checkoutMode, setCheckoutMode] = useState("cart"); // "cart" or "pay_active"

    useEffect(() => { fetchKategoris(); }, []);
    useEffect(() => { fetchMenus(); }, [activeKategori, activeCabangId]);
    // Automatic Loyalty & Active Order Check when name changes
    useEffect(() => {
        if (!customerName || customerName === 'Walk-in') {
            setLoyalty(null);
            setActiveOrderForName(null);
            return;
        }

        const timer = setTimeout(async () => {
            // Check Loyalty
            const resLoyalty = await api.checkCustomer(customerName);
            if (resLoyalty?.status === 'success') {
                setLoyalty(resLoyalty.data);
            } else {
                setLoyalty(null);
            }

            // Automagically search active tagihan for this name
            let targetCabangId = activeCabangId;
            if (!targetCabangId && cabangList?.length > 0) targetCabangId = cabangList[0].id;
            const resOrders = await api.getOrders(targetCabangId, 'active', 'all', 10, 0);
            if (resOrders?.status === 'success') {
                const matched = resOrders.data.find(o =>
                    o.state !== 'done' && o.state !== 'cancelled' &&
                    o.customer_name?.toLowerCase() === customerName.toLowerCase()
                );
                setActiveOrderForName(matched || null);
                if (matched && cart.length === 0) {
                    setCheckoutMode("pay_active");
                }
            } else {
                setActiveOrderForName(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [customerName, activeCabangId, cabangList]);

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

    const handleClaimReward = async () => {
        if (!loyalty || !customerName) return;
        const res = await api.claimReward(customerName);
        if (res.status === 'success') {
            // Tambahkan kopi gratis ke cart
            const kopiGratis = {
                id: 'reward-kopi',
                name: '🎁 Hadiah Kopi Gratis',
                price: 0,
                available: true,
                use_stock: false
            };
            addToCart(kopiGratis);

            // Refresh loyalty data
            const resLoyalty = await api.checkCustomer(customerName);
            if (resLoyalty.status === 'success') setLoyalty(resLoyalty.data);

            setRewardClaimed({
                name: customerName,
                item: '1 Kopi Gratis'
            });
        } else {
            // alert(res.message || "Gagal klaim hadiah.");
        }
    };

    const handleClaimSpecialReward = async () => {
        if (!loyalty || !customerName) return;
        const rewardText = loyalty.special_reward;
        const res = await api.claimSpecialReward(customerName);
        if (res?.status === 'success') {
            const resLoyalty = await api.checkCustomer(customerName);
            if (resLoyalty?.status === 'success') setLoyalty(resLoyalty.data);

            setRewardClaimed({
                name: customerName,
                item: rewardText
            });
        } else {
            alert(res?.message || "Gagal mencairkan hadiah spesial.");
        }
    };

    const addToCart = (menu) => {
        if (isOutOfStock(menu)) return;
        setCheckoutMode("cart");
        setCart(prev => {
            const existing = prev.find(item => item.menu.id === menu.id);
            if (existing) {
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

    const handlePayTagihan = async (orderToPay) => {
        if (!orderToPay) return;
        if (!paymentMethod) return alert("Pilih metode pembayaran!");

        const res = await api.updateOrderStatus(orderToPay.id, 'done', { payment_method: paymentMethod });
        if (res?.status === 'success') {
            setSuccessOrder({
                id: orderToPay.id,
                name: orderToPay.name,
                total_amount: orderToPay.total_amount,
                table: orderToPay.table_number || '-'
            });
            setActiveOrderForName(null);
            setCustomerName("");
        } else {
            alert("Gagal bayar: " + (res?.message || 'Error'));
        }
    };

    const handleCheckout = async (isPaid = true) => {
        if (cart.length === 0) return;
        if (!customerName.trim()) return alert(`Nama Pelanggan wajib diisi sebelum ${isPaid ? 'bayar!' : 'dikirim ke dapur!'}`);
        if (orderType === 'dine_in' && !tableNumber.trim()) return alert("Nomor Meja wajib diisi untuk pesanan Dine In!");
        if (isPaid && !paymentMethod) return alert("Pilih metode pembayaran!");

        let targetCabangId = activeCabangId;
        if (!targetCabangId && cabangList.length > 0) targetCabangId = cabangList[0].id;
        if (!targetCabangId) return alert("Pilih cabang terlebih dahulu.");

        const payload = {
            cabang_id: parseInt(targetCabangId),
            order_type: orderType,
            table_number: tableNumber,
            customer_name: customerName,
            customer_phone: customerPhone,
            payment_method: isPaid ? paymentMethod : false,
            lines: cart.map(c => ({ menu_id: c.menu.id, qty: c.qty }))
        };

        const res = await api.createOrder(payload);
        if (res?.status === 'success') {
            if (isPaid) {
                setSuccessOrder(res.data);
            } else {
                alert("Berhasil! Pesanan telah dikirim ke dapur.");
            }
            setCart([]);
            setTableNumber("");
            setCustomerName("");
            setCustomerPhone("");
            setLoyalty(null);
            fetchMenus();
        }
        else alert("Gagal Transaksi: " + (res?.message || 'Error'));
    };

    const PaymentOption = ({ id, label, icon }) => (
        <button onClick={() => setPaymentMethod(id)}
            className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${paymentMethod === id ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}>
            <span className="text-lg mb-1">{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
        </button>
    );

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
                    <h3 className="font-bold text-gray-800">Kasir Pembayaran</h3>
                    {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">Reset</button>
                    )}
                </div>

                <div className="p-3 border-b border-gray-100 space-y-3">
                    <div className="flex bg-gray-50 p-0.5 rounded-lg">
                        {['dine_in', 'take_away', 'delivery'].map(type => (
                            <button key={type} onClick={() => setOrderType(type)}
                                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${orderType === type ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className={`grid ${orderType === 'dine_in' ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                        {orderType === 'dine_in' && (
                            <div className="col-span-1">
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">No. Meja</label>
                                <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="00"
                                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-bold outline-none focus:border-orange-400" />
                            </div>
                        )}
                        <div className={`col-span-2 ${orderType !== 'dine_in' ? 'col-span-2 w-full' : ''}`}>
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Pelanggan / Loyalty</label>
                            <div className="flex gap-1.5">
                                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in"
                                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                                <button onClick={async () => {
                                    if (!customerName) return;
                                    const res = await api.checkCustomer(customerName);
                                    if (res.status === 'success') {
                                        setLoyalty(res.data);
                                    } else {
                                        alert(res.message || "Nama belum terdaftar di loyalty.");
                                        setLoyalty(null);
                                    }
                                }} className="shrink-0 bg-white border border-orange-200 hover:border-orange-500 text-orange-500 px-2 py-1.5 rounded-lg text-xs transition-all">
                                    🔍
                                </button>
                            </div>
                        </div>
                    </div>
                    {loyalty && loyalty.is_eligible_reward && (
                        <div className="p-2.5 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 bg-orange-50 border-orange-200">
                            <div className="text-xl">🎁</div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status Loyalty</div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-bold text-gray-800 truncate">{loyalty.reward_message}</div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClaimReward();
                                        }}
                                        className="shrink-0 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm animate-pulse"
                                    >
                                        Klaim
                                    </button>
                                </div>
                                <div className="mt-1.5 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (loyalty.visit_count / 10) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    {loyalty && loyalty.special_reward && (
                        <div className="p-3 mt-2 rounded-xl border flex gap-3 animate-in fade-in bg-gradient-to-r from-yellow-100 to-amber-50 border-yellow-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 text-5xl opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">🎁</div>
                            <div className="text-2xl animate-bounce">👑</div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">VIP ALERT! Hadiah Kejutan</div>
                                <div className="text-sm font-black text-gray-800 mb-2 leading-tight">"{loyalty.special_reward}"</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClaimSpecialReward();
                                    }}
                                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
                                >
                                    Tandai Telah Diberikan
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {activeOrderForName && checkoutMode === "cart" && (
                    <div className="mx-3 mt-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg flex justify-between items-center cursor-pointer shadow-sm animate-fade-in"
                        onClick={() => setCheckoutMode("pay_active")}>
                        <div>
                            <span className="font-bold text-orange-600 text-[10px] uppercase tracking-widest">Tagihan Aktif Ditemukan</span>
                            <div className="text-sm font-black text-gray-800">{activeOrderForName.customer_name} {activeOrderForName.table_number && `• Mj ${activeOrderForName.table_number}`}</div>
                        </div>
                        <button className="bg-orange-500 text-white text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider shadow-sm hover:bg-orange-600">
                            Buka Tagihan
                        </button>
                    </div>
                )}

                {activeOrderForName && checkoutMode === "pay_active" ? (
                    <div className="flex-1 flex flex-col p-3 animate-in fade-in relative z-10 bg-white">
                        <div className="mb-3 px-3 py-2 bg-orange-50/50 rounded-lg border border-orange-100/50 flex justify-between items-center">
                            <div>
                                <div className="text-[10px] font-bold text-orange-400 uppercase">Tagihan Ditemukan</div>
                                <div className="text-sm font-black text-gray-800">{activeOrderForName.customer_name}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {activeOrderForName.table_number && <div className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded uppercase tracking-wider">Meja {activeOrderForName.table_number}</div>}
                                <button onClick={() => setCheckoutMode("cart")} className="text-[10px] text-gray-500 underline hover:text-gray-800 font-medium">Batal & Nambah Lagi</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 px-1">
                            {activeOrderForName.lines.map(l => (
                                <div key={l.id} className="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-gray-100">
                                    <div className="flex gap-2 text-gray-600">
                                        <span className="font-bold text-orange-500">{l.qty}x</span>
                                        <span className="font-medium text-gray-800">{l.menu.name}</span>
                                    </div>
                                    <div className="font-semibold text-gray-600">{formatRupiah(l.subtotal)}</div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-3 mt-auto border-t border-gray-100 shrink-0">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <span className="font-bold text-gray-400 text-[10px] tracking-widest uppercase">Total Bayar</span>
                                <span className="text-xl font-black text-orange-600">{formatRupiah(activeOrderForName.total_amount)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                                <PaymentOption id="cash" label="Tunai" icon="💵" />
                                <PaymentOption id="qris" label="QRIS" icon="📱" />
                                <PaymentOption id="card" label="Kartu" icon="💳" />
                            </div>
                            <button onClick={() => handlePayTagihan(activeOrderForName)}
                                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold shadow-sm transition-all text-sm uppercase">
                                BAYAR SEKARANG
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-3">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                    <span className="text-3xl mb-2">🛒</span>
                                    <span className="text-xs">Pilih menu untuk mulai</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map(c => (
                                        <div key={c.menu.id} className="flex items-start justify-between bg-gray-50/50 p-2 rounded-lg border border-gray-50">
                                            <div className="flex-1 pr-2">
                                                <div className="font-semibold text-gray-800 text-xs">{c.menu.name}</div>
                                                <div className="text-[10px] text-gray-400">{formatRupiah(c.menu.price)} x {c.qty}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-xs font-bold text-gray-800">{formatRupiah(c.menu.price * c.qty)}</span>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => c.qty === 1 ? removeFromCart(c.menu.id) : updateQty(c.menu.id, -1)} className="w-5 h-5 flex items-center justify-center bg-white border border-gray-100 rounded text-[10px]">-</button>
                                                    <button onClick={() => updateQty(c.menu.id, 1)} className="w-5 h-5 flex items-center justify-center bg-white border border-gray-100 rounded text-[10px]">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-100 p-4 space-y-4 shrink-0 bg-gray-50/30">
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Metode Pembayaran</label>
                                <div className="flex gap-2">
                                    <PaymentOption id="cash" label="Tunai" icon="💵" />
                                    <PaymentOption id="qris" label="QRIS" icon="📱" />
                                    <PaymentOption id="card" label="Kartu" icon="💳" />
                                </div>
                            </div>

                            <div className="space-y-1 pt-2 border-t border-gray-100">
                                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
                                <div className="flex justify-between text-xs text-gray-500"><span>Pajak (10%)</span><span>{formatRupiah(tax)}</span></div>
                                <div className="flex justify-between pt-2 mt-1">
                                    <span className="font-bold text-gray-800 text-sm">TOTAL BAYAR</span>
                                    <span className="text-xl font-black text-orange-600">{formatRupiah(total)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button disabled={cart.length === 0 || (!tableNumber.trim() && !customerName.trim())} onClick={() => handleCheckout(false)}
                                    className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-yellow-500/20 transition-all disabled:opacity-40 disabled:grayscale disabled:shadow-none">
                                    KIRIM DAPUR
                                </button>
                                <button disabled={cart.length === 0 || (!tableNumber.trim() && !customerName.trim())} onClick={() => handleCheckout(true)}
                                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-orange-500/20 transition-all disabled:opacity-40 disabled:grayscale disabled:shadow-none">
                                    BAYAR & SELESAI
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Success Receipt Modal */}
            {successOrder && (
                <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-scale-in border-t-4 border-green-500">
                        <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">✓</div>
                        <h2 className="text-lg font-bold text-gray-800 mb-1 text-center">Pembayaran Berhasil</h2>
                        <p className="text-xs text-gray-400 mb-6 text-center">Transaksi telah dicatat dan stok diperbarui.</p>

                        <div className="bg-gray-50 p-4 rounded-xl mb-6 space-y-2 border border-gray-100">
                            <div className="flex justify-between text-[11px]"><span className="text-gray-400 uppercase font-bold">No. Order</span><span className="font-bold text-gray-800">{successOrder.name}</span></div>
                            <div className="flex justify-between text-[11px]"><span className="text-gray-400 uppercase font-bold">Meja</span><span className="font-bold text-gray-800">{successOrder.table}</span></div>
                            <div className="flex justify-between text-[11px]"><span className="text-gray-400 uppercase font-bold">Metode</span><span className="font-bold text-orange-600 uppercase italic">{paymentMethod}</span></div>
                            <div className="h-px bg-gray-200 my-2"></div>
                            <div className="flex justify-between text-xs font-black"><span className="text-gray-800">TOTAL</span><span className="text-gray-800">{formatRupiah(successOrder.total_amount)}</span></div>
                        </div>

                        <button onClick={() => setSuccessOrder(null)} className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900 transition-colors">TUTUP</button>
                    </div>
                </div>
            )}

            {/* Reward Success Modal */}
            {rewardClaimed && (
                <div className="fixed inset-0 bg-black/40 z-[210] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-scale-in border-t-4 border-orange-500">
                        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner animate-bounce">🎁</div>
                        <h2 className="text-lg font-bold text-gray-800 mb-1 text-center">Reward Diklaim!</h2>
                        <p className="text-xs text-center text-gray-500 mb-6 leading-relaxed">
                            <span className="font-bold text-orange-600">{rewardClaimed.item}</span> telah ditambahkan ke keranjang untuk pelanggan <span className="font-bold text-gray-800">{rewardClaimed.name}</span>.
                        </p>

                        <button onClick={() => setRewardClaimed(null)} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 uppercase tracking-wider">
                            Mantap!
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}