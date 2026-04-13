import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function Report({ cabangId }) {
    const [filterMode, setFilterMode] = useState('day'); // day, month, year
    const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        const res = await api.getFinanceReport(cabangId, filterMode, filterValue);
        if (res?.status === 'success') setData(res.data);
        setLoading(false);
    };

    useEffect(() => { fetchReport(); }, [cabangId, filterMode, filterValue]);

    const handleModeChange = (mode) => {
        setFilterMode(mode);
        const now = new Date();
        if (mode === 'day') setFilterValue(now.toISOString().split('T')[0]);
        else if (mode === 'month') setFilterValue(now.toISOString().slice(0, 7));
        else if (mode === 'year') setFilterValue(now.getFullYear().toString());
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>;
    if (!data) return <div className="py-20 text-center text-gray-500">Gagal memuat data laporan.</div>;

    const MetricBox = ({ title, value, sub, isProfit }) => (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
            <h3 className="text-gray-500 text-sm font-medium mb-2">{title}</h3>
            <div className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-gray-800'}`}>
                {value}
            </div>
            {sub && <div className="text-xs text-gray-400 mt-2">{sub}</div>}
            {isProfit && <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-green-50 rounded-full opacity-50"></div>}
        </div>
    );

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Laporan Keuangan ERP</h2>
                    <p className="text-sm text-gray-400 mt-1">Integrasi HPP Resep Material dengan Omset POS otomatis.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                    <div className="flex bg-gray-50 p-1 rounded-lg">
                        {['day', 'month', 'year'].map(m => (
                            <button key={m} onClick={() => handleModeChange(m)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-wider ${filterMode === m ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {m === 'day' ? 'Harian' : m === 'month' ? 'Bulanan' : 'Tahunan'}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-[1px] bg-gray-200"></div>

                    <div className="flex items-center gap-2">
                        {filterMode === 'day' && (
                            <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400" />
                        )}
                        {filterMode === 'month' && (
                            <input type="month" value={filterValue} onChange={e => setFilterValue(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400" />
                        )}
                        {filterMode === 'year' && (
                            <select value={filterValue} onChange={e => setFilterValue(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none focus:border-orange-400">
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-orange-600 px-2 bg-orange-50 w-fit py-1 rounded-md">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                {data.filter_label}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricBox title="Total Omset (Revenue)" value={formatRupiah(data.total_revenue)} sub={`${data.total_orders} Pesanan Selesai`} />
                <MetricBox title="Total Modal Bahan (COGS)" value={formatRupiah(data.total_cogs)} sub="Dihitung otomatis dari BOM" />
                <MetricBox title="Laba Kotor (Gross Profit)" value={formatRupiah(data.gross_profit)} sub={`Sisa bersih sebelum operasional`} isProfit={true} />
                <MetricBox title="Persentase Margin" value={`${data.gross_margin_pct}%`} sub="Target ideal Food & Beverage: 60-70%" />
            </div>

            {/* Leaderboard Profit */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mt-6">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Menu Paling Menguntungkan (Top Cuan)</h3>
                    <span className="text-xs font-medium bg-orange-50 text-orange-600 px-3 py-1 rounded-full">Diurutkan berdasarkan Profit</span>
                </div>
                {data.top_profit_menus.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Belum ada data penjualan di periode ini.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Performa Menu</th>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Terjual</th>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Penjualan</th>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Modal Bahan</th>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-800 uppercase tracking-wider text-right bg-orange-50/30">Profit Dihasilkan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.top_profit_menus.map((m, idx) => (
                                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 text-center font-bold text-gray-300 text-sm">#{idx + 1}</div>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{m.name}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{m.kategori}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center font-medium text-gray-600">{m.qty_sold}</td>
                                        <td className="py-4 px-6 text-right text-gray-600 font-medium">{formatRupiah(m.revenue)}</td>
                                        <td className="py-4 px-6 text-right text-gray-400">{formatRupiah(m.cogs)}</td>
                                        <td className="py-4 px-6 text-right font-bold text-green-600 bg-green-50/10">+{formatRupiah(m.profit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
