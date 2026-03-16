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
        if (res && res.status === 'success') {
            const activeStates = ['confirmed', 'preparing', 'ready'];
            const activeOrders = res.data.filter(o => activeStates.includes(o.state));

            setKitchenOrders(activeOrders);
            setPendingCount(activeOrders.filter(o => o.state === 'confirmed').length);
            setPreparingCount(activeOrders.filter(o => o.state === 'preparing').length);
            setReadyCount(activeOrders.filter(o => o.state === 'ready').length);
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
        if (res?.status === 'success') {
            fetchKitchenOrders();
        } else {
            alert("Gagal update status: " + (res?.message || 'Error'));
        }
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dapur</h1>
                    <p className="text-sm text-slate-500 mt-1">Pantau dan kelola pesanan yang masuk.</p>
                </div>

                <div className="flex gap-8">
                    <div className="flex flex-col">
                        <span className="text-3xl font-light text-slate-800 leading-none">{pendingCount}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Menunggu</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-light text-slate-800 leading-none">{preparingCount}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Diproses</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-light text-slate-800 leading-none">{readyCount}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Siap Saji</span>
                    </div>
                </div>
            </div>

            {loading && kitchenOrders.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                        <div className="text-sm font-medium text-slate-500">Memuat pesanan...</div>
                    </div>
                </div>
            ) : kitchenOrders.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <span className="text-slate-300 text-xl">/</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">Dapur Kosong</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">Belum ada pesanan aktif saat ini. Pesanan baru akan otomatis muncul di sini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
                    {kitchenOrders.map(o => (
                        <div key={o.id} className="bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden h-full shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{o.name}</h3>
                                    <p className="text-xs font-medium text-slate-500">
                                        {getTypeLabel(o.order_type)} {o.table_number ? `· Meja ${o.table_number}` : ''}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${getStatusColor(o.state)}`}>
                                        {getStatusLabel(o.state)}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-400 mt-2">{formatTime(o.order_date)}</span>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col gap-4">
                                {o.lines.map(line => (
                                    <div key={line.id} className="flex justify-between items-start gap-4">
                                        <div>
                                            <p className="font-semibold text-slate-700 text-sm leading-snug">{line.menu.name}</p>
                                            {line.note && <p className="text-[11px] text-slate-500 mt-1 bg-slate-50 inline-block px-1.5 py-0.5 rounded">Catatan: {line.note}</p>}
                                        </div>
                                        <span className="font-bold text-slate-800 text-sm">x{line.qty}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 pt-0">
                                <button
                                    onClick={() => o.state === 'confirmed' ? changeOrderState(o.id, 'prepare') : o.state === 'preparing' ? changeOrderState(o.id, 'ready') : changeOrderState(o.id, 'done')}
                                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${o.state === 'confirmed' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' :
                                            o.state === 'preparing' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' :
                                                'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                        }`}>
                                    {o.state === 'confirmed' ? 'Mulai Masak' : o.state === 'preparing' ? 'Tandai Siap Saji' : 'Selesaikan Order'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}