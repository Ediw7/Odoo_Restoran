import React, { useState, useEffect } from "react";
import { api, formatRupiah, formatTime, getStatusLabel, getStatusColor, getTypeLabel } from "../api";

export default function Orders({ cabangId }) {
    const [orders, setOrders] = useState([]);
    const [filterState, setFilterState] = useState("");
    const [filterType, setFilterType] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        let url = '/api/orders?limit=100';
        if (cabangId) url += `&cabang_id=${cabangId}`;
        if (filterState) url += `&state=${filterState}`;

        const res = await api.apiFetch(url);
        if (res && res.status === 'success') {
            let data = res.data;
            if (filterType) data = data.filter(o => o.order_type === filterType);
            setOrders(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, [cabangId, filterState, filterType]);

    const changeOrderState = async (id, action) => {
        const res = await api.updateOrderStatus(id, action);
        if (res?.status === 'success') {
            fetchOrders();
            if (selectedOrder && selectedOrder.id === id) {
                const updatedOrderRes = await api.apiFetch(`/api/orders/${id}`);
                if (updatedOrderRes?.status === 'success') {
                    setSelectedOrder(updatedOrderRes.data);
                } else {
                    setSelectedOrder(null);
                }
            }
        } else {
            alert("Gagal update status: " + (res?.message || 'Error'));
        }
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Daftar Pesanan</h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola dan pantau status pesanan pelanggan.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <select
                        value={filterState}
                        onChange={e => setFilterState(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 outline-none transition-all cursor-pointer min-w-[140px]"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="confirmed">Dikonfirmasi</option>
                        <option value="preparing">Disiapkan</option>
                        <option value="ready">Siap Saji</option>
                        <option value="done">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 outline-none transition-all cursor-pointer min-w-[140px]"
                    >
                        <option value="">Semua Tipe</option>
                        <option value="dine_in">Dine In</option>
                        <option value="take_away">Take Away</option>
                        <option value="delivery">Delivery</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                        <div className="text-sm font-medium text-slate-500">Memuat pesanan...</div>
                    </div>
                </div>
            ) : orders.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <span className="text-slate-300 text-xl">/</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">Tidak ada pesanan</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">Belum ada pesanan yang sesuai dengan filter saat ini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {orders.map(o => {
                        let actionBtn = null;
                        if (o.state === 'draft') {
                            actionBtn = <button onClick={(e) => { e.stopPropagation(); changeOrderState(o.id, 'confirm') }} className="w-full py-2.5 text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition-colors">Konfirmasi Order</button>;
                        } else if (o.state === 'confirmed') {
                            actionBtn = <button onClick={(e) => { e.stopPropagation(); changeOrderState(o.id, 'prepare') }} className="w-full py-2.5 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl transition-colors">Mulai Masak</button>;
                        } else if (o.state === 'preparing') {
                            actionBtn = <button onClick={(e) => { e.stopPropagation(); changeOrderState(o.id, 'ready') }} className="w-full py-2.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors">Tandai Siap Saji</button>;
                        } else if (o.state === 'ready') {
                            actionBtn = <button onClick={(e) => { e.stopPropagation(); changeOrderState(o.id, 'done') }} className="w-full py-2.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors">Selesaikan Order</button>;
                        }

                        return (
                            <div
                                key={o.id}
                                onClick={() => setSelectedOrder(o)}
                                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
                            >
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{o.name}</h3>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">{o.cabang.name.split('-').pop().trim()}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${getStatusColor(o.state)}`}>
                                        {getStatusLabel(o.state)}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-2.5 mb-6">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Tipe</span>
                                        <span className="font-medium text-slate-700">{getTypeLabel(o.order_type)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Pelanggan</span>
                                        <span className="font-medium text-slate-700 truncate max-w-[120px]">{o.customer_name || 'Walk-in'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Waktu</span>
                                        <span className="font-medium text-slate-700">{formatTime(o.order_date)}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-50">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Tagihan</span>
                                        <span className="font-bold text-base text-slate-800">{formatRupiah(o.total_amount)}</span>
                                    </div>
                                    {actionBtn && (
                                        <div onClick={e => e.stopPropagation()}>
                                            {actionBtn}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-6" onClick={() => setSelectedOrder(null)}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-slide-up border border-slate-100"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">{selectedOrder.name}</h2>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{formatTime(selectedOrder.order_date)}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${getStatusColor(selectedOrder.state)}`}>
                                    {getStatusLabel(selectedOrder.state)}
                                </span>
                                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-700 transition-colors text-lg px-2">
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <InfoBox label="Cabang" value={selectedOrder.cabang.name.split('-').pop().trim()} />
                                <InfoBox label="Tipe Order" value={getTypeLabel(selectedOrder.order_type)} />
                                <InfoBox label="Pelanggan" value={selectedOrder.customer_name || 'Walk-in'} />
                                <InfoBox label="No. Meja" value={selectedOrder.table_number || '-'} />
                                <InfoBox label="Kasir" value={selectedOrder.cashier || '-'} />
                                <InfoBox label="Pembayaran" value={selectedOrder.payment_method || '-'} className="capitalize" />
                            </div>

                            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-8">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                        <thead className="border-b border-slate-100">
                                            <tr>
                                                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Item Menu</th>
                                                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center w-24">Qty</th>
                                                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right w-32">Harga</th>
                                                <th className="py-4 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right w-36">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedOrder.lines.map(l => (
                                                <tr key={l.id}>
                                                    <td className="py-4 px-5">
                                                        <div className="font-medium text-slate-800 text-sm">{l.menu.name}</div>
                                                        {l.note && <div className="text-[11px] text-slate-500 mt-1.5 bg-slate-50 inline-block px-2 py-1 rounded">Note: {l.note}</div>}
                                                    </td>
                                                    <td className="py-4 px-5 text-center font-semibold text-slate-700 text-sm">{l.qty}</td>
                                                    <td className="py-4 px-5 text-right text-slate-500 text-sm">{formatRupiah(l.price)}</td>
                                                    <td className="py-4 px-5 text-right text-slate-800 font-semibold text-sm">{formatRupiah(l.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <div className="w-full max-w-xs space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="font-medium text-slate-700">{formatRupiah(selectedOrder.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Pajak (10%)</span>
                                        <span className="font-medium text-slate-700">{formatRupiah(selectedOrder.tax_amount)}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 mt-1 border-t border-slate-200">
                                        <span className="font-semibold text-slate-800 text-sm">Total Tagihan</span>
                                        <span className="font-bold text-slate-900 text-base">{formatRupiah(selectedOrder.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedOrder.state === 'draft' && (
                            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => changeOrderState(selectedOrder.id, 'cancel')} className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">Batalkan Pesanan</button>
                                <button onClick={() => changeOrderState(selectedOrder.id, 'confirm')} className="px-5 py-2 text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition-colors">Konfirmasi Order</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoBox({ label, value, className = "" }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100">
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{label}</div>
            <div className={`font-medium text-slate-800 text-sm truncate ${className}`}>{value}</div>
        </div>
    );
}