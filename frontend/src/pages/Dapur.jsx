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
        <div className="animate-fade-in pb-10">
            {kitchenOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] opacity-60">
                    <span className="text-4xl mb-4 grayscale">🍽️</span>
                    <h3 className="text-lg font-semibold text-gray-700">Tidak Ada Antrean</h3>
                    <p className="text-sm text-gray-400 mt-1">Dapur sedang santai. Belum ada pesanan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {kitchenOrders.map(o => {
                        const isConfirmed = o.state === 'confirmed';
                        const isPreparing = o.state === 'preparing';
                        const isReady = o.state === 'ready';
                        
                        let accentColor = isConfirmed ? 'border-orange-400' : isPreparing ? 'border-blue-400' : 'border-green-400';
                        let buttonClass = isConfirmed ? 'bg-orange-500 hover:bg-orange-600' : isPreparing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500';

                        return (
                        <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                            {/* Header */}
                            <div className="p-4 flex justify-between items-start border-b border-gray-100">
                                <div>
                                    <div className="text-lg font-bold text-gray-800">
                                        {o.table_number ? `Meja ${o.table_number}` : (o.order_type === 'delivery' ? 'Delivery' : 'Take Away')}
                                    </div>
                                    <div className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-2">
                                        <span className="text-gray-700">{o.customer_name || 'Walk-in'}</span>
                                        <span className="text-gray-300">•</span>
                                        <span>{formatTime(o.order_date)}</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getStatusColor(o.state)}`}>
                                    {getStatusLabel(o.state)}
                                </span>
                            </div>

                            {/* Items */}
                            <div className="p-4 flex-1">
                                <ul className="space-y-3">
                                    {o.lines.map(l => (
                                        <li key={l.id} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                                            <div className="text-sm font-semibold text-gray-600 min-w-[1.5rem]">
                                                {l.qty}x
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-800">{l.menu.name}</div>
                                                {l.note && (
                                                    <div className="text-[11px] text-orange-600 font-medium italic mt-1 bg-orange-50/50 px-2 py-1 rounded">
                                                        "{l.note}"
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Action */}
                            <div className="p-4 pt-0">
                                {isConfirmed && (
                                    <button onClick={() => handleUpdateStatus(o.id, 'prepare')} className={`w-full py-2.5 ${buttonClass} text-white rounded-lg font-semibold text-xs tracking-wide transition-colors`}>
                                        Mulai Masak
                                    </button>
                                )}
                                {isPreparing && (
                                    <button onClick={() => handleUpdateStatus(o.id, 'ready')} className={`w-full py-2.5 ${buttonClass} text-white rounded-lg font-semibold text-xs tracking-wide transition-colors`}>
                                        Selesai & Siap Saji
                                    </button>
                                )}
                                {isReady && (
                                    <div className="w-full py-2.5 bg-gray-50 text-gray-500 rounded-lg font-medium text-xs text-center border border-dashed border-gray-200">
                                        Menunggu Diantar
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
}
