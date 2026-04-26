import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useToast } from "../hooks/useToast";

const toUpperCase = (str) => str.toUpperCase();

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Pelanggan() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast, ToastContainer } = useToast();

    // Reward modal state
    const [selected, setSelected] = useState(null);
    const [rewardText, setRewardText] = useState("");
    const [sending, setSending] = useState(false);

    // Search loyalty
    const [searchName, setSearchName] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    const [searching, setSearching] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        const res = await api.getTopCustomers(20);
        if (res?.status === "success") setCustomers(res.data);
        setLoading(false);
    };

    useEffect(() => { fetchCustomers(); }, []);

    const handleGiveReward = async (e) => {
        e.preventDefault();
        if (!rewardText.trim()) return toast.warning("Isi keterangan reward dulu.");
        setSending(true);
        const res = await api.injectReward(selected.id, rewardText);
        setSending(false);
        if (res?.status === "success") {
            toast.success(`Reward berhasil diberikan ke ${selected.name}!`);
            setSelected(null);
            setRewardText("");
            fetchCustomers();
        } else {
            toast.error(res?.message || "Gagal memberikan reward.");
        }
    };

    const handleSearchLoyalty = async () => {
        if (!searchName.trim()) return;
        setSearching(true);
        setSearchResult(null);
        const res = await api.checkCustomer(searchName);
        setSearching(false);
        if (res?.status === "success") {
            setSearchResult(res.data);
        } else {
            setSearchResult({ not_found: true });
            toast.warning(res?.message || "Pelanggan tidak ditemukan.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <ToastContainer />

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Pelanggan & Loyalty</h1>
                <p className="text-sm text-gray-400 mt-0.5">Cek poin pelanggan dan berikan reward langsung dari kasir</p>
            </div>

            {/* Search Loyalty Cepat */}
            <div className="bg-white border border-orange-100 rounded-2xl p-5 mb-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-3">🔍 Cek Poin Pelanggan</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchName}
                        onChange={e => setSearchName(toUpperCase(e.target.value))}
                        onKeyDown={e => e.key === "Enter" && handleSearchLoyalty()}
                        placeholder="Ketik nama pelanggan..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-all"
                    />
                    <button
                        onClick={handleSearchLoyalty}
                        disabled={searching || !searchName.trim()}
                        className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
                    >
                        {searching ? "..." : "Cek"}
                    </button>
                </div>
                {searchResult && !searchResult.not_found && (
                    <div className="mt-4 bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-800">{searchResult.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {searchResult.visit_count} kunjungan · <span className="font-bold text-orange-500">{searchResult.loyalty_points} poin</span>
                            </p>
                            {searchResult.is_eligible_reward && (
                                <span className="mt-1.5 inline-block bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    🎁 Eligible Reward
                                </span>
                            )}
                            {searchResult.special_reward && (
                                <p className="text-[10px] text-purple-600 font-semibold mt-1">★ {searchResult.special_reward}</p>
                            )}
                        </div>
                        <button
                            onClick={() => { setSelected(searchResult); setSearchResult(null); setSearchName(""); }}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                        >
                            Beri Reward
                        </button>
                    </div>
                )}
                {searchResult?.not_found && (
                    <p className="mt-3 text-xs text-red-400 font-semibold">Nama tidak ditemukan di database loyalty.</p>
                )}
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">🏆 Pelanggan Terfavorit</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Berdasarkan jumlah kunjungan & poin</p>
                    </div>
                    <button onClick={fetchCustomers} className="text-xs text-gray-400 hover:text-orange-500 transition-all">↻ Refresh</button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                ) : customers.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm">Belum ada data pelanggan loyalty.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {customers.map((c, i) => (
                            <div key={c.id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/70 transition-colors ${i < 3 ? "bg-amber-50/30" : ""}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 flex items-center justify-center">
                                        {i < 3 ? (
                                            <span className="text-xl">{MEDALS[i]}</span>
                                        ) : (
                                            <span className="text-xs font-black text-gray-300">#{i + 1}</span>
                                        )}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-black text-orange-500">
                                        {c.name?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{c.name}</p>
                                        <p className="text-[10px] text-gray-400">
                                            <span className="font-bold text-orange-500">{c.visit_count}x</span> kunjungan ·  <span className="font-bold">{c.loyalty_points}</span> poin
                                            {c.is_eligible_reward && <span className="ml-2 text-amber-500 font-bold">· 🎁 Bisa Reward</span>}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelected(c); setRewardText(""); }}
                                    className="text-xs font-bold text-gray-300 hover:text-orange-500 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-all"
                                >
                                    Beri Reward
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Reward */}
            {selected && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800">Beri Apresiasi</h3>
                                <p className="text-xs text-gray-400 mt-0.5">kepada <span className="font-bold text-orange-500">{selected.name}</span></p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500 text-xl font-bold">&times;</button>
                        </div>
                        <div className="p-6">
                            <div className="bg-orange-50 rounded-xl p-3 mb-5 text-xs text-orange-700 font-semibold">
                                <p className="text-xs text-orange-700 font-semibold mt-1">{selected.visit_count} kunjungan · {selected.loyalty_points} poin total</p>
                                {selected.is_eligible_reward && <p className="text-amber-600 font-bold text-xs mt-1">🎁 Pelanggan ini eligible mendapat reward!</p>}
                            </div>
                            <form onSubmit={handleGiveReward} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Keterangan Reward</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        required
                                        value={rewardText}
                                        onChange={e => setRewardText(e.target.value)}
                                        placeholder="Cth: Gratis 1 Minuman, Diskon 20%, dll."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 font-medium"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setSelected(null)}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition-all">
                                        Batal
                                    </button>
                                    <button type="submit" disabled={sending}
                                        className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50">
                                        {sending ? "Menyimpan..." : "Berikan 🎁"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
