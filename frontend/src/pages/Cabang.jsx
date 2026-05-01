import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";
import { useToast } from "../hooks/useToast";

export default function Cabang() {
    const [cabangs, setCabangs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCabang, setNewCabang] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast, ToastContainer, confirm, ConfirmDialog } = useToast();
    
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedCabang, setSelectedCabang] = useState(null);
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({
        name: '', login: '', password: '', role: 'cashier'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [resC, resU] = await Promise.all([api.getCabang(), api.getUsers()]);
        if (resC?.status === "success") setCabangs(resC.data);
        if (resU?.status === "success") setUsers(resU.data);
        setLoading(false);
    };

    const handleCreateCabang = async (e) => {
        e.preventDefault();
        if (!newCabang.trim()) return;
        setIsSubmitting(true);
        const res = await api.createCabang({ name: newCabang });
        setIsSubmitting(false);
        if (res?.status === "success") {
            toast.success(`Cabang "${newCabang}" berhasil ditambahkan!`);
            setNewCabang("");
            fetchData();
        } else toast.error(res?.message || "Gagal menambah cabang");
    };

    const handleDeleteCabang = async (id, name) => {
        const ok = await confirm({
            title: "Hapus Cabang?",
            message: `Hapus cabang "${name}"? Data transaksi mungkin ikut hilang.`,
            danger: true
        });
        if (!ok) return;
        const res = await api.deleteCabang(id);
        if (res?.status === "success") {
            toast.success("Cabang berhasil dihapus.");
            fetchData();
        } else toast.error(res?.message);
    };

    const openUserManagement = (cabang) => {
        setSelectedCabang(cabang);
        setShowUserModal(true);
    };

    const handleOpenUserForm = (user = null) => {
        if (user) {
            setEditingUser(user);
            setUserFormData({ name: user.name, login: user.login, password: '', role: user.role });
        } else {
            setEditingUser(null);
            setUserFormData({ name: '', login: '', password: '', role: 'cashier' });
        }
        setShowUserForm(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            action: editingUser ? 'update' : 'create',
            cabang_id: selectedCabang.id,
            ...userFormData
        };
        if (editingUser) payload.id = editingUser.id;
        
        const res = await api.manageUser(payload);
        if (res.status === 'success') {
            toast.success("Data user berhasil disimpan!");
            setShowUserForm(false);
            fetchData();
        } else toast.error(res.message);
    };

    const handleDeleteUser = async (user) => {
        const ok = await confirm({ title: "Hapus User?", message: `Hapus user ${user.name}?`, danger: true });
        if (ok) {
            const res = await api.manageUser({ action: 'delete', id: user.id });
            if (res.status === 'success') {
                toast.success("User dihapus");
                fetchData();
            } else toast.error(res.message);
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto pb-20">
            <ToastContainer />
            <ConfirmDialog />
            
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Manajemen Cabang</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Kelola outlet dan akses login karyawan.</p>
                </div>
                <form onSubmit={handleCreateCabang} className="flex gap-2">
                    <input type="text" value={newCabang} onChange={(e) => setNewCabang(e.target.value)}
                        placeholder="Nama cabang baru..." className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-orange-500 transition-all text-sm font-medium w-64" required />
                    <button type="submit" disabled={isSubmitting || !newCabang.trim()} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">
                        Tambah
                    </button>
                </form>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="py-20 text-center text-gray-400 text-sm font-medium">Memuat data...</div>
                ) : cabangs.map((c) => {
                    const branchUser = users.find(u => u.cabang_id === c.id);
                    return (
                        <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-gray-200 transition-all flex items-center justify-between group">
                            <div className="flex flex-col">
                                <h4 className="font-bold text-gray-800 text-lg">{c.name}</h4>
                                <div className="mt-1 flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-400">
                                        ID Login: <span className="text-gray-600">{branchUser ? branchUser.login : '- belum diatur -'}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-10 items-center">
                                <div className="hidden md:flex gap-8 border-r border-gray-100 pr-8">
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Order</p>
                                        <p className="font-semibold text-gray-700">{c.total_order_today}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Omzet</p>
                                        <p className="font-semibold text-emerald-600">{formatRupiah(c.revenue_today)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            setSelectedCabang(c);
                                            handleOpenUserForm(branchUser);
                                        }} 
                                        className="px-4 py-2 flex items-center gap-2 rounded-xl border border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-bold"
                                    >
                                        <span>✏️</span>
                                        <span>Edit Akses</span>
                                    </button>
                                    <button onClick={() => handleDeleteCabang(c.id, c.name)} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 transition-all" title="Hapus">
                                        <span className="text-lg">🗑️</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Edit Akses */}
            {showUserForm && selectedCabang && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-10 border border-gray-100">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-800">Edit Akses</h2>
                            <p className="text-sm text-orange-500 font-bold mt-1">{selectedCabang.name}</p>
                        </div>
                        
                        <form onSubmit={handleUserSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Staff</label>
                                <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/10 text-sm font-medium" placeholder="Nama" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Login / Email</label>
                                <input type="text" value={userFormData.login} onChange={e => setUserFormData({...userFormData, login: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/10 text-sm font-medium" placeholder="email@login.com" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password {editingUser && '(Opsional)'}</label>
                                <input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/10 text-sm font-medium" placeholder="••••••••" required={!editingUser} />
                            </div>
                            
                            <div className="flex gap-2 pt-6">
                                <button type="button" onClick={() => setShowUserForm(false)} className="flex-1 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl text-sm transition-colors">Batal</button>
                                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
