import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function DashboardCabang({ cabangId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            if (!cabangId) return;
            setLoading(true);
            const res = await api.getDashboard(cabangId);
            if (res?.status === 'success') {
                setData(res.data);
            }
            setLoading(false);
        };
        fetchDashboard();
    }, [cabangId]);

    if (loading) return <div className="p-8 text-slate-400 text-sm">Memuat data...</div>;
    if (!data || !data.cabang_stats || data.cabang_stats.length === 0) return <div className="p-8 text-red-500 text-sm">Data cabang tidak ditemukan.</div>;

    const myCabang = data.cabang_stats[0];

    return (
        <div className="max-w-5xl mx-auto pb-10 animate-fade-in">

            <div className="mb-10">

                <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">{myCabang.name}</h1>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Pendapatan</p>
                    <h3 className="text-3xl font-semibold text-slate-900">{formatRupiah(data.global.total_revenue_today)}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Pesanan</p>
                    <h3 className="text-3xl font-semibold text-slate-900">{data.global.total_orders_today}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Menu Aktif</p>
                    <h3 className="text-3xl font-semibold text-slate-900">{data.global.total_menu_available}</h3>
                </div>
            </div>

            {!myCabang.is_open && (
                <div className="mt-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                    Cabang sedang ditutup. Anda tidak dapat menerima pesanan baru.
                </div>
            )}
        </div>
    );
}