import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, LabelList
} from 'recharts';

export default function Report({ cabangId, userRole }) {
    const [filterMode, setFilterMode] = useState('day'); // day, week, month, year
    const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const isOwner = userRole === 'owner' || userRole === 'admin';
    const [cabangList, setCabangList] = useState([]);
    const [selectedCabang, setSelectedCabang] = useState(cabangId || "");

    const fetchData = async () => {
        if (isOwner) {
            const cs = await api.getCabang();
            if (cs?.status === 'success') setCabangList(cs.data);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        const branchToUse = isOwner ? selectedCabang : cabangId;
        const res = await api.getFinanceReport(branchToUse, filterMode, filterValue);
        if (res?.status === 'success') setData(res.data);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { fetchReport(); }, [selectedCabang, filterMode, filterValue]);

    const handleModeChange = (mode) => {
        setFilterMode(mode);
        const now = new Date();
        if (mode === 'day' || mode === 'week') setFilterValue(now.toISOString().split('T')[0]);
        else if (mode === 'month') setFilterValue(now.toISOString().slice(0, 7));
        else if (mode === 'year') setFilterValue(now.getFullYear().toString());
    };

    if (loading && !data) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>;
    if (!data) return <div className="py-20 text-center text-gray-500">Gagal memuat data laporan.</div>;

    const renderCustomBarLabel = ({ x, y, width, value }) => {
        return (
            <text x={x + width / 2} y={y - 12} fill="#666" textAnchor="middle" fontSize={10} fontWeight="bold">
                {formatRupiah(value)}
            </text>
        );
    };

    const handleExportCSV = () => {
        if (!data) return;
        const rows = [];
        // Header info
        rows.push(['Laporan Keuangan - Warung Nusantara']);
        rows.push([`Periode: ${filterMode === 'day' ? 'Harian' : filterMode === 'week' ? 'Mingguan' : filterMode === 'month' ? 'Bulanan' : 'Tahunan'} — ${filterValue}`]);
        rows.push([]);
        // Summary
        rows.push(['RINGKASAN']);
        rows.push(['Total Omset (Revenue)', data.total_revenue]);
        rows.push(['Total Modal Bahan (COGS)', data.total_cogs]);
        rows.push(['Laba Kotor (Gross Profit)', data.gross_profit]);
        rows.push(['Margin (%)', data.gross_margin_pct]);
        rows.push(['Total Pesanan', data.total_orders]);
        rows.push([]);
        // Detail table
        const detailData = selectedCabang ? (data.top_tables || []) : (data.branch_performance || []);
        if (detailData.length > 0) {
            rows.push([selectedCabang ? 'RANKING MEJA' : 'PERFORMA PER CABANG']);
            rows.push([selectedCabang ? 'Meja' : 'Cabang', 'Jumlah Transaksi', 'Total Omset']);
            detailData.forEach(item => {
                rows.push([
                    selectedCabang ? `Meja ${item.table}` : item.name,
                    item.count || item.orders,
                    item.total
                ]);
            });
        }
        // Chart data
        if (data.chart_data?.length > 0) {
            rows.push([]);
            rows.push(['TREN OMSET & LABA']);
            rows.push(['Periode', 'Omset', 'Laba']);
            data.chart_data.forEach(d => {
                rows.push([d.label, d.revenue, d.profit]);
            });
        }
        const csvContent = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_keuangan_${filterMode}_${filterValue}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

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
                    <h2 className="text-xl font-bold text-gray-800">Laporan Keuangan</h2>
                    <p className="text-sm text-gray-400 mt-1">Integrasi HPP resep bahan dengan omset POS otomatis.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportCSV} 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2">
                        <span>📥</span> Ekspor CSV
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm">
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                        {['day', 'week', 'month', 'year'].map(m => (
                            <button key={m} onClick={() => handleModeChange(m)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider ${filterMode === m ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {m === 'day' ? 'Harian' : m === 'week' ? 'Mingguan' : m === 'month' ? 'Bulanan' : 'Tahunan'}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-[1px] bg-gray-200 hidden lg:block"></div>

                    <div className="flex items-center gap-2">
                        {(filterMode === 'day' || filterMode === 'week') && (
                            <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-orange-400" />
                        )}
                        {filterMode === 'month' && (
                            <input type="month" value={filterValue} onChange={e => setFilterValue(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-orange-400" />
                        )}
                        {filterMode === 'year' && (
                            <select value={filterValue} onChange={e => setFilterValue(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-orange-400">
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Switcher - Only for Owner/Admin */}
            {isOwner && (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Cabang</span>
                    <select 
                        value={selectedCabang} 
                        onChange={(e) => setSelectedCabang(e.target.value)}
                        className="bg-transparent border-none p-0 text-sm font-bold text-gray-700 outline-none focus:ring-0 cursor-pointer min-w-[150px]"
                    >
                        <option value="">Semua Cabang (Global)</option>
                        {cabangList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricBox title="Total Omset" value={formatRupiah(data.total_revenue)} sub={`${data.total_orders} Pesanan Selesai`} />
                <MetricBox title="Total Modal Bahan (HPP)" value={formatRupiah(data.total_cogs)} sub="Dihitung otomatis dari resep" />
                <MetricBox title="Laba Kotor" value={formatRupiah(data.gross_profit)} sub="Sebelum biaya operasional" isProfit={true} />
                <MetricBox title="Persentase Margin" value={`${data.gross_margin_pct}%`} sub="Target ideal F&B: 60-70%" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center justify-between">
                        Tren Omset & Laba
                        <span className="text-[10px] text-gray-400 font-medium">Status Keuangan</span>
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.chart_data} margin={{ top: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} hide />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(v) => formatRupiah(v)}
                                />
                                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} name="Omset" barSize={35}>
                                    <LabelList dataKey="revenue" content={renderCustomBarLabel} />
                                </Bar>
                                <Bar dataKey="profit" fill="#16a34a" radius={[4, 4, 0, 0]} name="Laba" barSize={35}>
                                    <LabelList dataKey="profit" content={renderCustomBarLabel} />
                                </Bar>
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'semibold' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center justify-between">
                        Ranking Omset Per Cabang
                        <span className="text-[10px] text-gray-400 font-medium">Peringkat Performa</span>
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={(data.branch_performance || []).slice(0, 5)} margin={{ left: 60, right: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 500 }} width={100} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(v) => formatRupiah(v)}
                                />
                                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={25} name="Total Omset">
                                    <LabelList dataKey="total" position="right" formatter={(v) => formatRupiah(v)} style={{ fontSize: '9px', fontWeight: 'semibold', fill: '#f97316' }} />
                                    {(data.branch_performance || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Ranking Table */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Performa Pendapatan Per Cabang</h3>
                    <span className="text-xs font-medium bg-gray-50 text-gray-500 px-3 py-1 rounded-full border border-gray-100">
                        Berdasarkan Omset Terbesar
                    </span>
                </div>
                {((data.branch_performance || []).length === 0) ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Belum ada data di periode ini.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Cabang</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Jumlah Transaksi</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-gray-600 uppercase tracking-wider text-right">Total Omset</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(data.branch_performance || []).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 text-center font-medium text-gray-300 text-sm">#{idx + 1}</div>
                                                <div className="font-semibold text-gray-800">{item.name}</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center font-medium text-gray-600">{item.orders} Transaksi</td>
                                        <td className="py-4 px-6 text-right font-bold text-gray-800">{formatRupiah(item.total)}</td>
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
