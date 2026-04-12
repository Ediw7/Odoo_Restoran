import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";

export default function Menu({ cabangId }) {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            let url = '/api/menu';
            if (cabangId) url += `?cabang_id=${cabangId}`;
            const res = await api.apiFetch(url);
            if (res?.status === 'success') setMenus(res.data);
            setLoading(false);
        })();
    }, [cabangId]);

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10">
            <div className="mb-5">
                <p className="text-sm text-gray-400">Data tersinkronisasi dari Odoo.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
            ) : menus.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-500">Belum ada menu</p>
                    <p className="text-sm text-gray-400 mt-1">Tambahkan menu melalui Odoo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {menus.map(m => {
                        const out = m.use_stock && m.stock_qty <= 0;
                        return (
                            <div key={m.id} className={`bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col h-full ${out ? 'opacity-40' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${out ? 'bg-red-50 text-red-500' : m.use_stock && m.stock_qty <= 5 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                                        {out ? 'Habis' : m.use_stock && m.stock_qty <= 5 ? 'Menipis' : 'Tersedia'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 mb-0.5">{m.kategori?.name}{m.code ? ` · ${m.code}` : ''}</div>
                                <h3 className="font-semibold text-gray-800 text-sm mb-1">{m.name}</h3>
                                {m.use_stock && (
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${out ? 'bg-red-400' : m.stock_qty <= 5 ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                                        <span className="text-xs text-gray-400">{m.stock_qty} porsi</span>
                                    </div>
                                )}
                                <div className="mt-auto flex items-end justify-between pt-3 border-t border-gray-50">
                                    <span className={`font-semibold text-sm ${out ? 'text-gray-300' : 'text-gray-800'}`}>{formatRupiah(m.price)}</span>
                                    <span className="text-xs text-gray-400">{m.preparation_time > 0 ? `${m.preparation_time} min` : ''}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}