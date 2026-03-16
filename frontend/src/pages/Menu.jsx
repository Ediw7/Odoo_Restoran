import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function Menu({ cabangId }) {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMenus = async () => {
        setLoading(true);
        let url = '/api/menu';
        if (cabangId) url += `?cabang_id=${cabangId}`;

        const res = await api.apiFetch(url);
        if (res && res.status === 'success') {
            setMenus(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMenus();
    }, [cabangId]);

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Katalog Produk</h1>
                <p className="text-sm text-slate-500 mt-1">Daftar menu yang tersinkronisasi dan tersedia di sistem Odoo.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                        <div className="text-sm font-medium text-slate-500">Memuat data menu...</div>
                    </div>
                </div>
            ) : menus.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <span className="text-slate-300 text-xl">/</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">Belum Ada Menu</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">Tambahkan atau aktifkan menu melalui dashboard backend Odoo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {menus.map((m) => (
                        <div key={m.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${m.available ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                                    {m.available ? 'Tersedia' : 'Habis'}
                                </span>
                                {m.kategori?.icon && (
                                    <span className="text-sm opacity-60 bg-slate-50 w-7 h-7 flex items-center justify-center rounded-full">
                                        {m.kategori.icon}
                                    </span>
                                )}
                            </div>

                            <div className="mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">
                                {m.kategori?.name} {m.code ? `· ${m.code}` : ''}
                            </div>

                            <h3 className="font-bold text-slate-800 text-sm leading-snug mb-5 line-clamp-2">{m.name}</h3>

                            <div className="mt-auto flex items-end justify-between pt-4 border-t border-slate-50">
                                <div className="font-bold text-slate-800 text-sm">{formatRupiah(m.price)}</div>
                                <div className="text-[10px] font-medium text-slate-400">
                                    {m.preparation_time > 0 ? `${m.preparation_time} min` : '-'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}