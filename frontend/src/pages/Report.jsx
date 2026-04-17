import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, LabelList
} from 'recharts';

export default function Report({ cabangId }) {
    const [filterMode, setFilterMode] = useState('day'); // day, week, month, year
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
        if (mode === 'day' || mode === 'week') setFilterValue(now.toISOString().split('T')[0]);
        else if (mode === 'month') setFilterValue(now.toISOString().slice(0, 7));
        else if (mode === 'year') setFilterValue(now.getFullYear().toString());
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>;
    if (!data) return <div className="py-20 text-center text-gray-500">Gagal memuat data laporan.</div>;

    const renderCustomBarLabel = ({ x, y, width, value }) => {
        return (
            <text x={x + width / 2} y={y - 12} fill="#666" textAnchor="middle" fontSize={10} fontWeight="bold">
                {formatRupiah(value)}
            </text>
        );
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
                    <h2 className="text-xl font-bold text-gray-800">Laporan Keuangan ERP</h2>
                    <p className="text-sm text-gray-400 mt-1">Integrasi HPP Resep Material dengan Omset POS otomatis.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                    <div className="flex bg-gray-50 p-1 rounded-lg">
                        {['day', 'week', 'month', 'year'].map(m => (
                            <button key={m} onClick={() => handleModeChange(m)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-wider ${filterMode === m ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {m === 'day' ? 'Harian' : m === 'week' ? 'Mingguan' : m === 'month' ? 'Bulanan' : 'Tahunan'}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-[1px] bg-gray-200"></div>

                    <div className="flex items-center gap-2">
                        {(filterMode === 'day' || filterMode === 'week') && (
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-6 flex items-center justify-between">
                        Tren Omset & Laba (Rp)
                        <span className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">Financial Status</span>
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
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-6 flex items-center justify-between">
                        Ranking Omset Per Meja (Rp)
                        <span className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">Table Performance</span>
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={data.top_tables.slice(0, 5)} margin={{ left: 60, right: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="table" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} width={100} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(v) => formatRupiah(v)}
                                />
                                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={25} name="Total Omset">
                                    <LabelList dataKey="total" position="right" formatter={(v) => formatRupiah(v)} style={{ fontSize: '9px', fontWeight: 'bold', fill: '#f97316' }} />
                                    {data.top_tables.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Meja Paling Laris (Top Tables)</h3>
                    <span className="text-xs font-medium bg-orange-50 text-orange-600 px-3 py-1 rounded-full">Diurutkan berdasarkan Omset</span>
                </div>
                {data.top_tables.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Belum ada data meja di periode ini.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Identitas Meja</th>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider text-center">Jumlah Transaksi</th>
                                    <th className="py-3 px-6 text-xs font-medium text-gray-800 uppercase tracking-wider text-right bg-orange-50/30">Total Omset</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.top_tables.map((tbl, idx) => (
                                    <tr key={tbl.table} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 text-center font-bold text-gray-300 text-sm">#{idx + 1}</div>
                                                <div className="font-black text-gray-800 uppercase italic">Meja {tbl.table}</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center font-medium text-gray-600">{tbl.count}x Kunjungan</td>
                                        <td className="py-4 px-6 text-right font-black text-orange-600 bg-orange-50/10">{formatRupiah(tbl.total)}</td>
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
