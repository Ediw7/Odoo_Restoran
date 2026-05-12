import React, { useEffect, useState } from "react";
import { api, formatRupiah } from "../api";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export default function Dashboard({ onNavigate }) {
    const [data, setData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [chartDays, setChartDays] = useState(7);

    useEffect(() => { fetchAll(); }, [period, chartDays, filterDate]);

    const handlePeriodChange = (p) => {
        setPeriod(p);
        const now = new Date();
        if (p === 'today' || p === 'week') setFilterDate(now.toISOString().split('T')[0]);
        else if (p === 'month') setFilterDate(now.toISOString().slice(0, 7));
        else if (p === 'year') setFilterDate(now.getFullYear().toString());
    };

    const fetchAll = async () => {
        setLoading(true);
        const [resDash, resChart] = await Promise.all([
            api.getDashboard(null, period),
            api.getChartData(null, chartDays)
        ]);
        if (resDash?.status === 'success') setData(resDash.data);
        if (resChart?.status === 'success') setChartData(resChart.data);
        setLoading(false);
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
                    <div className="text-sm font-medium text-gray-500">Memuat data...</div>
                </div>
            </div>
        );
    }
    if (!data) return <div className="py-20 text-center text-gray-500">Gagal memuat dashboard.</div>;

    const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Ringkasan Bisnis</h1>
                    <p className="text-sm text-gray-500 mt-1">Pantau performa seluruh cabang secara real-time.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm">
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                        {[
                            { id: 'today', label: 'Hari Ini' },
                            { id: 'week', label: 'Minggu' },
                            { id: 'month', label: 'Bulan' },
                            { id: 'year', label: 'Tahun' },
                        ].map(p => (
                            <button key={p.id} onClick={() => handlePeriodChange(p.id)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${period === p.id ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="h-6 w-[1px] bg-gray-200 hidden lg:block"></div>
                    <div className="flex items-center gap-2">
                        {(period === 'today' || period === 'week') && (
                            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-orange-400" />
                        )}
                        {period === 'month' && (
                            <input type="month" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-orange-400" />
                        )}
                        {period === 'year' && (
                            <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
                                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-orange-400">
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                    </div>
                    <button onClick={fetchAll} className="text-xs text-gray-400 hover:text-orange-500 transition-all bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">↻</button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard title="Cabang Aktif" val={`${data.cabang_buka} dari ${data.total_cabang} Cabang`} icon="🏪" sub="Outlet yang sedang buka" onClick={() => onNavigate && onNavigate('cabang')} />
                <StatCard title="Jumlah Transaksi" val={`${data.global.total_orders} Pesanan`} icon="📋" sub={`Periode: ${period === 'today' ? 'Hari Ini' : period === 'week' ? 'Minggu Ini' : period === 'month' ? 'Bulan Ini' : 'Tahun Ini'}`} />
                <StatCard title="Total Pendapatan" val={formatRupiah(data.global.total_revenue)} icon="💰" highlight sub={`Omset ${period === 'today' ? 'hari ini' : period === 'week' ? 'minggu ini' : period === 'month' ? 'bulan ini' : 'tahun ini'}`} onClick={() => onNavigate && onNavigate('report')} />
            </div>

            {/* Chart + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-gray-800">Tren Pendapatan</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{chartDays} hari terakhir</p>
                        </div>
                        <div className="flex bg-gray-50 p-0.5 rounded-lg">
                            {[7, 14, 30].map(d => (
                                <button key={d} onClick={() => setChartDays(d)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${chartDays === d ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}>
                                    {d}H
                                </button>
                            ))}
                        </div>
                    </div>
                    {chartData?.chart?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData.chart}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                                <Tooltip formatter={(v) => formatRupiah(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }} />
                                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">Belum ada data chart</div>
                    )}
                </div>

                {/* Top Menu Terlaris */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-1">Menu Terlaris</h3>
                    <p className="text-xs text-gray-400 mb-5">{chartDays} hari terakhir</p>
                    {chartData?.top_menu?.length > 0 ? (
                        <div className="space-y-3">
                            {chartData.top_menu.map((m, i) => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-orange-400' : 'bg-orange-300'}`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                                        <p className="text-[10px] text-gray-400">{m.qty_sold} terjual · {m.kategori}</p>
                                    </div>
                                    <span className="text-xs font-bold text-gray-600">{formatRupiah(m.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-300 text-sm">Belum ada data</div>
                    )}
                </div>
            </div>

            {/* Payment Breakdown + Branch Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {/* Payment Methods */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-1">Metode Pembayaran</h3>
                    <p className="text-xs text-gray-400 mb-5">{chartDays} hari terakhir</p>
                    {chartData?.payment_breakdown?.length > 0 ? (
                        <>
                            <div className="flex justify-center mb-4">
                                <PieChart width={140} height={140}>
                                    <Pie data={chartData.payment_breakdown} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                                        {chartData.payment_breakdown.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </div>
                            <div className="space-y-2">
                                {chartData.payment_breakdown.map((p, i) => (
                                    <div key={p.method} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                            <span className="text-xs font-medium text-gray-600">{p.label}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-800">{p.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-300 text-sm">Belum ada data</div>
                    )}
                </div>

                {/* Branch Performance */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-1">Performa Cabang</h3>
                    <p className="text-xs text-gray-400 mb-5">Statistik per outlet — {period === 'today' ? 'hari ini' : period === 'week' ? 'minggu ini' : period === 'month' ? 'bulan ini' : 'tahun ini'}</p>
                    <div className="space-y-3">
                        {data.cabang_stats.map((c, i) => {
                            const maxRev = Math.max(...data.cabang_stats.map(x => x.revenue_today), 1);
                            const pct = (c.revenue_today / maxRev) * 100;
                            return (
                                <div key={c.id} className="flex items-center gap-4">
                                    <div className="w-8 text-center">
                                        <span className={`text-xs font-black ${i === 0 ? 'text-orange-500' : 'text-gray-300'}`}>#{i + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-800">{c.name}</span>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.is_open ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] text-gray-400 font-medium">{c.total_order_today} order</span>
                                                <span className="text-sm font-bold text-gray-800">{formatRupiah(c.revenue_today)}</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {data.cabang_stats.length === 0 && (
                            <div className="py-10 text-center text-gray-300 text-sm">Belum ada data cabang</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}

function StatCard({ title, val, icon, sub, highlight, onClick }) {
    return (
        <div onClick={onClick} className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''} ${highlight ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{icon}</span>
                {onClick && <span className="text-[10px] text-gray-300 font-bold">→</span>}
            </div>
            <div>
                <h3 className={`text-xl font-bold tracking-tight ${highlight ? 'text-orange-600' : 'text-gray-800'}`}>{val}</h3>
                <p className="text-xs font-medium text-gray-400 mt-1">{sub || title}</p>
            </div>
        </div>
    );
}