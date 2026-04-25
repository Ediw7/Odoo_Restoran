import React, { useState, useEffect } from "react";
import { api, formatRupiah, getStatusColor } from "../api";

export default function Purchasing({ cabangList, activeCabangId }) {
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [bahans, setBahans] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form States
    const [showForm, setShowForm] = useState(false);
    const [formSupplierId, setFormSupplierId] = useState("");
    const [formNote, setFormNote] = useState("");
    const [formLines, setFormLines] = useState([{ bahan_id: "", qty: 1, price_unit: 0 }]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, [activeCabangId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch Suppliers
            const supRes = await api.getSuppliers();
            if (supRes?.status === 'success') setSuppliers(supRes.data);

            // Fetch Bahan
            const bahanRes = await api.apiFetch(`/api/bahan${activeCabangId ? `?cabang_id=${activeCabangId}` : ''}`);
            if (bahanRes?.status === 'success') setBahans(bahanRes.data);

            // Fetch POs
            await fetchPurchases();
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        }
        setLoading(false);
    };

    const fetchPurchases = async () => {
        const res = await api.getPurchases(activeCabangId);
        if (res?.status === 'success') setPurchases(res.data);
    };

    const handleAddLine = () => setFormLines([...formLines, { bahan_id: "", qty: 1, price_unit: 0 }]);

    const handleRemoveLine = (index) => {
        if (formLines.length === 1) return;
        setFormLines(formLines.filter((_, i) => i !== index));
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...formLines];
        newLines[index][field] = value;

        // Auto-fill price if bahan changes
        if (field === 'bahan_id') {
            const selectedBahan = bahans.find(b => b.id.toString() === value.toString());
            if (selectedBahan) {
                newLines[index].price_unit = selectedBahan.price_per_unit || 0;
            }
        }
        setFormLines(newLines);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validLines = formLines.filter(l => l.bahan_id && l.qty > 0 && l.price_unit >= 0);
        if (validLines.length === 0) {
            return alert("Harap isi setidaknya 1 bahan baku yang valid beserta harga beli.");
        }
        if (!formSupplierId) {
            return alert("Silakan pilih Supplier terlebih dahulu.");
        }

        const targetCabangId = activeCabangId || (cabangList?.length > 0 ? cabangList[0].id : null);
        if (!targetCabangId) return alert("Belum ada cabang aktif.");

        setSubmitting(true);
        const res = await api.createPurchase(targetCabangId, formSupplierId, validLines, formNote);
        setSubmitting(false);

        if (res?.status === 'success') {
            alert("Berhasil membuat Purchase Order!");
            setShowForm(false);
            setFormSupplierId("");
            setFormNote("");
            setFormLines([{ bahan_id: "", qty: 1, price_unit: 0 }]);
            fetchPurchases();
        } else {
            alert(res?.message || "Gagal membuat PO");
        }
    };

    const handleReceive = async (pId) => {
        if (!confirm("Apakah barang sudah benar-benar Anda terima d idapur? Stok akan otomatis bertambah sesuai PO ini.")) return;
        setLoading(true);
        const res = await api.receivePurchase(pId);
        setLoading(false);
        if (res?.status === 'success') {
            alert("Barang berhasil diterima dan stok bahan baku bertambah!");
            fetchPurchases();
        } else {
            alert(res?.message || "Gagal terima barang");
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-10 animate-fade-in relative h-full">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-5">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
                    <p className="text-sm text-gray-400 mt-1">Pembelian bahan baku (kulakan) ke supplier</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all focus:outline-none"
                >
                    {showForm ? 'Kembali ke Daftar' : '+ Buat PO Baru'}
                </button>
            </div>

            {showForm ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-scale-in">
                    <div className="p-5 border-b border-gray-100 bg-orange-50/30">
                        <h2 className="text-lg font-bold text-gray-800">Mulai Pembelian Baru</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Supplier *</label>
                                <select
                                    value={formSupplierId}
                                    onChange={e => setFormSupplierId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                                    required
                                >
                                    <option value="">-- Pilih Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} - {s.phone || '(No Telp)'}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Catatan (Opsional)</label>
                                <input
                                    type="text"
                                    value={formNote}
                                    onChange={e => setFormNote(e.target.value)}
                                    placeholder="Cth: Titip di satpam jika sore"
                                    className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Daftar Belanja Bahan</label>
                            {formLines.map((line, index) => (
                                <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 mb-3 items-end bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-[10px] text-gray-400 mb-1">Bahan Baku</label>
                                        <select
                                            value={line.bahan_id}
                                            onChange={e => handleLineChange(index, 'bahan_id', e.target.value)}
                                            className="w-full bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                                            required
                                        >
                                            <option value="">Pilih Bahan...</option>
                                            {bahans.map(b => (
                                                <option key={b.id} value={b.id}>{b.name} ({b.uom})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-[10px] text-gray-400 mb-1">Jumlah</label>
                                        <input
                                            type="number" step="0.01" min="0.01"
                                            value={line.qty}
                                            onChange={e => handleLineChange(index, 'qty', e.target.value)}
                                            className="w-full bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                                            required
                                        />
                                    </div>
                                    <div className="w-36">
                                        <label className="block text-[10px] text-gray-400 mb-1">Harga Beli Satuan (Rp)</label>
                                        <input
                                            type="number" min="0"
                                            value={line.price_unit}
                                            onChange={e => handleLineChange(index, 'price_unit', e.target.value)}
                                            className="w-full bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                                            required
                                        />
                                    </div>
                                    <div className="w-32 bg-gray-100 px-3 py-2 rounded-lg flex items-center mb-[1px]">
                                        <span className="text-xs font-bold text-gray-600 truncate">
                                            {formatRupiah((line.qty || 0) * (line.price_unit || 0))}
                                        </span>
                                    </div>
                                    {formLines.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLine(index)}
                                            className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-2 border border-red-100 rounded-lg text-sm mb-[1px] transition-colors"
                                        >
                                            Hapus
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddLine}
                                className="mt-2 text-sm text-orange-500 font-bold hover:text-orange-600 transition-colors"
                            >
                                + Tambah Bahan Lain
                            </button>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Menyimpan...' : 'Kirim PO ke Supplier'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-400">Loading data...</div>
                    ) : purchases.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                            <div className="text-4xl mb-3 opacity-30">🛒</div>
                            <p>Belum ada riwayat belanja/Purchase Order.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Nomor PO</th>
                                        <th className="px-6 py-4">Tanggal & Supplier</th>
                                        <th className="px-6 py-4">Detail Item</th>
                                        <th className="px-6 py-4">Total</th>
                                        <th className="px-6 py-4">Status & Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {purchases.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-700">{p.supplier.name}</div>
                                                <div className="text-[10px] text-gray-400">{p.date_order?.split(' ')[0]}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <ul className="text-xs text-gray-600 space-y-1">
                                                    {p.lines.map((l, i) => (
                                                        <li key={i}>• {l.bahan_name} ({l.qty} {l.uom}) @ {formatRupiah(l.price_unit)}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="px-6 py-4 font-black text-gray-800">{formatRupiah(p.total_amount)}</td>
                                            <td className="px-6 py-4">
                                                {p.state === 'draft' && <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">Draft</span>}
                                                {p.state === 'done' && <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">✔ Diterima (Stok Masuk)</span>}
                                                {p.state === 'cancelled' && <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">Dibatalkan</span>}

                                                {p.state === 'confirmed' && (
                                                    <div className="flex flex-col gap-2">
                                                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-center">Dikirim. Menunggu</span>
                                                        <button
                                                            onClick={() => handleReceive(p.id)}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-md uppercase tracking-wider transition-colors"
                                                        >
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
            )}
        </div>
    );
}
