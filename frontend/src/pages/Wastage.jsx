import React, { useState, useEffect } from 'react';
import { api, formatRupiah, formatTime } from '../api';
import { useToast } from '../hooks/useToast';

export default function Wastage({ cabangId }) {
    const { toast, ToastContainer } = useToast();
    const [wastages, setWastages] = useState([]);
    const [bahanList, setBahanList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [lines, setLines] = useState([{ bahan_id: '', qty: 1, reason: 'damaged' }]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchWastages();
        fetchBahan();
    }, [cabangId]);

    const fetchWastages = async () => {
        setLoading(true);
        const res = await api.getWastage(cabangId);
        if (res?.status === 'success') setWastages(res.data);
        setLoading(false);
    };

    const fetchBahan = async () => {
        const res = await api.getBahanBaku();
        if (res?.status === 'success') setBahanList(res.data);
    };

    const handleAddLine = () => {
        setLines([...lines, { bahan_id: '', qty: 1, reason: 'damaged' }]);
    };

    const handleRemoveLine = (index) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...lines];
        newLines[index][field] = value;
        setLines(newLines);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (lines.some(l => !l.bahan_id || l.qty <= 0)) {
            toast.warning("Harap isi semua bahan dan jumlah dengan benar.");
            return;
        }

        setSubmitting(true);
        const res = await api.createWastage(cabangId, lines, notes);
        if (res?.status === 'success') {
            // Auto confirm for now to simplify
            await api.confirmWastage(res.data.id);
            setShowModal(false);
            setLines([{ bahan_id: '', qty: 1, reason: 'damaged' }]);
            setNotes('');
            fetchWastages();
        } else {
            toast.error(res?.message || "Gagal menyimpan data.");
        }
        setSubmitting(false);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <ToastContainer />
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">STOK RUSAK & EXPIRED</h1>
                    <p className="text-gray-500 text-sm font-medium">Catat bahan baku yang tidak layak pakai untuk akurasi stok.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-orange-200 transition-all flex items-center gap-2"
                >
                    <span className="text-lg">+</span> Catat Bahan Rusak
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referensi</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Kerugian</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400 font-medium">Memuat data...</td></tr>
                        ) : wastages.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400 font-medium">Belum ada catatan barang rusak.</td></tr>
                        ) : wastages.map(w => (
                            <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{w.name}</div>
                                    <div className="text-[10px] text-gray-400 font-medium font-mono uppercase">{w.responsible}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-semibold text-gray-700">{new Date(w.date).toLocaleDateString('id-ID')}</div>
                                    <div className="text-xs text-gray-400">{formatTime(w.date)}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-semibold text-gray-600">
                                        {w.lines.map(l => `${l.bahan_name} (${l.qty} ${l.uom})`).join(', ')}
                                    </div>
                                    {w.notes && <div className="text-[10px] text-orange-400 mt-0.5 italic">"{w.notes}"</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-black text-orange-500">{formatRupiah(w.total_loss)}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${w.state === 'done' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {w.state === 'done' ? 'Selesai' : 'Draft'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Catat Stok Rusak</h3>
                                <p className="text-gray-500 text-xs font-medium">Sistem akan otomatis mengurangi stok gudang saat disimpan.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl">×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                {lines.map((line, idx) => (
                                    <div key={idx} className="flex gap-3 items-end bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Bahan Baku</label>
                                            <select
                                                value={line.bahan_id}
                                                onChange={e => handleLineChange(idx, 'bahan_id', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:border-orange-400 transition-all"
                                                required
                                            >
                                                <option value="">Pilih Bahan...</option>
                                                {bahanList.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name} (Sisa: {b.stock_qty} {b.uom})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Jumlah</label>
                                            <input
                                                type="number" step="0.01" value={line.qty}
                                                onChange={e => handleLineChange(idx, 'qty', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:border-orange-400"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Alasan</label>
                                            <select
                                                value={line.reason}
                                                onChange={e => handleLineChange(idx, 'reason', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:border-orange-400"
                                            >
                                                <option value="expired">Expired/Kadaluarsa</option>
                                                <option value="damaged">Rusak/Busuk</option>
                                                <option value="spilled">Tumpah/Bocor</option>
                                                <option value="human_error">Kesalahan Masak</option>
                                                <option value="other">Lainnya</option>
                                            </select>
                                        </div>
                                        {lines.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveLine(idx)} className="p-2.5 text-orange-500 hover:bg-orange-50 rounded-xl transition-colors mb-0.5">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={handleAddLine}
                                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black text-gray-400 uppercase tracking-widest hover:border-orange-200 hover:text-orange-400 hover:bg-orange-50/30 transition-all"
                                >
                                    + Tambah Bahan Lain
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Keterangan Tambahan</label>
                                <textarea
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Contoh: Sayur layu karena kulkas mati semalam..."
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:bg-white focus:border-orange-400 transition-all h-24 resize-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-200 transition-all transform active:scale-[0.98]"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Pemotongan Stok'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
