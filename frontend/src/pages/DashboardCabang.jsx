import React, { useState, useEffect, useMemo } from "react";
import { api, formatRupiah, getStatusLabel, getStatusColor, getTypeLabel, formatTime } from "../api";

// ============================================
// CHART: Area Chart Pendapatan (SVG)
// ============================================
function RevenueChart({ data, loading, summary }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-52 text-sm text-gray-400">
                <div className="text-center">

                    Belum ada data pendapatan
                </div>
            </div>
        );
    }

    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
    const padding = { top: 20, right: 10, bottom: 40, left: 0 };
    const width = 600;
    const height = 220;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Build SVG path for area chart
    const points = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1 || 1)) * chartW,
        y: padding.top + chartH - (d.revenue / maxRevenue) * chartH,
        ...d,
    }));

    // Smooth curve (catmull-rom to bezier)
    const linePath = points.map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cx = (prev.x + p.x) / 2;
        return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    }).join(' ');

    const areaPath = linePath +
        ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    // Grid lines
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(frac => padding.top + chartH * (1 - frac));

    return (
        <div className={`transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
            {/* Summary Row */}
            {summary && (
                <div className="flex flex-wrap gap-6 mb-5 px-1">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Pendapatan</p>
                        <p className="text-xl font-black text-gray-800 mt-0.5">{formatRupiah(summary.total_revenue)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Pesanan</p>
                        <p className="text-xl font-black text-gray-800 mt-0.5">{summary.total_orders}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rata-rata / Order</p>
                        <p className="text-xl font-black text-emerald-600 mt-0.5">{formatRupiah(summary.avg_order_value)}</p>
                    </div>
                </div>
            )}

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#334155" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#334155" stopOpacity="0.01" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                {gridLines.map((y, i) => (
                    <line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                        stroke="#f1f5f9" strokeWidth="1" strokeDasharray={i > 0 && i < 4 ? "4 4" : "0"} />
                ))}

                {/* Area fill */}
                <path d={areaPath} fill="url(#areaGradient)" />

                {/* Line */}
                <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots + Labels */}
                {points.map((p, i) => (
                    <g key={i}>
                        {/* Dot */}
                        <circle cx={p.x} cy={p.y} r="4" fill="#1e293b" stroke="white" strokeWidth="2" />

                        {/* Value label on top */}
                        {p.revenue > 0 && (
                            <text x={p.x} y={p.y - 12} textAnchor="middle"
                                className="text-[9px] font-bold" fill="#475569">
                                {p.revenue >= 1000000
                                    ? `${(p.revenue / 1000000).toFixed(1)}jt`
                                    : p.revenue >= 1000
                                        ? `${Math.round(p.revenue / 1000)}rb`
                                        : formatRupiah(p.revenue)}
                            </text>
                        )}

                        {/* X-axis label */}
                        <text x={p.x} y={height - 8} textAnchor="middle"
                            className="text-[10px]" fill="#94a3b8" fontWeight="500">
                            {p.label}
                        </text>

                        {/* Order count below value */}
                        {p.orders > 0 && (
                            <text x={p.x} y={p.y - 2} textAnchor="middle"
                                className="text-[7px]" fill="#94a3b8">
                                {p.orders}x
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}

// ============================================
// CHART: Payment Breakdown (Donut / Bars)
// ============================================
function PaymentBreakdown({ data }) {
    if (!data || data.length === 0) {
        return <div className="text-sm text-gray-400 text-center py-6">Belum ada data</div>;
    }

    const colors = {
        'cash': { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
        'qris': { bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50' },
        'card': { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
        'transfer': { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
    };
    const payLabels = { 'cash': 'Tunai', 'qris': 'QRIS', 'card': 'Kartu', 'transfer': 'TF' };

    return (
        <div className="space-y-3">
            {data.map((item, i) => {
                const c = colors[item.method] || colors['cash'];
                return (
                    <div key={i} className={`${c.light} rounded-xl px-4 py-3`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{payLabels?.[item.method] || item.method}</span>
                                <span className="text-sm font-bold text-gray-700">{item.label}</span>
                            </div>
                            <div className="text-right">
                                <span className={`text-sm font-black ${c.text}`}>{item.percentage}%</span>
                                <span className="text-xs text-gray-400 ml-2">({item.count}x)</span>
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                            <div
                                className={`${c.bg} h-full rounded-full transition-all duration-700 ease-out`}
                                style={{ width: `${item.percentage}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium mt-1.5">{formatRupiah(item.revenue)}</p>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// CHART: Menu Terlaris
// ============================================
function TopMenuList({ data }) {
    if (!data || data.length === 0) {
        return <div className="text-sm text-gray-400 text-center py-6">Belum ada data penjualan</div>;
    }

    const maxQty = Math.max(...data.map(d => d.qty_sold), 1);
    const medals = ['1', '2', '3'];

    return (
        <div className="space-y-2">
            {data.map((item, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    {/* Background fill */}
                    <div
                        className="absolute inset-y-0 left-0 bg-slate-200/40 transition-all duration-700 rounded-xl"
                        style={{ width: `${(item.qty_sold / maxQty) * 100}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-lg min-w-[24px] text-center">
                                {i < 3 ? medals[i] : <span className="text-xs font-bold text-gray-400">#{i + 1}</span>}
                            </span>
                            <div>
                                <p className="text-sm font-bold text-gray-700">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.kategori}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-gray-800">{item.qty_sold} porsi</p>
                            <p className="text-[11px] text-gray-400 font-medium">{formatRupiah(item.revenue)}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================
// CHART: Pelanggan Terfavorit (Loyalty Leaderboard)
// ============================================
function TopCustomerList({ data }) {
    if (!data || data.length === 0) {
        return <div className="text-sm text-gray-400 text-center py-6">Belum ada pelanggan terdaftar</div>;
    }

    const medals = ['🥈', '🥇', '🥉']; // Sorted 2, 1, 3 for center focus? No, 1st is 0 idx
    const medalIcons = ['🥇', '🥈', '🥉'];

    return (
        <div className="space-y-2">
            {data.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 hover:shadow-sm transition-all border-l-4" style={{ borderLeftColor: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#f1f5f9' }}>
                    <div className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">
                            {i < 3 ? medalIcons[i] : <span className="text-xs font-black text-gray-300">#{i + 1}</span>}
                        </span>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{item.phone}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-orange-600">{item.visit_count}x <span className="text-[10px] text-gray-300 font-medium">Kunjungan</span></p>
                        <p className="text-[10px] text-gray-400">{item.loyalty_points} Poin</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================
// Detail Order Modal
// ============================================
function OrderDetailModal({ order, onClose }) {
    if (!order) return null;
    return (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto border border-gray-100 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{order.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(order.order_date).toLocaleString('id-ID')}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">×</button>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4 border-b border-gray-100">
                    {[
                        { label: 'Status', value: <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatusColor(order.state)}`}>{getStatusLabel(order.state)}</span> },
                        { label: 'Tipe', value: getTypeLabel(order.order_type) },
                        { label: 'Pelanggan', value: order.customer_name || '-' },
                        { label: 'Meja', value: order.table_number || '-' },
                        { label: 'Kasir', value: order.cashier || '-' },
                        { label: 'Pembayaran', value: (order.payment_method || '-').toUpperCase() },
                    ].map((item, i) => (
                        <div key={i}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                            <p className="text-sm font-semibold text-gray-700">{item.value}</p>
                        </div>
                    ))}
                </div>
                <div className="p-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Detail Item</p>
                    <div className="space-y-2">
                        {order.lines?.map((line, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">{line.menu?.name}</p>
                                    {line.note && <p className="text-[11px] text-gray-400 mt-0.5">{line.note}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-700">{line.qty}x</p>
                                    <p className="text-xs text-gray-400">{formatRupiah(line.subtotal)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-5 bg-gray-50 rounded-b-2xl border-t border-gray-100">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>Pajak (10%)</span><span>{formatRupiah(order.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
                        <span>Total</span><span>{formatRupiah(order.total_amount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// HALAMAN UTAMA: Dashboard Cabang
// ============================================
export default function DashboardCabang({ cabangId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today');

    // Analytics
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [chartDays, setChartDays] = useState(7);

    // Transactions
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(true);
    const [txFilter, setTxFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [txPage, setTxPage] = useState(1);
    const txLimit = 10;
    const [totalTx, setTotalTx] = useState(0);

    // Top Customers
    const [topCustomers, setTopCustomers] = useState([]);
    const [customerLoading, setCustomerLoading] = useState(true);

    // Fetch Dashboard Stats
    useEffect(() => {
        const fetchDashboard = async () => {
            if (!cabangId) return;
            setLoading(true);
            const res = await api.getDashboard(cabangId, period);
            if (res?.status === 'success') setData(res.data);
            setLoading(false);
        };
        fetchDashboard();
    }, [cabangId, period]);

    // Fetch Analytics (Chart + Top Menu + Payment)
    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!cabangId) return;
            setAnalyticsLoading(true);
            const res = await api.getChartData(cabangId, chartDays);
            if (res?.status === 'success') setAnalytics(res.data);
            setAnalyticsLoading(false);
        };
        fetchAnalytics();
    }, [cabangId, chartDays]);

    // Fetch Transactions
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!cabangId) return;
            setTxLoading(true);
            const offset = (txPage - 1) * txLimit;
            const res = await api.getOrders(cabangId, txFilter !== 'all' ? txFilter : undefined, undefined, txLimit, offset);
            if (res?.status === 'success') {
                setTransactions(res.data);
                setTotalTx(res.total || 0);
            }
            setTxLoading(false);
        };
        fetchTransactions();
    }, [cabangId, txFilter, txPage]);

    // Fetch Top Customers
    useEffect(() => {
        const fetchTopCustomers = async () => {
            setCustomerLoading(true);
            const res = await api.apiFetch('/api/top_customers');
            if (res?.status === 'success') setTopCustomers(res.data);
            setCustomerLoading(false);
        };
        fetchTopCustomers();
    }, []);

    // Computed
    const avgOrder = useMemo(() => {
        if (!data?.global?.total_orders || data.global.total_orders === 0) return 0;
        return data.global.total_revenue / data.global.total_orders;
    }, [data]);

    // Guards (after hooks)
    if (!cabangId) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">

                    <h2 className="text-xl font-bold text-gray-800 mb-2">Cabang Belum Terpilih</h2>
                    <p className="text-sm text-gray-500">
                        User Anda belum di-assign ke cabang manapun.
                        Minta admin untuk mengatur <strong>"Cabang Restoran"</strong> di pengaturan user Odoo Anda.
                    </p>
                </div>
            </div>
        );
    }

    if (loading && !data) return (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-700 rounded-full animate-spin"></div>
                <div className="text-sm font-medium text-gray-500">Memuat data cabang...</div>
            </div>
        </div>
    );

    if (!data || !data.cabang_stats || data.cabang_stats.length === 0) return (
        <div className="p-8 text-red-500 text-sm font-medium">Data cabang tidak ditemukan.</div>
    );

    const myCabang = data.cabang_stats[0];

    const statusFilters = [
        { value: 'all', label: 'Semua Transaksi', color: 'bg-gray-100 text-gray-600' }
    ];

    return (
        <div className="max-w-7xl mx-auto pb-10 animate-fade-in">
            {/* ========== HEADER ========== */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${myCabang.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`}></span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {myCabang.is_open ? 'Sedang Buka' : 'Tutup'}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{myCabang.name}</h1>
                    <p className="text-sm text-gray-400 mt-1">Dashboard Monitoring & Analitik</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Periode:</span>
                    <select value={period} onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-800 text-sm font-medium rounded-lg px-4 py-2.5 outline-none focus:border-orange-400 cursor-pointer shadow-sm">
                        <option value="today">Hari Ini</option>
                        <option value="week">Minggu Ini</option>
                        <option value="month">Bulan Ini</option>
                        <option value="year">Tahun Ini</option>
                        <option value="all">Semua Waktu</option>
                    </select>
                </div>
            </div>

            {loading && data && (
                <div className="text-xs text-gray-400 mb-4 animate-pulse font-medium">Memperbarui data...</div>
            )}

            {/* ========== STAT CARDS ========== */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
                <StatCard title="Pendapatan" value={formatRupiah(data.global.total_revenue)} />
                <StatCard title="Pesanan Selesai" value={data.global.total_orders} />
                <StatCard title="Menu Tersedia" value={data.global.total_menu_available} />
                <StatCard title="Rata-rata/Order" value={formatRupiah(avgOrder)} highlight={true} />
            </div>

            {/* ========== GRAFIK PENDAPATAN (Full Width) ========== */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-800 tracking-tight">Tren Pendapatan</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Pendapatan harian dari pesanan selesai</p>
                    </div>
                    <select value={chartDays} onChange={(e) => setChartDays(parseInt(e.target.value))}
                        className="bg-gray-50 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg px-3 py-1.5 outline-none cursor-pointer">
                        <option value={7}>7 Hari</option>
                        <option value={14}>14 Hari</option>
                        <option value={30}>30 Hari</option>
                    </select>
                </div>
                <div className="p-5">
                    <RevenueChart
                        data={analytics?.chart}
                        loading={analyticsLoading}
                        summary={analytics?.summary}
                    />
                </div>
            </div>

            {/* ========== 2-COLUMN: Pelanggan Terbaik + Top Menu ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Pelanggan Terbaik */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 bg-orange-50/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-gray-800 tracking-tight">🏆 Pelanggan Terfavorit</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Top 5 loyalitas berdasarkan jumlah kunjungan</p>
                            </div>
                            <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Loyalty Leaderboard</span>
                        </div>
                    </div>
                    <div className="p-4">
                        {customerLoading ? (
                            <div className="py-10 flex justify-center"><div className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
                        ) : (
                            <TopCustomerList data={topCustomers} />
                        )}
                    </div>
                </div>

                {/* Menu Terlaris (Pencapaian) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-800 tracking-tight">🔥 Menu Terlaris</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Top 10 menu paling laris ({chartDays} hari terakhir)</p>
                    </div>
                    <div className="p-4">
                        <TopMenuList data={analytics?.top_menu} />
                    </div>
                </div>
            </div>

            {/* ========== 1-COLUMN: Metode Pembayaran ========== */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="p-5 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-800 tracking-tight">💳 Metode Pembayaran</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Breakdown pembayaran ({chartDays} hari terakhir)</p>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PaymentBreakdown data={analytics?.payment_breakdown} />
                </div>
            </div>

            {/* ========== TABEL TRANSAKSI ========== */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-800 tracking-tight">Riwayat Transaksi Terakhir</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{transactions.length} transaksi hari ini • auto-refresh 15 detik</p>
                    </div>
                </div>

                {txLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-600 rounded-full animate-spin"></div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">

                        <p className="text-sm font-medium">Belum ada transaksi</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">No. Order</th>
                                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Waktu</th>
                                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pelanggan</th>
                                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</th>
                                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                                    <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Bayar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions.map((order) => (
                                    <tr key={order.id} onClick={() => setSelectedOrder(order)}
                                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <span className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">{order.name}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatTime(order.order_date)}</td>
                                        <td className="px-5 py-3.5 text-gray-600 font-medium">
                                            {order.customer_name || <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 font-semibold">{order.total_items}</td>
                                        <td className="px-5 py-3.5 font-bold text-gray-700 whitespace-nowrap">{formatRupiah(order.total_amount)}</td>
                                        <td className="px-5 py-3.5 text-gray-500 uppercase text-xs font-semibold text-right">{order.payment_method || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalTx > txLimit && (
                    <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-400 font-medium tracking-tight">
                            Menampilkan <span className="text-gray-900 font-bold">{Math.min(transactions.length, txLimit)}</span> dari <span className="text-gray-900 font-bold">{totalTx}</span> transaksi
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={txPage === 1}
                                onClick={() => setTxPage(txPage - 1)}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            >
                                <span className="text-sm font-bold text-gray-700">←</span>
                            </button>
                            <span className="text-xs font-black px-3 text-gray-400 uppercase tracking-widest">Hal {txPage}</span>
                            <button
                                disabled={txPage * txLimit >= totalTx}
                                onClick={() => setTxPage(txPage + 1)}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            >
                                <span className="text-sm font-bold text-gray-700">→</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Peringatan jika tutup */}
            {
                !myCabang.is_open && (
                    <div className="mt-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-3">

                        Cabang sedang ditutup. Anda tidak dapat menerima pesanan baru.
                    </div>
                )
            }

            {/* Order Detail Modal */}
            {
                selectedOrder && (
                    <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
                )
            }
        </div >
    );
}

// ============================================
// Stat Card
// ============================================
function StatCard({ title, value, highlight }) {
    return (
        <div className={`bg-white p-5 rounded-xl border transition-all ${highlight ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">{title}</p>
            <h3 className={`text-2xl font-bold tracking-tight ${highlight ? 'text-orange-600' : 'text-gray-800'}`}>{value}</h3>
        </div>
    );
}