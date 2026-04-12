import React, { useState, useEffect } from "react";
import { api, formatTime, getTypeLabel, getStatusLabel, getStatusColor } from "../api";

export default function Kitchen({ cabangId }) {
    const [kitchenOrders, setKitchenOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [preparingCount, setPreparingCount] = useState(0);
    const [readyCount, setReadyCount] = useState(0);

    const fetchKitchenOrders = async () => {
        setLoading(true);
        let url = '/api/orders?limit=100';
        if (cabangId) url += `&cabang_id=${cabangId}`;
        const res = await api.apiFetch(url);
        if (res?.status === 'success') {
            const active = res.data.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.state));
            setKitchenOrders(active);
            setPendingCount(active.filter(o => o.state === 'confirmed').length);
            setPreparingCount(active.filter(o => o.state === 'preparing').length);
            setReadyCount(active.filter(o => o.state === 'ready').length);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchKitchenOrders();
        const interval = setInterval(fetchKitchenOrders, 10000);
        return () => clearInterval(interval);
    }, [cabangId]);

    const changeOrderState = async (id, action) => {
        const res = await api.updateOrderStatus(id, action);
        if (res?.status === 'success') fetchKitchenOrders();
        else alert("Gagal: " + (res?.message || 'Error'));
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <p className="text-sm text-gray-400">Auto-refresh setiap 10 detik.</p>
                <div className="flex gap-6">
                    <div><span className="text-xl font-bold text-gray-800">{pendingCount}</span> <span className="text-xs text-gray-400">Menunggu</span></div>
                    <div><span className="text-xl font-bold text-gray-800">{preparingCount}</span> <span className="text-xs text-gray-400">Dimasak</span></div>
                    <div><span className="text-xl font-bold text-gray-800">{readyCount}</span> <span className="text-xs text-gray-400">Siap</span></div>
                </div>
            </div>

            {loading && kitchenOrders.length === 0 ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
            ) : kitchenOrders.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-500">Dapur Kosong</p>
                    <p className="text-sm text-gray-400 mt-1">Pesanan baru akan otomatis muncul.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                    {kitchenOrders.map(o => (
                        <div key={o.id} className="bg-white border border-gray-100 rounded-xl flex flex-col overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all">
                            <div className="p-4 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
                                <div>
                                    <h3 className="font-semibold text-gray-800 text-sm">{o.name}</h3>
                                    <p className="text-xs text-gray-400">{getTypeLabel(o.order_type)} {o.table_number ? `· Meja ${o.table_number}` : ''}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(o.state)}`}>{getStatusLabel(o.state)}</span>
                                    <p className="text-xs text-gray-400 mt-1">{formatTime(o.order_date)}</p>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col gap-2.5">
                                {o.lines.map(line => (
                                    <div key={line.id} className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-700 text-sm">{line.menu.name}</p>
                                            {line.note && <p className="text-xs text-gray-400 mt-0.5 bg-gray-50 inline-block px-1.5 py-0.5 rounded">Catatan: {line.note}</p>}
                                        </div>
                                        <span className="font-semibold text-gray-800 text-sm">x{line.qty}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 pt-0">
                                <button
                                    onClick={() => o.state === 'confirmed' ? changeOrderState(o.id, 'prepare') : o.state === 'preparing' ? changeOrderState(o.id, 'ready') : changeOrderState(o.id, 'done')}
                                    className={`w-full py-2 rounded-lg text-xs font-medium transition-colors border ${o.state === 'confirmed' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                                            o.state === 'preparing' ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' :
                                                'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                        }`}>
                                    {o.state === 'confirmed' ? 'Mulai Masak' : o.state === 'preparing' ? 'Siap Saji' : 'Selesaikan'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}