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
        if (res?.status === 'success') onLoginSuccess(res.data);
        else setErrorMsg(res?.message || "Gagal terhubung ke server");
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-sm border border-gray-100">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-gray-800">Warung Nusantara</h1>
                    <p className="text-gray-400 text-sm mt-1">Masuk ke sistem POS</p>
                </div>
                {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4">{errorMsg}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                        <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="Email Odoo" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all" placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors text-sm disabled:opacity-50">
                        {loading ? "Memproses..." : "Masuk"}
                    </button>
                </form>
            </div>
        </div>
    );
}