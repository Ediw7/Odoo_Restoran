import React, { useState, useEffect } from "react";
import { api, getStatusLabel, getStatusColor, formatTime } from "../api";

export default function Dapur({ cabangId }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        const res = await api.getOrders(cabangId, 'active', 'all', 50, 0); // Ambil maks 50 order aktif
        if (res?.status === 'success') {
            setOrders(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
        // Polling setiap 10 detik agar dapur selalu update otomatis
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [cabangId]);

    const handleUpdateStatus = async (orderId, action) => {
        const res = await api.updateOrderStatus(orderId, action);
        if (res?.status === 'success') {
            fetchOrders();
        } else {
            alert("Gagal update status: " + (res?.message || 'Error'));
        }
    };

    if (loading && orders.length === 0) {
        return (
            <div className="flex justify-center items-center h-40">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Filter status yang relevan untuk dapur
    const kitchenOrders = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.state)).reverse();

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Dapur (Kitchen Display)</h2>
                <button onClick={fetchOrders} className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                    <span>↻</span> Segarkan
                </button>
            </div>

            {kitchenOrders.length === 0 ? (
                <div className="bg-white border rounded-xl py-20 text-center shadow-sm">
                    <div className="text-4xl mb-3">🍳</div>
                    <p className="text-gray-500 font-medium">Belum ada pesanan masuk</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {kitchenOrders.map(o => (
                        <div key={o.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all">
                            <div className="px-3 py-2.5 bg-gray-50/80 flex justify-between items-center border-b border-gray-100">
                                <div>
                                    <div className="text-sm font-black text-gray-800 leading-tight">{o.table_number ? `Meja ${o.table_number}` : (o.order_type === 'delivery' ? 'Delivery' : 'Take Away')}</div>
                                    <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mt-0.5">{o.customer_name || 'Walk-in'}</div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded ${getStatusColor(o.state)}`}>
                                        {getStatusLabel(o.state)}
                                    </span>
                                    <div className="text-[9px] text-gray-400 font-medium mt-1">{formatTime(o.order_date)}</div>
                                </div>
                            </div>

                            <div className="p-3 flex-1 overflow-y-auto">
                                <ul className="space-y-1.5">
                                    {o.lines.map(l => (
                                        <li key={l.id} className="flex flex-col">
                                            <div className="flex justify-between items-start text-xs">
                                                <div className="flex gap-1.5">
                                                    <span className="font-bold text-orange-500">{l.qty}x</span>
                                                    <span className="font-semibold text-gray-700">{l.menu.name}</span>
                                                </div>
                                            </div>
                                            {l.note && <div className="text-[10px] text-gray-400 italic ml-4 mt-0.5">"{l.note}"</div>}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-2 border-t border-gray-50 bg-white shrink-0">
                                {o.state === 'confirmed' && (
                                    <button onClick={() => handleUpdateStatus(o.id, 'prepare')} className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold text-[10px] shadow-sm uppercase tracking-widest transition-colors">
                                        Masak Pesanan
                                    </button>
                                )}
                                {o.state === 'preparing' && (
                                    <button onClick={() => handleUpdateStatus(o.id, 'ready')} className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-[10px] shadow-sm uppercase tracking-widest transition-colors">
                                        Siap Saji
                                    </button>
                                )}
                                {o.state === 'ready' && (
                                    <div className="w-full py-2 bg-gray-50 text-gray-400 rounded-lg font-bold text-[10px] text-center border border-dashed border-gray-200 uppercase tracking-widest">
                                        Menunggu Kasir
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
