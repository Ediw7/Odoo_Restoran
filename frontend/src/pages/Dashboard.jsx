import React, { useEffect, useState } from "react";
import { api, formatRupiah } from "../api";

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        const res = await api.getDashboard();
        if (res && res.status === 'success') {
            setData(res.data);
        }
        setLoading(false);
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
                    <div className="text-sm font-medium text-slate-500">Memuat data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Ringkasan Bisnis</h1>
                <p className="text-sm text-slate-500 mt-1">Pantau performa seluruh cabang hari ini.</p>
            </div>

            {/* Stats Grid - Minimalist Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <StatCard title="Cabang Buka" val={data.cabang_buka} icon="🏪" />
                <StatCard title="Order Hari Ini" val={data.global.total_orders_today} icon="📦" />
                <StatCard title="Pendapatan" val={formatRupiah(data.global.total_revenue_today)} icon="💰" />
                <StatCard title="Menu Tersedia" val={data.global.total_menu_available} icon="🍽️" />
            </div>

            {/* Branch Stats */}
            <div>
                <h2 className="text-base font-semibold text-slate-800 mb-5">Performa Cabang</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {data.cabang_stats.map(c => (
                        <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">

                            {/* Branch Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg tracking-tight">{c.name}</h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`w-2 h-2 rounded-full ${c.is_open ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                        <span className="text-xs font-medium text-slate-500">{c.is_open ? 'Beroperasi' : 'Tutup'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Metrics Grid - Clean Lines */}
                            <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-5">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Menu</p>
                                    <p className="font-bold text-slate-700">{c.total_menu}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Order</p>
                                    <p className="font-bold text-slate-700">{c.total_order_today}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Omzet</p>
                                    <p className="font-bold text-brand-600 truncate" title={formatRupiah(c.revenue_today)}>
                                        {formatRupiah(c.revenue_today)}
                                    </p>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Komponen StatCard yang lebih bersih tanpa warna background berlebihan
function StatCard({ title, val, icon }) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-xl">
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{val}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
            </div>
        </div>
    );
}