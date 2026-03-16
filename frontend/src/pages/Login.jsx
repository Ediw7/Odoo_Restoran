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
        const res = await api.login(username, password);

        if (res?.status === 'success') {
            onLoginSuccess(res.data);
        } else {
            setErrorMsg(res?.message || "Gagal terhubung ke server");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-slate-800 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">🍽️</div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Warung Nusantara</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Sistem Point of Sale</p>
                </div>
                {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold text-center mb-6">{errorMsg}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Username (Email Odoo)</label>
                        <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Password</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3.5 mt-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all">
                        {loading ? "Memproses..." : "Masuk"}
                    </button>
                </form>
            </div>
        </div>
    );
}