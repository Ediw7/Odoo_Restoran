import React, { useState, useEffect } from 'react';
import { api, formatRupiah } from '../api';

export default function Inventory({ activeCabangId }) {
    const [menus, setMenus] = useState([]);
    const [kategoris, setKategoris] = useState([]);
    const [activeKategori, setActiveKategori] = useState('all');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [updateQty, setUpdateQty] = useState({});
    const [isSaving, setIsSaving] = useState(null);
    const [selectedBom, setSelectedBom] = useState(null);
    const [notification, setNotification] = useState(null);

    // Modal state for Add Menu
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [newMenu, setNewMenu] = useState({ name: '', price: '', kategori_id: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchKategoris(); }, []);
    useEffect(() => { fetchInventory(); }, [activeCabangId]);
    useEffect(() => {
        if (notification) { const t = setTimeout(() => setNotification(null), 3000); return () => clearTimeout(t); }
    }, [notification]);

    const fetchKategoris = async () => {
        const res = await api.getKategori();
        if (res?.status === 'success') setKategoris(res.data);
    };

    const fetchInventory = async () => {
        setLoading(true);
        const res = await api.getMenu();
        if (res?.status === 'success') setMenus(res.data.filter(m => m.use_stock));
        setLoading(false);
    };

    const handleAddStock = async (e, menuId, menuName) => {
        e.stopPropagation();
        const qty = parseFloat(updateQty[menuId] || 0);
        if (qty <= 0) return setNotification({ type: 'error', message: "Jumlah harus lebih dari 0" });
        setIsSaving(menuId);
        try {
            const res = await api.updateStock(menuId, qty);
            if (res?.status === 'success') {
                setUpdateQty(prev => ({ ...prev, [menuId]: '' }));
                setNotification({ type: 'success', message: `+${qty} porsi ${menuName}` });
                fetchInventory();
            } else setNotification({ type: 'error', message: res?.message || "Gagal" });
        } catch { setNotification({ type: 'error', message: "Koneksi bermasalah" }); }
        setIsSaving(null);
    };

    const handleCreateMenu = async (e) => {
        e.preventDefault();
        if (!newMenu.name || !newMenu.price || !newMenu.kategori_id) {
            return setNotification({ type: 'error', message: "Harap isi semua field" });
        }
        setIsSubmitting(true);
        const res = await api.createMenu({ ...newMenu, use_stock: true, stock_qty: 0 });
        if (res?.status === 'success') {
            setNotification({ type: 'success', message: "Menu berhasil ditambahkan" });
            setShowAddMenu(false);
            setNewMenu({ name: '', price: '', kategori_id: '' });
            fetchInventory();
        } else {
            setNotification({ type: 'error', message: res?.message || "Gagal menambah menu" });
        }
        setIsSubmitting(false);
    };

    const filtered = menus.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
        const matchKategori = activeKategori === 'all' || m.kategori?.id === parseInt(activeKategori);
        return matchSearch && matchKategori;
    });

    return (
        <div className="animate-fade-in max-w-[1600px] mx-auto pb-10 relative">
            {notification && (
                <div className={`fixed top-20 right-6 z-[500] px-4 py-3 rounded-lg shadow-md flex items-center gap-2 animate-slide-left text-sm font-medium ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {notification.message}
                </div>
            )}

            <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none items-center">
                    <button onClick={() => setActiveKategori('all')}
                        className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeKategori === 'all' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Semua
                    </button>
                    {kategoris.map(k => (
                        <button key={k.id} onClick={() => setActiveKategori(k.id)}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeKategori === k.id ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {k.name}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <input type="text" placeholder="Cari menu..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full md:w-56 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 placeholder:text-gray-400" />
                    <button onClick={() => setShowAddMenu(true)}
                        className="shrink-0 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
                        + Tambah Menu
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div></div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
                    <p className="font-medium text-gray-500">Tidak ada data stok</p>
                    <p className="text-sm text-gray-400 mt-1">Aktifkan "Gunakan Stok" di Odoo atau klik Tambah Menu.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(m => (
                        <div key={m.id} onClick={() => setSelectedBom({ name: m.name, lines: m.bom_line_ids || [] })}
                            className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col cursor-pointer">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-xs text-gray-400 mb-0.5">{m.kategori?.name}</div>
                                    <h3 className="font-semibold text-gray-800 text-sm">{m.name}</h3>
                                </div>
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${m.stock_qty <= 0 ? 'bg-red-400' : m.stock_qty <= 5 ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-4">
                                <span className={`text-2xl font-bold ${m.stock_qty <= 0 ? 'text-red-500' : 'text-gray-800'}`}>{m.stock_qty}</span>
                                <span className="text-xs text-gray-400">porsi</span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 mb-3" onClick={e => e.stopPropagation()}>
                                <label className="block text-xs text-gray-400 mb-1.5">Tambah Stok</label>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Jumlah" value={updateQty[m.id] || ''} onChange={e => setUpdateQty(prev => ({ ...prev, [m.id]: e.target.value }))}
                                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                                    <button onClick={(e) => handleAddStock(e, m.id, m.name)} disabled={isSaving === m.id}
                                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white min-w-[36px] h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all">
                                        {isSaving === m.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '+'}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto flex justify-between items-center text-xs text-gray-300 pt-2 border-t border-gray-50">
                                <span>Komposisi</span>
                                <span>{m.bom_line_ids?.length || 0} bahan</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* BOM Modal */}
            {selectedBom && (
                <div className="fixed inset-0 bg-black/30 z-[600] flex items-center justify-center p-6 animate-fade-in" onClick={() => setSelectedBom(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-lg overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-gray-800">{selectedBom.name}</h2>
                                <p className="text-sm text-gray-400">Komposisi per 1 porsi</p>
                            </div>
                            <button onClick={() => setSelectedBom(null)} className="text-gray-400 hover:text-gray-600 text-lg px-2">×</button>
                        </div>
                        <div className="p-6">
                            {selectedBom.lines.length === 0 ? (
                                <div className="text-center py-8"><p className="text-gray-500">BOM belum diatur</p><p className="text-sm text-gray-400 mt-1">Atur di Odoo.</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedBom.lines.map((line, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <span className="font-medium text-gray-700 text-sm">{line.bahan_name}</span>
                                            <span className="text-sm"><strong className="text-gray-800">{line.qty}</strong> <span className="text-gray-400">{line.uom}</span></span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedBom(null)} className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah Menu */}
            {showAddMenu && (
                <div className="fixed inset-0 bg-black/30 z-[600] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowAddMenu(false)}>
                    <form onSubmit={handleCreateMenu} className="bg-white rounded-2xl w-full max-w-sm shadow-lg overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800">Tambah Menu Baru</h2>
                            <button type="button" onClick={() => setShowAddMenu(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Kategori</label>
                                <select required value={newMenu.kategori_id} onChange={e => setNewMenu({ ...newMenu, kategori_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400">
                                    <option value="">Pilih Kategori</option>
                                    {kategoris.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nama Menu</label>
                                <input required type="text" placeholder="Misal: Es Teh Manis" value={newMenu.name} onChange={e => setNewMenu({ ...newMenu, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Harga Dasar (Rp)</label>
                                <input required type="number" placeholder="0" value={newMenu.price} onChange={e => setNewMenu({ ...newMenu, price: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-400" />
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg mt-2">
                                Menu ini otomatis disetel menggunakan stok dengan sisa 0 porsi. Silakan tambah stok setelah dibuat.
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAddMenu(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Batal</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Menu'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
