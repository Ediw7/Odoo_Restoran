import React, { useState, useEffect } from "react";
import { api, formatRupiah, formatTime, getStatusLabel, getStatusColor, getTypeLabel } from "../api";

export default function Orders({ cabangId }) {
    const [orders, setOrders] = useState([]);
    const [filterState, setFilterState] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [page, setPage] = useState(1);
    const limit = 15;
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [tempOrderId, setTempOrderId] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        const offset = (page - 1) * limit;
        const res = await api.getOrders(cabangId, filterState, filterDate, limit, offset);
        if (res?.status === 'success') {
            let data = res.data;
            if (filterType) data = data.filter(o => o.order_type === filterType);
            setOrders(data);
            setTotalOrders(res.total || 0);
        }
        setLoading(false);
    };

    useEffect(() => { setPage(1); }, [cabangId, filterState, filterType, filterDate]);
    useEffect(() => { fetchOrders(); }, [cabangId, filterState, filterType, filterDate, page]);

    const changeOrderState = async (id, action, params = {}) => {
        const res = await api.updateOrderStatus(id, action, params);
        if (res?.status === 'success') {
            setShowPaymentModal(false); setTempOrderId(null); fetchOrders();
            if (selectedOrder?.id === id) setSelectedOrder(null);
        } else alert("Gagal: " + (res?.message || 'Error'));
    };

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Kelola dan pantau status pesanan.</p>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 h-[38px]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tanggal</label>
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                            className="bg-transparent text-sm outline-none cursor-pointer text-gray-700" />
                        {filterDate && (
                            <button onClick={() => setFilterDate("")} className="text-gray-300 hover:text-gray-500 text-xs ml-1">×</button>
                        )}
                    </div>
                    {/* Presets can be buttons instead of dropdown if needed, but for now just date picker & all */}
                    <button onClick={() => setFilterDate("")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!filterDate ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Semua Waktu
                    </button>
                    <select value={filterState} onChange={e => setFilterState(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 cursor-pointer">
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option><option value="confirmed">Dikonfirmasi</option>
                        <option value="preparing">Disiapkan</option><option value="ready">Siap Saji</option>
                        <option value="done">Selesai</option><option value="cancelled">Dibatalkan</option>
                    </select>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 cursor-pointer">
                        <option value="">Semua Tipe</option>
                        <option value="dine_in">Dine In</option><option value="take_away">Take Away</option><option value="delivery">Delivery</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
            ) : orders.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-500">Tidak ada pesanan</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {orders.map(o => {
                        let actionBtn = null;
                        if (o.state === 'draft') actionBtn = <button onClick={e => { e.stopPropagation(); changeOrderState(o.id, 'confirm') }} className="w-full py-2 text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors">Konfirmasi</button>;
                        else if (o.state === 'confirmed') actionBtn = <button onClick={e => { e.stopPropagation(); changeOrderState(o.id, 'prepare') }} className="w-full py-2 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 rounded-lg transition-colors">Mulai Masak</button>;
                        else if (o.state === 'preparing') actionBtn = <button onClick={e => { e.stopPropagation(); changeOrderState(o.id, 'ready') }} className="w-full py-2 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors">Siap Saji</button>;
                        else if (o.state === 'ready') actionBtn = <button onClick={e => { e.stopPropagation(); if (o.payment_method) { changeOrderState(o.id, 'done', { payment_method: o.payment_method }); } else { setTempOrderId(o.id); setShowPaymentModal(true); } }} className="w-full py-2 text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg transition-colors">Selesaikan</button>;

                        return (
                            <div key={o.id} onClick={() => setSelectedOrder(o)}
                                className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer flex flex-col h-full">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-sm">{o.name}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{o.cabang.name.split('-').pop().trim()}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(o.state)}`}>{getStatusLabel(o.state)}</span>
                                </div>
                                <div className="flex-1 space-y-1 mb-3 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">Tipe</span><span className="text-gray-600">{getTypeLabel(o.order_type)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">Pelanggan</span><span className="text-gray-600 truncate max-w-[120px]">{o.customer_name || 'Walk-in'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">Waktu</span><span className="text-gray-600">{formatTime(o.order_date)}</span></div>
                                </div>
                                <div className="mt-auto pt-3 border-t border-gray-50">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-gray-400">Total</span>
                                        <span className="font-semibold text-gray-800">{formatRupiah(o.total_amount)}</span>
                                    </div>
                                    {actionBtn && <div onClick={e => e.stopPropagation()}>{actionBtn}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalOrders > limit && (
                <div className="mt-6 flex items-center justify-between mx-auto max-w-md bg-white border border-gray-100 p-2 rounded-xl">
                    <button disabled={page === 1} onClick={() => setPage(page - 1)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 disabled:text-gray-300 disabled:bg-transparent hover:bg-gray-50 rounded-lg transition-colors">
                        Sebelumnya
                    </button>
                    <span className="text-sm font-semibold text-gray-500">
                        {page} / {Math.ceil(totalOrders / limit)}
                    </span>
                    <button disabled={page * limit >= totalOrders} onClick={() => setPage(page + 1)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 disabled:text-gray-300 disabled:bg-transparent hover:bg-gray-50 rounded-lg transition-colors">
                        Selanjutnya
                    </button>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/30 z-[300] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg animate-scale-in">
                        <h2 className="font-semibold text-gray-800 mb-1">Metode Pembayaran</h2>
                        <p className="text-sm text-gray-400 mb-5">Pilih metode untuk menyelesaikan transaksi.</p>
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            {[{ id: 'cash', label: 'Tunai' }, { id: 'qris', label: 'QRIS' }, { id: 'card', label: 'Kartu' }, { id: 'transfer', label: 'Transfer' }].map(m => (
                                <button key={m.id} onClick={() => changeOrderState(tempOrderId, 'done', { payment_method: m.id })}
                                    className="p-4 border border-gray-200 rounded-xl bg-white hover:bg-orange-50 hover:border-orange-300 transition-all text-left font-medium text-sm text-gray-700">{m.label}</button>
                            ))}
                        </div>
                        <button onClick={() => setShowPaymentModal(false)} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">Batal</button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/30 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-gray-800">{selectedOrder.name}</h2>
                                <p className="text-sm text-gray-400">{formatTime(selectedOrder.order_date)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedOrder.state)}`}>{getStatusLabel(selectedOrder.state)}</span>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-lg px-2">×</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                <InfoBox label="Cabang" value={selectedOrder.cabang.name.split('-').pop().trim()} />
                                <InfoBox label="Tipe" value={getTypeLabel(selectedOrder.order_type)} />
                                <InfoBox label="Pelanggan" value={selectedOrder.customer_name || 'Walk-in'} />
                                <InfoBox label="Meja" value={selectedOrder.table_number || '-'} />
                                <InfoBox label="Kasir" value={selectedOrder.cashier || '-'} />
                                <InfoBox label="Bayar" value={(selectedOrder.payment_method || '-').toUpperCase()} />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-6">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="border-b border-gray-100 bg-gray-50">
                                        <tr>
                                            <th className="py-3 px-4 text-xs font-medium text-gray-400">Menu</th>
                                            <th className="py-3 px-4 text-xs font-medium text-gray-400 text-center w-20">Qty</th>
                                            <th className="py-3 px-4 text-xs font-medium text-gray-400 text-right w-28">Harga</th>
                                            <th className="py-3 px-4 text-xs font-medium text-gray-400 text-right w-32">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {selectedOrder.lines.map(l => (
                                            <tr key={l.id}>
                                                <td className="py-3 px-4 text-sm text-gray-700">{l.menu.name}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600 text-center font-medium">{l.qty}</td>
                                                <td className="py-3 px-4 text-sm text-gray-400 text-right">{formatRupiah(l.price)}</td>
                                                <td className="py-3 px-4 text-sm text-gray-700 text-right font-medium">{formatRupiah(l.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end">
                                <div className="w-full max-w-xs space-y-1 text-sm">
                                    <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="text-gray-600">{formatRupiah(selectedOrder.subtotal)}</span></div>
                                    <div className="flex justify-between text-gray-400"><span>Pajak (10%)</span><span className="text-gray-600">{formatRupiah(selectedOrder.tax_amount)}</span></div>
                                    <div className="flex justify-between pt-2 border-t border-gray-100 mt-1 font-semibold text-gray-800"><span>Total</span><span>{formatRupiah(selectedOrder.total_amount)}</span></div>
                                </div>
                            </div>
                        </div>
                        {selectedOrder.state === 'draft' && (
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                                <button onClick={() => changeOrderState(selectedOrder.id, 'cancel')} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button>
                                <button onClick={() => changeOrderState(selectedOrder.id, 'confirm')} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">Konfirmasi</button>
                            </div>
                        )}
                        {selectedOrder.state === 'ready' && (
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                                <button onClick={() => {
                                    if (selectedOrder.payment_method) {
                                        changeOrderState(selectedOrder.id, 'done', { payment_method: selectedOrder.payment_method });
                                    } else {
                                        setTempOrderId(selectedOrder.id); setShowPaymentModal(true);
                                    }
                                }} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                                    {selectedOrder.payment_method ? 'Selesaikan' : 'Selesaikan & Bayar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoBox({ label, value }) {
    return (
        <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="font-medium text-gray-700 text-sm truncate">{value}</div>
        </div>
    );
}