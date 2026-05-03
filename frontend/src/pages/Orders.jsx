import React, { useState, useEffect } from "react";
import { api, formatRupiah, formatTime, getStatusLabel, getStatusColor, getTypeLabel } from "../api";

export default function Orders({ cabangId, userRole }) {
    const [orders, setOrders] = useState([]);
    const [cabangList, setCabangList] = useState([]);
    const isOwner = userRole === 'owner' || userRole === 'admin';
    const [selectedCabang, setSelectedCabang] = useState(cabangId || "");
    const [filterState, setFilterState] = useState("done"); 
    const [filterType, setFilterType] = useState("");
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [page, setPage] = useState(1);
    const limit = 15;
    const [totalOrders, setTotalOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchData = async () => {
        if (isOwner) {
            const cs = await api.getCabang();
            if (cs?.status === 'success') setCabangList(cs.data);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        const offset = (page - 1) * limit;
        const branchToUse = isOwner ? selectedCabang : cabangId;
        const res = await api.getOrders(branchToUse, filterState, filterDate, limit, offset);
        if (res?.status === 'success') {
            let data = res.data;
            if (filterType) data = data.filter(o => o.order_type === filterType);
            setOrders(data);
            setTotalOrders(res.total || 0);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { setPage(1); }, [selectedCabang, filterState, filterType, filterDate]);
    useEffect(() => { fetchOrders(); }, [selectedCabang, filterState, filterType, filterDate, page]);

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-400">Arsip riwayat transaksi pembayaran cabang.</p>
                    {isOwner && (
                    <div className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm w-fit">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Outlet</span>
                        <select 
                            value={selectedCabang} 
                            onChange={(e) => setSelectedCabang(e.target.value)}
                            className="bg-transparent border-none p-0 text-sm font-bold text-gray-700 outline-none focus:ring-0 cursor-pointer min-w-[150px]"
                        >
                            <option value="">Semua Cabang (Global)</option>
                            {cabangList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 h-[42px] shadow-sm">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tanggal</label>
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                            className="bg-transparent text-xs font-bold outline-none cursor-pointer text-gray-700" />
                        {filterDate && (
                            <button onClick={() => setFilterDate("")} className="text-gray-300 hover:text-gray-500 text-xs ml-1">×</button>
                        )}
                    </div>
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-sm">
                        {[
                            { id: 'today', label: 'Hari Ini' },
                            { id: 'week', label: 'Minggu Ini' },
                            { id: 'month', label: 'Bulan Ini' },
                            { id: '', label: 'Semua' }
                        ].map(p => (
                            <button key={p.id} onClick={() => setFilterDate(p.id)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${filterDate === p.id ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
            ) : orders.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="font-medium text-gray-500">Tidak ada riwayat transaksi</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {orders.map(o => (
                        <div key={o.id} onClick={() => setSelectedOrder(o)}
                            className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer flex flex-col h-full group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm group-hover:text-orange-600 transition-colors">{o.name}</h3>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">{o.cabang.name}</p>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></span>
                            </div>
                            <div className="flex-1 space-y-2 mb-4 text-xs">
                                <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-400">No. Meja</span><span className="text-gray-800 font-bold">{o.table_number || '-'}</span></div>
                                <div className="flex justify-between border-b border-gray-50 pb-1.5"><span className="text-gray-400">Pelanggan</span><span className="text-gray-700 truncate max-w-[120px] font-semibold">{o.customer_name || 'Walk-in'}</span></div>
                                <div className="flex justify-between pb-1"><span className="text-gray-400">Jam Bayar</span><span className="text-gray-600 font-medium">{formatTime(o.order_date)}</span></div>
                            </div>
                            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Total Lunas</span>
                                <span className="font-bold text-gray-800 text-base">{formatRupiah(o.total_amount)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalOrders > limit && (
                <div className="mt-8 flex items-center justify-between mx-auto max-w-md bg-white border border-gray-100 p-2 rounded-xl shadow-sm">
                    <button disabled={page === 1} onClick={() => setPage(page - 1)}
                        className="px-5 py-2 text-xs font-bold text-gray-600 disabled:text-gray-300 disabled:bg-transparent hover:bg-gray-50 rounded-lg transition-colors">
                        Sebelumnya
                    </button>
                    <span className="text-xs font-bold text-gray-400">
                        HALAMAN <span className="text-gray-800">{page}</span> DARI {Math.ceil(totalOrders / limit)}
                    </span>
                    <button disabled={page * limit >= totalOrders} onClick={() => setPage(page + 1)}
                        className="px-5 py-2 text-xs font-bold text-gray-600 disabled:text-gray-300 disabled:bg-transparent hover:bg-gray-50 rounded-lg transition-colors">
                        Selanjutnya
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">Detail Transaksi {selectedOrder.name}</h2>
                                <p className="text-xs text-gray-400 mt-1 font-medium">{formatTime(selectedOrder.order_date)} &bull; {new Date(selectedOrder.order_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-colors text-2xl">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <InfoBox label="Meja" value={selectedOrder.table_number || '-'} />
                                <InfoBox label="Pelanggan" value={selectedOrder.customer_name || 'Walk-in'} />
                                <InfoBox label="Metode Bayar" value={(selectedOrder.payment_method || 'Tunai').toUpperCase()} />
                                <InfoBox label="Kasir / Entry" value={selectedOrder.cashier || '-'} />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-8 shadow-sm">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="border-b border-gray-50 bg-gray-50/50">
                                        <tr>
                                            <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase">Item Pesanan</th>
                                            <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase text-center w-20">Qty</th>
                                            <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase text-right w-28">Harga</th>
                                            <th className="py-4 px-6 text-[10px] font-bold text-gray-700 uppercase text-right w-32">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {selectedOrder.lines.map(l => (
                                            <tr key={l.id}>
                                                <td className="py-4 px-6 text-xs font-semibold text-gray-700">{l.menu.name}</td>
                                                <td className="py-4 px-6 text-xs text-gray-600 text-center font-bold">{l.qty}</td>
                                                <td className="py-4 px-6 text-xs text-gray-400 text-right font-medium">{formatRupiah(l.price)}</td>
                                                <td className="py-4 px-6 text-xs text-gray-800 text-right font-bold">{formatRupiah(l.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="w-full max-w-xs space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-400 text-[10px] font-bold uppercase tracking-wider"><span>Subtotal</span><span className="text-gray-600 font-bold">{formatRupiah(selectedOrder.subtotal)}</span></div>
                                    <div className="flex justify-between text-gray-400 text-[10px] font-bold uppercase tracking-wider"><span>Pajak (10%)</span><span className="text-gray-600 font-bold">{formatRupiah(selectedOrder.tax_amount)}</span></div>
                                    <div className="flex justify-between pt-4 border-t border-gray-200 mt-2">
                                        <span className="font-bold text-gray-500 text-xs uppercase pt-1.5">Total Akhir</span>
                                        <span className="text-2xl font-bold text-orange-600">{formatRupiah(selectedOrder.total_amount)}</span>
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