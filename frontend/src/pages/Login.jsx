import React, { useState } from "react";
import { api } from "../api";

export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);
        try {
            const res = await api.login(username, password);
            if (res?.status === 'success') {
                onLoginSuccess(res.data);
            } else {
                setErrorMsg(res?.message || "Username atau Password Salah!");
            }
        } catch {
            setErrorMsg("Gagal terhubung ke Server Odoo");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">

            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-orange-100 rounded-3xl p-8 shadow-xl shadow-orange-100/50 animate-in fade-in zoom-in duration-500">

                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-lg shadow-orange-300/50 mb-4">
                        <span className="text-3xl">🍜</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Warung Nusantara</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium">Sistem ERP Restoran Terpusat</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {errorMsg && (
                        <div className="text-xs bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl font-bold text-center">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username / Email Odoo</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-medium placeholder:text-gray-300"
                            placeholder="admin"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-medium placeholder:text-gray-300"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-orange-400/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 text-sm"
                    >
                        {loading ? "Memvalidasi..." : "Masuk ke Sistem"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 text-center font-medium leading-relaxed">
                        Login pertama kali untuk mengunci perangkat ke Cabang Anda.<br />
                        Selanjutnya pilih Stasiun Kerja (Kasir, Dapur, Gudang).
                    </p>
                </div>

                <div className="mt-4 text-center text-[10px] text-gray-300 uppercase font-bold tracking-widest">
                    Secure Auth • Odoo Backend
                </div>
            </div>
        </div>
    );
}