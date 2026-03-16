import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function DashboardCabang({ cabangId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('today'); // State untuk filter waktu

    useEffect(() => {
        const fetchDashboard = async () => {
            if (!cabangId) return;
            setLoading(true);
            const res = await api.getDashboard(cabangId, period); // Kirim period ke API
            if (res?.status === 'success') {
                setData(res.data);
            }
            setLoading(false);
        };
        fetchDashboard();
    }, [cabangId, period]); // Fetch ulang jika period berubah

    if (loading && !data) return <div className="p-8 text-slate-400 text-sm">Memuat data...</div>;
    if (!data || !data.cabang_stats || data.cabang_stats.length === 0) return <div className="p-8 text-red-500 text-sm">Data cabang tidak ditemukan.</div>;

    const myCabang = data.cabang_stats[0];

    return (
        <div className="max-w-5xl mx-auto pb-10 animate-fade-in">
            {/* Header dengan Dropdown Filter */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${myCabang.is_open ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {myCabang.is_open ? 'Buka' : 'Tutup'}
                        </span>
                    </div>
                    <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">{myCabang.name}</h1>
                </div>

                {/* Dropdown Filter Clean */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Periode:</span>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-4 py-2 outline-none focus:border-slate-400 cursor-pointer shadow-sm transition-all"
                    >
                        <option value="today">Hari Ini</option>
                        <option value="month">Bulan Ini</option>
                        <option value="year">Tahun Ini</option>
                        <option value="all">Semua Waktu</option>
                    </select>
                </div>
            </div>

            {/* Loading Indicator Halus saat ganti filter */}
            {loading && data && (
                <div className="text-xs text-slate-400 mb-4 animate-pulse">Memperbarui data...</div>
            )}

            {/* Statistik Minimalist */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">Pendapatan</p>
                    <h3 className="text-3xl font-semibold text-slate-900">{formatRupiah(data.global.total_revenue)}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">Pesanan Selesai</p>
                    <h3 className="text-3xl font-semibold text-slate-900">{data.global.total_orders}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">Menu Tersedia</p>
                    <h3 className="text-3xl font-semibold text-slate-900">{data.global.total_menu_available}</h3>
                </div>
            </div>

            {/* Peringatan jika tutup */}
            {!myCabang.is_open && (
                <div className="mt-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                    Cabang sedang ditutup. Anda tidak dapat menerima pesanan baru.
                </div>
            )}
        </div>
    );
}