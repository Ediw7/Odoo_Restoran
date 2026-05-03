import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";
import { useToast } from "../hooks/useToast";

export default function Purchasing({ cabangList, activeCabangId }) {
    const { toast, confirm, ToastContainer, ConfirmDialog } = useToast();
    const [tab, setTab] = useState("po");

    // ===== DATA =====
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [bahans, setBahans] = useState([]);
    const [loading, setLoading] = useState(false);

    // ===== PO FORM =====
    const [showForm, setShowForm] = useState(false);
    const [formSupplierId, setFormSupplierId] = useState("");
    const [formNote, setFormNote] = useState("");
    const [formLines, setFormLines] = useState([{ bahan_id: "", qty: 1, price_unit: 0 }]);
    const [submitting, setSubmitting] = useState(false);

    // ===== SUPPLIER FORM =====
    const [showSupForm, setShowSupForm] = useState(false);
    const [supForm, setSupForm] = useState({ name: "", phone: "", address: "" });
    const [supSaving, setSupSaving] = useState(false);
    const [supMsg, setSupMsg] = useState({ type: "", text: "" });

    // ===== NEW BAHAN MODAL =====
    const [showAddBahanModal, setShowAddBahanModal] = useState(false);
    const [newBahan, setNewBahan] = useState({ name: "", uom: "pcs", price_per_unit: "" });
    const [bahanSaving, setBahanSaving] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(null);

    useEffect(() => { fetchInitialData(); }, [activeCabangId]);

    const fetchInitialData = async () => {
        setLoading(true);
        const [supRes, bahanRes] = await Promise.all([
            api.getSuppliers(activeCabangId),
            api.getBahanBaku(activeCabangId),
        ]);
        if (supRes?.status === "success") setSuppliers(supRes.data);
        if (bahanRes?.status === "success") setBahans(bahanRes.data);
        await fetchPurchases();
        setLoading(false);
    };

    const fetchPurchases = async () => {
        const res = await api.getPurchases(activeCabangId);
        if (res?.status === "success") setPurchases(res.data);
    };

    // ===== PO LOGIC =====
    const handleAddLine = () => setFormLines([...formLines, { bahan_id: "", qty: 1, price_unit: 0 }]);
    const handleRemoveLine = (i) => formLines.length > 1 && setFormLines(formLines.filter((_, idx) => idx !== i));
    const handleLineChange = (i, field, value) => {
        const lines = [...formLines];
        lines[i][field] = value;
        if (field === "bahan_id") {
            const b = bahans.find(b => b.id.toString() === value.toString());
            if (b) lines[i].price_unit = b.price_per_unit || 0;
        }
        setFormLines(lines);
    };
    const handleSubmitPO = async (e) => {
        e.preventDefault();
        const validLines = formLines.filter(l => l.bahan_id && l.qty > 0);
        if (!validLines.length) return toast.warning("Isi minimal 1 bahan baku.");
        if (!formSupplierId) return toast.warning("Pilih supplier dulu.");
        const cabangId = activeCabangId || cabangList?.[0]?.id;
        if (!cabangId) return toast.error("Belum ada cabang aktif.");
        setSubmitting(true);
        const res = await api.createPurchase(cabangId, formSupplierId, validLines, formNote);
        setSubmitting(false);
        if (res?.status === "success") {
            toast.success("Purchase Order berhasil dibuat!");
            setShowForm(false);
            setFormSupplierId(""); setFormNote("");
            setFormLines([{ bahan_id: "", qty: 1, price_unit: 0 }]);
            fetchPurchases();
        } else toast.error(res?.message || "Gagal membuat PO");
    };
    const handleReceive = async (pId) => {
        const ok = await confirm({ title: "Konfirmasi Penerimaan Barang", message: "Barang sudah benar-benar diterima? Stok akan bertambah otomatis sesuai PO ini.", confirmText: "Ya, Terima Barang" });
        if (!ok) return;
        setLoading(true);
        const res = await api.receivePurchase(pId);
        setLoading(false);
        if (res?.status === "success") { toast.success("Stok berhasil diperbarui!"); fetchPurchases(); }
        else toast.error(res?.message || "Gagal");
    };

    // ===== SUPPLIER LOGIC =====
    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (!supForm.name.trim()) return;
        setSupSaving(true); setSupMsg({ type: "", text: "" });
        const res = await api.createSupplier({ ...supForm, cabang_id: activeCabangId });
        setSupSaving(false);
        if (res?.status === "success") {
            setSupMsg({ type: "success", text: `Supplier "${supForm.name}" berhasil ditambahkan.` });
            setSupForm({ name: "", phone: "", address: "" });
            setShowSupForm(false);
            const updated = await api.getSuppliers(activeCabangId);
            if (updated?.status === "success") setSuppliers(updated.data);
        } else {
            setSupMsg({ type: "error", text: res?.message || "Gagal." });
        }
    };
    const handleDeleteSupplier = async (id, name) => {
        const ok = await confirm({ title: "Hapus Supplier", message: `Hapus supplier "${name}" dari daftar?`, confirmText: "Hapus", danger: true });
        if (!ok) return;
        const res = await api.deleteSupplier(id);
        if (res?.status === "success") {
            toast.success(`Supplier "${name}" dihapus.`);
            const updated = await api.getSuppliers(activeCabangId);
            if (updated?.status === "success") setSuppliers(updated.data);
        } else toast.error(res?.message || "Gagal.");
    };

    const handleCreateBahan = async (e) => {
        e.preventDefault();
        if (!newBahan.name || !newBahan.uom) return toast.warning("Nama & Satuan wajib diisi.");
        setBahanSaving(true);
        const res = await api.createBahanBaku({ ...newBahan, price_per_unit: parseFloat(newBahan.price_per_unit || 0) });
        setBahanSaving(false);
        if (res?.status === 'success') {
            toast.success(`Bahan "${newBahan.name}" berhasil ditambahkan ke master data!`);
            const bahanRes = await api.getBahanBaku(activeCabangId);
            if (bahanRes?.status === 'success') {
                setBahans(bahanRes.data);
                // If we opened this from a specific line, auto-select it
                if (activeLineIndex !== null) {
                    const lines = [...formLines];
                    lines[activeLineIndex].bahan_id = res.data.id;
                    lines[activeLineIndex].price_unit = parseFloat(newBahan.price_per_unit || 0);
                    setFormLines(lines);
                }
            }
            setShowAddBahanModal(false);
            setNewBahan({ name: "", uom: "pcs", price_per_unit: "" });
            setActiveLineIndex(null);
        } else toast.error(res?.message || "Gagal membuat bahan");
    };

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <ToastContainer />
            <ConfirmDialog />

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Pembelian Bahan Baku</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manajemen Purchase Order & Supplier</p>
                </div>
                {tab === "po" && (
                    <button onClick={() => setShowForm(!showForm)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-sm">
                        {showForm ? "Kembali ke Daftar" : "+ Buat PO Baru"}
                    </button>
                )}
                {tab === "supplier" && (
                    <button onClick={() => { setShowSupForm(!showSupForm); setSupMsg({ type: "", text: "" }); }}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-sm">
                        {showSupForm ? "Batal" : "+ Tambah Supplier"}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
                <button onClick={() => setTab("po")}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "po" ? "bg-white shadow-sm text-orange-500" : "text-gray-400 hover:text-gray-600"}`}>
                    Purchase Orders
                </button>
                <button onClick={() => setTab("supplier")}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === "supplier" ? "bg-white shadow-sm text-orange-500" : "text-gray-400 hover:text-gray-600"}`}>
                    Supplier ({suppliers.length})
                </button>
            </div>

            {/* ===== TAB PO ===== */}
            {tab === "po" && (
                showForm ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-orange-50/30">
                            <h2 className="text-base font-bold text-gray-800">Form Purchase Order Baru</h2>
                        </div>
                        <form onSubmit={handleSubmitPO} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Supplier *</label>
                                    <select value={formSupplierId} onChange={e => setFormSupplierId(e.target.value)} required
                                        className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-400 transition-all">
                                        <option value="">-- Pilih Supplier --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}{s.phone ? ` • ${s.phone}` : ""}</option>
                                        ))}
                                    </select>
                                    {suppliers.length === 0 && (
                                        <p className="text-xs text-orange-500 mt-1.5 font-semibold">
                                            ⚠ Belum ada supplier. Ke tab <button type="button" onClick={() => { setShowForm(false); setTab("supplier"); setShowSupForm(true); }} className="underline">Supplier</button> untuk tambahkan.
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Catatan (Opsional)</label>
                                    <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)}
                                        placeholder="Cth: Titip di satpam jika sore"
                                        className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-400 transition-all" />
                                </div>
                            </div>

                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Daftar Belanja Bahan</label>
                            {formLines.map((line, idx) => (
                                <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 mb-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-[10px] text-gray-400 mb-1">Bahan Baku</label>
                                        <div className="flex gap-1">
                                            <select value={line.bahan_id} onChange={e => handleLineChange(idx, "bahan_id", e.target.value)} required
                                                className="flex-1 bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-400">
                                                <option value="">Pilih Bahan...</option>
                                                {bahans.map(b => <option key={b.id} value={b.id}>{b.name} ({b.uom})</option>)}
                                            </select>
                                            <button type="button" onClick={() => { setActiveLineIndex(idx); setShowAddBahanModal(true); }}
                                                className="shrink-0 bg-white border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-200 px-2 rounded-lg text-xs font-black transition-all"
                                                title="Tambah Bahan Baru ke Master Data">
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-[10px] text-gray-400 mb-1">Jumlah</label>
                                        <input type="number" step="0.01" min="0.01" value={line.qty} required
                                            onChange={e => handleLineChange(idx, "qty", e.target.value)}
                                            className="w-full bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
                                    </div>
                                    <div className="w-36">
                                        <label className="block text-[10px] text-gray-400 mb-1">Harga/Satuan (Rp)</label>
                                        <input type="number" min="0" value={line.price_unit} required
                                            onChange={e => handleLineChange(idx, "price_unit", e.target.value)}
                                            className="w-full bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
                                    </div>
                                    <div className="w-28 bg-white border border-gray-100 px-3 py-2 rounded-lg">
                                        <span className="text-xs font-bold text-orange-600">{formatRupiah((line.qty || 0) * (line.price_unit || 0))}</span>
                                    </div>
                                    {formLines.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveLine(idx)}
                                            className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 transition-all">
                                            Hapus
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={handleAddLine}
                                className="text-sm text-orange-500 font-bold hover:text-orange-600 mt-1 transition-colors">
                                + Tambah Bahan Lain
                            </button>

                            <div className="mt-6 flex justify-end">
                                <button type="submit" disabled={submitting}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-all disabled:opacity-50 text-sm">
                                    {submitting ? "Menyimpan..." : "Kirim PO ke Supplier"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center py-16"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" /></div>
                        ) : purchases.length === 0 ? (
                            <div className="py-16 text-center text-gray-400 text-sm">Belum ada Purchase Order.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-bold">
                                        <tr>
                                            <th className="px-5 py-3">No. PO</th>
                                            <th className="px-5 py-3">Supplier</th>
                                            <th className="px-5 py-3">Bahan</th>
                                            <th className="px-5 py-3">Total</th>
                                            <th className="px-5 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {purchases.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-4 font-bold text-gray-700">{p.name}</td>
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-gray-700">{p.supplier.name}</div>
                                                    <div className="text-[10px] text-gray-400">{p.date_order?.split(" ")[0]}</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <ul className="text-xs text-gray-500 space-y-0.5">
                                                        {p.lines.map((l, i) => (
                                                            <li key={i}>• {l.bahan_name} {l.qty} {l.uom}</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                                <td className="px-5 py-4 font-bold text-gray-800">{formatRupiah(p.total_amount)}</td>
                                                <td className="px-5 py-4">
                                                    {p.state === "done" && <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">✔ Stok Masuk</span>}
                                                    {p.state === "cancelled" && <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2.5 py-1 rounded-lg">Batal</span>}
                                                    {p.state === "confirmed" && (
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-lg text-center">Menunggu</span>
                                                            <button onClick={() => handleReceive(p.id)}
                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all">
                                                                Barang Datang
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* ===== TAB SUPPLIER ===== */}
            {tab === "supplier" && (
                <div>
                    {supMsg.text && (
                        <div className={`text-sm p-3 rounded-xl font-semibold mb-4 ${supMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                            {supMsg.text}
                        </div>
                    )}

                    {showSupForm && (
                        <div className="bg-white border border-orange-100 rounded-2xl p-6 mb-5 shadow-sm">
                            <h3 className="text-base font-bold text-gray-800 mb-4">Tambah Supplier Baru</h3>
                            <form onSubmit={handleAddSupplier} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nama Supplier *</label>
                                    <input type="text" required value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })}
                                        placeholder="Contoh: Pasar Johar Semarang"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-all" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">No. Telepon</label>
                                        <input type="text" value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })}
                                            placeholder="0812-xxxx-xxxx"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Alamat</label>
                                        <input type="text" value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })}
                                            placeholder="Jl. ..."
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-all" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button type="submit" disabled={supSaving}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
                                        {supSaving ? "Menyimpan..." : "Simpan Supplier"}
                                    </button>
                                    <button type="button" onClick={() => setShowSupForm(false)}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {suppliers.length === 0 ? (
                            <div className="py-16 text-center text-gray-400 text-sm">
                                <p>Belum ada supplier.</p>
                                <button onClick={() => setShowSupForm(true)} className="mt-3 text-orange-500 font-bold text-sm underline">+ Tambah Sekarang</button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {suppliers.map(s => (
                                    <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{s.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {s.phone && <span>{s.phone}</span>}
                                                {s.phone && s.address && <span className="mx-2 text-gray-200">•</span>}
                                                {s.address && <span className="truncate">{s.address}</span>}
                                            </p>
                                        </div>
                                        <button onClick={() => handleDeleteSupplier(s.id, s.name)}
                                            className="text-xs font-semibold text-gray-300 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">
                                            Hapus
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50">
                            <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-widest">{suppliers.length} Supplier Terdaftar</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
