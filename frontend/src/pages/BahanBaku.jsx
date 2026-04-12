import React, { useState, useEffect } from 'react';
import { api, formatRupiah } from '../api';

export default function BahanBaku() {
    const [bahan, setBahan] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [updateQty, setUpdateQty] = useState({});
    const [isSaving, setIsSaving] = useState(null);
    const [notification, setNotification] = useState(null);

    // Modal Add Master Bahan state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBahan, setNewBahan] = useState({ name: '', uom: 'pcs' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchBahan(); }, []);
    useEffect(() => {
        if (notification) { const t = setTimeout(() => setNotification(null), 3000); return () => clearTimeout(t); }
    }, [notification]);

    const fetchBahan = async () => {
        setLoading(true);
        const res = await api.getBahanBaku();
        if (res?.status === 'success') setBahan(res.data);
        setLoading(false);
    };

    const handleAddStock = async (e, bahanId, bahanName, uom) => {
        e.stopPropagation();
        const qty = parseFloat(updateQty[bahanId] || 0);
        if (qty <= 0) return setNotification({ type: 'error', message: "Jumlah harus lebih dari 0" });
        setIsSaving(bahanId);
        try {
            const res = await api.updateStockBahan(bahanId, qty);
            if (res?.status === 'success') {
                setUpdateQty(prev => ({ ...prev, [bahanId]: '' }));
                setNotification({ type: 'success', message: `${bahanName} bertambah +${qty} ${uom}` });
                fetchBahan();
            } else setNotification({ type: 'error', message: res?.message || "Gagal menambah stok" });
        } catch { setNotification({ type: 'error', message: "Koneksi bermasalah" }); }
        setIsSaving(null);
    };

    const handleCreateBahan = async (e) => {
        e.preventDefault();
        if (!newBahan.name || !newBahan.uom) {
            return setNotification({ type: 'error', message: "Nama & Satuan wajib diisi" });
        }
        setIsSubmitting(true);
        const res = await api.createBahanBaku(newBahan);
        if (res?.status === 'success') {
            setNotification({ type: 'success', message: "Master Bahan Baku berhasil dibuat" });
            setShowAddModal(false);
            setNewBahan({ name: '', uom: 'pcs' });
            fetchBahan();
        } else {
            setNotification({ type: 'error', message: res?.message || "Gagal membuat master bahan" });
        }
        setIsSubmitting(false);
    };

    const filtered = bahan.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10 relative">
            {notification && (
                <div className={`fixed top-20 right-6 z-[500] px-4 py-3 rounded-lg shadow-md flex items-center gap-2 animate-slide-left text-sm font-medium ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {notification.message}
                </div>
            )}

            <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Gudang Bahan Mentah</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Pusat logistik pengadaan bahan baku Odoo ERP. Bahan akan otomatis berkurang ditarik dari Resep/BOM jika pesanan Menu Kasir selesai dibuat.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <input type="text" placeholder="Cari bahan baku..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full md:w-64 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 placeholder:text-gray-400" />
                    <button onClick={() => setShowAddModal(true)}
                        className="shrink-0 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
                        + Master Bahan
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-500">Tidak ada bahan baku</p>
                    <p className="text-sm text-gray-400 mt-1">Tambahkan bahan baku Master Data di Odoo ERP.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(b => {
                        const isLowStock = b.stock_qty <= b.min_stock && b.stock_qty > 0;
                        const isOutOfStock = b.stock_qty <= 0;
                        const cardHalo = isOutOfStock ? 'shadow-[0_0_0_1px_rgba(239,68,68,0.2)]' : isLowStock ? 'shadow-[0_0_0_1px_rgba(234,179,8,0.3)]' : '';

                        return (
                            <div key={b.id} className={`bg-white border rounded-xl p-4 transition-all flex flex-col ${isOutOfStock ? 'border-red-200 bg-red-50/10' : isLowStock ? 'border-yellow-200' : 'border-gray-100 hover:border-gray-200'} ${cardHalo}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-0.5">{b.code || 'BAHAN'}</div>
                                        <h3 className="font-semibold text-gray-800 text-sm max-w-[180px] break-words">{b.name}</h3>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOutOfStock ? 'bg-red-100 text-red-600' : isLowStock ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {isOutOfStock ? 'HABIS' : isLowStock ? 'MENIPIS' : 'AMAN'}
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-1.5 mb-4 border-b border-gray-50 pb-4">
                                    <span className={`text-3xl font-bold ${isOutOfStock ? 'text-red-500' : 'text-gray-800'}`}>
                                        {b.stock_qty % 1 === 0 ? b.stock_qty : parseFloat(b.stock_qty).toFixed(2)}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-400">{b.uom}</span>
                                </div>

                                <div className={`rounded-lg p-3 mt-auto ${isOutOfStock ? 'bg-red-50/50' : 'bg-gray-50'}`}>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Purchasing (Restock Supplier)</label>
                                    <div className="flex gap-2">
                                        <input type="number" placeholder={`Beli (${b.uom})`} value={updateQty[b.id] || ''} onChange={e => setUpdateQty(prev => ({ ...prev, [b.id]: e.target.value }))}
                                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-orange-400 font-medium" />
                                        <button onClick={(e) => handleAddStock(e, b.id, b.name, b.uom)} disabled={isSaving === b.id}
                                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white min-w-[70px] h-[34px] rounded-md flex items-center justify-center text-xs font-bold transition-all px-2">
                                            {isSaving === b.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Beli'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Modal Tambah Bahan Baku */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/30 z-[600] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowAddModal(false)}>
                    <form onSubmit={handleCreateBahan} className="bg-white rounded-2xl w-full max-w-sm shadow-lg overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800">Tambah Master Bahan</h2>
                            <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Bahan Mentah</label>
                                <input required type="text" placeholder="Misal: Beras Premium" value={newBahan.name} onChange={e => setNewBahan({ ...newBahan, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Satuan (UoM)</label>
                                <select required value={newBahan.uom} onChange={e => setNewBahan({ ...newBahan, uom: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400">
                                    <option value="kg">Kilogram (kg)</option>
                                    <option value="g">Gram (g)</option>
                                    <option value="ltr">Liter (L)</option>
                                    <option value="ml">Mililiter (ml)</option>
                                    <option value="pcs">Pcs / Buah</option>
                                    <option value="bks">Bungkus</option>
                                    <option value="btl">Botol</option>
                                    <option value="pack">Pack</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Bahan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
