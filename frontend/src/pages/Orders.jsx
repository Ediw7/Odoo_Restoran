import React, { useState, useEffect } from "react";
import { api, formatRupiah, formatTime, getStatusLabel, getStatusColor, getTypeLabel } from "../api";

export default function Orders({ cabangId }) {
    const [orders, setOrders] = useState([]);
    const [filterState, setFilterState] = useState("done"); // Default to done for history
    const [filterType, setFilterType] = useState("");
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [page, setPage] = useState(1);
    const limit = 15;
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

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

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <p className="text-sm text-gray-400">Arsip riwayat transaksi pembayaran cabang.</p>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 h-[38px]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tanggal</label>
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                            className="bg-transparent text-sm outline-none cursor-pointer text-gray-700" />
                        {filterDate && (
                            <button onClick={() => setFilterDate("")} className="text-gray-300 hover:text-gray-500 text-xs ml-1">×</button>
                        )}
                    </div>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                        {[
                            { id: 'today', label: 'Hari Ini' },
                            { id: 'week', label: 'Minggu Ini' },
                            { id: 'month', label: 'Bulan Ini' },
                            { id: '', label: 'Semua' }
                        ].map(p => (
                            <button key={p.id} onClick={() => setFilterDate(p.id)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${filterDate === p.id ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
            ) : orders.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-500">Tidak ada riwayat transaksi</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {orders.map(o => (
                        <div key={o.id} onClick={() => setSelectedOrder(o)}
                            className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-800 text-sm">{o.name}</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-tight">{o.cabang.name.split('-').pop().trim()}</p>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                            </div>
                            <div className="flex-1 space-y-1 mb-3 text-sm">
                                <div className="flex justify-between"><span className="text-gray-400">No. Meja</span><span className="text-gray-800 font-bold">{o.table_number || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Pelanggan</span><span className="text-gray-600 truncate max-w-[120px] font-medium">{o.customer_name || 'Walk-in'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Jam Bayar</span><span className="text-gray-600">{formatTime(o.order_date)}</span></div>
                            </div>
                            <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Total Lunas</span>
                                <span className="font-black text-gray-800 text-base">{formatRupiah(o.total_amount)}</span>
                            </div>
                        </div>
                    ))}
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

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/30 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800">Detail Transaksi {selectedOrder.name}</h2>
                                <p className="text-xs text-gray-400">{formatTime(selectedOrder.order_date)} - {new Date(selectedOrder.order_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-lg px-2">×</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                <InfoBox label="Meja" value={selectedOrder.table_number || '-'} />
                                <InfoBox label="Pelanggan" value={selectedOrder.customer_name || 'Walk-in'} />
                                <InfoBox label="Metode Bayar" value={(selectedOrder.payment_method || 'Tunai').toUpperCase()} />
                                <InfoBox label="Kasir / Entry" value={selectedOrder.cashier || '-'} />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-6">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="border-b border-gray-100 bg-gray-50">
                                        <tr>
                                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase">Item Pesanan</th>
                                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-center w-20">Qty</th>
                                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-right w-28">Harga</th>
                                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase text-right w-32">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {selectedOrder.lines.map(l => (
                                            <tr key={l.id}>
                                                <td className="py-3 px-4 text-xs font-medium text-gray-700">{l.menu.name}</td>
                                                <td className="py-3 px-4 text-xs text-gray-600 text-center font-bold">{l.qty}</td>
                                                <td className="py-3 px-4 text-xs text-gray-400 text-right">{formatRupiah(l.price)}</td>
                                                <td className="py-3 px-4 text-xs text-gray-800 text-right font-black">{formatRupiah(l.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end p-4 bg-gray-50 rounded-xl">
                                <div className="w-full max-w-xs space-y-1 text-sm">
                                    <div className="flex justify-between text-gray-400 text-xs font-medium uppercase"><span>Subtotal</span><span className="text-gray-600 font-bold">{formatRupiah(selectedOrder.subtotal)}</span></div>
                                    <div className="flex justify-between text-gray-400 text-xs font-medium uppercase"><span>Pajak (10%)</span><span className="text-gray-600 font-bold">{formatRupiah(selectedOrder.tax_amount)}</span></div>
                                    <div className="flex justify-between pt-3 border-t border-gray-200 mt-2">
                                        <span className="font-black text-gray-500 text-xs uppercase pt-1">Total Tunai</span>
                                        <span className="text-2xl font-black text-orange-600">{formatRupiah(selectedOrder.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
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