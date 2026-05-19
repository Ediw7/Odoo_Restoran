import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function QRMenu({ cabangId, tableNo }) {
    const [menus, setMenus] = useState([]);
    const [kategori, setKategori] = useState([]);
    const [activeKat, setActiveKat] = useState('all');
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    useEffect(() => {
        if (cabangId) {
            fetchData();
        }
    }, [cabangId]);

    const fetchData = async () => {
        setLoading(true);
        const [resMenu, resKat] = await Promise.all([
            api.getMenu('all', cabangId), 
            api.getKategori()
        ]);
        
        // Filter menu by cabang manually if the API didn't handle it
        if (resMenu?.status === 'success') {
            const filtered = resMenu.data.filter(m => !m.cabang_id || m.cabang_id == cabangId);
            setMenus(filtered);
        }
        if (resKat?.status === 'success') setKategori(resKat.data);
        setLoading(false);
    };

    const addToCart = (menu) => {
        if (menu.use_stock && menu.stock_qty <= 0) return;
        setCart(prev => {
            const ext = prev.find(p => p.id === menu.id);
            if (ext) return prev.map(p => p.id === menu.id ? { ...p, qty: p.qty + 1 } : p);
            return [...prev, { ...menu, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = p.qty + delta;
                return newQty > 0 ? { ...p, qty: newQty } : p;
            }
            return p;
        }).filter(p => p.qty > 0));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const handleSubmit = async () => {
        if (!customerName.trim()) {
            alert("Mohon isikan nama Anda");
            return;
        }
        if (cart.length === 0) return;

        setIsSubmitting(true);
        const payload = {
            cabang_id: parseInt(cabangId),
            customer_name: customerName,
            type: 'dine_in',
            table: tableNo,
            lines: cart.map(c => ({ menu_id: c.id, qty: c.qty, price: c.price }))
        };

        const res = await api.createOrder(payload);
        if (res?.status === 'success') {
            setOrderSuccess(true);
            setCart([]);
        } else {
            alert("Gagal memproses pesanan: " + (res?.message || 'Error'));
        }
        setIsSubmitting(false);
    };

    if (!cabangId || !tableNo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-xl font-bold text-gray-800">QR Code Tidak Valid</h1>
                <p className="text-gray-500 mt-2">Mohon scan QR Code yang ada di meja Anda.</p>
            </div>
        );
    }

    if (orderSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 p-6 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-4xl shadow-xl shadow-green-200 mb-6 animate-scale-in">✓</div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Pesanan Diterima!</h1>
                <p className="text-gray-600 mb-8 max-w-xs">Terima kasih Kak <b>{customerName}</b>, pesanan Anda sedang disiapkan oleh Dapur. Mohon ditunggu ya!</p>
                
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-sm text-left border border-orange-100">
                    <div className="text-sm text-gray-400 mb-1">Meja</div>
                    <div className="text-2xl font-black text-orange-600 mb-4">{tableNo}</div>
                    
                    <button onClick={() => { setOrderSuccess(false); setCustomerName(""); }} 
                        className="w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-xl hover:bg-orange-200">
                        Pesan Menu Tambahan
                    </button>
                </div>
            </div>
        );
    }

    const filteredMenus = activeKat === 'all' ? menus : menus.filter(m => m.kategori?.id === activeKat);

    return (
        <div className="min-h-screen bg-gray-50 pb-32 flex justify-center">
            <div className="w-full max-w-md bg-white shadow-xl relative min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white px-4 pt-8 pb-4 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Warung Nusantara</h1>
                        <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-widest">Self-Service Order</p>
                    </div>
                    <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-xl font-bold flex flex-col items-center justify-center min-w-[50px]">
                        <div className="text-[9px] uppercase tracking-wider opacity-80">Meja</div>
                        <div className="text-xl leading-none mt-0.5">{tableNo}</div>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-3 -mx-4 px-4 border-b border-gray-100">
                    <button onClick={() => setActiveKat('all')}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeKat === 'all' ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        Semua Menu
                    </button>
                    {kategori.map(k => (
                        <button key={k.id} onClick={() => setActiveKat(k.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeKat === k.id ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {k.icon} {k.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu List */}
            <div className="flex-1 p-4 bg-gray-50/50">
                {loading ? (
                    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
                ) : filteredMenus.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 font-medium">Tidak ada menu di kategori ini.</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {filteredMenus.map(m => {
                            const isOut = m.use_stock && m.stock_qty <= 0;
                            const inCart = cart.find(c => c.id === m.id);
                            
                            return (
                                <div key={m.id} className={`bg-white rounded-2xl p-4 border border-gray-100 flex gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${isOut ? 'opacity-50 grayscale-[50%]' : ''}`}>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">{m.kategori?.name}</div>
                                        <h3 className="font-bold text-gray-900 text-base mb-1">{m.name}</h3>
                                        <div className="font-black text-gray-900 text-sm mt-2">{formatRupiah(m.price)}</div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end justify-end w-24">
                                        {isOut ? (
                                            <div className="w-full text-center py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-full">Habis</div>
                                        ) : inCart ? (
                                            <div className="flex items-center justify-between bg-white rounded-full p-1 border border-orange-200 shadow-sm w-full">
                                                <button onClick={() => updateQty(m.id, -1)} className="w-7 h-7 bg-orange-50 text-orange-600 rounded-full font-bold text-lg flex items-center justify-center">-</button>
                                                <span className="font-bold text-orange-800 text-sm">{inCart.qty}</span>
                                                <button onClick={() => updateQty(m.id, 1)} className="w-7 h-7 bg-orange-500 text-white rounded-full shadow-sm font-bold text-lg flex items-center justify-center">+</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => addToCart(m)} className="w-full bg-orange-50 text-orange-600 py-1.5 rounded-full text-xs font-bold hover:bg-orange-100 transition-colors">
                                                Tambah
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cart Bottom Sheet */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-5 z-50 animate-slide-up border-t border-gray-100 max-h-[85vh] flex flex-col">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5"></div>
                    
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="font-black text-xl text-gray-900">Pesanan Anda</h3>
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">{cart.reduce((s,c)=>s+c.qty, 0)} item</span>
                    </div>

                    <div className="overflow-y-auto no-scrollbar mb-5 space-y-3">
                        {cart.map(c => (
                            <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                <div className="flex-1 pr-3">
                                    <div className="font-bold text-sm text-gray-900 line-clamp-1">{c.name}</div>
                                    <div className="text-xs text-gray-500 font-medium mt-0.5">{formatRupiah(c.price)}</div>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 rounded-full px-1 py-1 border border-gray-100">
                                    <button onClick={() => updateQty(c.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white text-gray-600 rounded-full shadow-sm font-bold">-</button>
                                    <span className="text-sm font-bold w-4 text-center">{c.qty}</span>
                                    <button onClick={() => updateQty(c.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white text-gray-600 rounded-full shadow-sm font-bold">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-auto space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold">Total Pembayaran</span>
                            <span className="text-2xl font-black text-gray-900">{formatRupiah(totalAmount)}</span>
                        </div>

                        <div className="space-y-2">
                            <input 
                                type="text" 
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value.toUpperCase())}
                                placeholder="Siapa nama Anda?"
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all placeholder:font-normal uppercase"
                            />
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting || !customerName.trim()}
                            className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl text-base shadow-[0_8px_20px_rgba(249,115,22,0.3)] disabled:opacity-50 disabled:shadow-none hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                            {isSubmitting ? 'Memproses...' : (
                                <>
                                    <span>Kirim Pesanan</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
