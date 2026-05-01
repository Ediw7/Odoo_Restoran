import React, { useState, useEffect } from "react";
import { api } from "../api";
import { useToast } from "../hooks/useToast";

export default function UserManagement({ cabangList }) {
    const { toast, ToastContainer, confirm, ConfirmDialog } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        login: '',
        password: '',
        role: 'cashier',
        cabang_id: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const res = await api.getUsers();
        if (res.status === 'success') setUsers(res.data);
        setLoading(false);
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                login: user.login,
                password: '', // Password empty by default on edit
                role: user.role,
                cabang_id: user.cabang_id || ''
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                login: '',
                password: '',
                role: 'cashier',
                cabang_id: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.login || (!editingUser && !formData.password)) {
            toast.error("Mohon lengkapi semua data!");
            return;
        }

        const payload = {
            action: editingUser ? 'update' : 'create',
            ...formData
        };
        if (editingUser) payload.id = editingUser.id;

        const res = await api.manageUser(payload);
        if (res.status === 'success') {
            toast.success(editingUser ? "User diperbarui!" : "User ditambahkan!");
            setShowModal(false);
            fetchUsers();
        } else {
            toast.error(res.message || "Gagal memproses user");
        }
    };

    const handleDelete = async (user) => {
        const ok = await confirm({
            title: "Hapus User?",
            message: `Apakah Anda yakin ingin menghapus user ${user.name}? Tindakan ini tidak dapat dibatalkan.`,
            confirmText: "Ya, Hapus",
            danger: true
        });

        if (ok) {
            const res = await api.manageUser({ action: 'delete', id: user.id });
            if (res.status === 'success') {
                toast.success("User berhasil dihapus");
                fetchUsers();
            } else {
                toast.error(res.message);
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 animate-fade-in">
            <ToastContainer />
            <ConfirmDialog />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Manajemen User</h1>
                    <p className="text-sm text-gray-500 mt-1">Kelola akses kasir, manajer, dan admin restoran.</p>
                </div>
                <button onClick={() => handleOpenModal()} 
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                    <span>+</span> Tambah User Baru
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nama User</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Login / Email</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Penempatan</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="5" className="py-20 text-center text-gray-400 font-medium">Memuat data user...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="5" className="py-20 text-center text-gray-400 font-medium">Belum ada user terdaftar</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                                                {user.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-gray-700">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{user.login}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                            user.role === 'owner' ? 'bg-purple-100 text-purple-600' : 
                                            user.role === 'admin' ? 'bg-blue-100 text-blue-600' : 
                                            'bg-orange-100 text-orange-600'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500 italic">{user.cabang_name}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(user)} className="p-2 hover:bg-orange-50 text-orange-500 rounded-lg transition-colors" title="Edit">✏️</button>
                                            <button onClick={() => handleDelete(user)} className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors" title="Hapus">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
                        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium" placeholder="Contoh: Andi Wijaya" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Login / Email</label>
                                <input type="email" value={formData.login} onChange={e => setFormData({...formData, login: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium" placeholder="andi@restoran.com" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password {editingUser && '(Kosongkan jika tak diubah)'}</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium" placeholder="••••••••" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Role</label>
                                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium">
                                        <option value="cashier">Kasir</option>
                                        <option value="admin">Manager</option>
                                        <option value="owner">Owner</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cabang</label>
                                    <select value={formData.cabang_id} onChange={e => setFormData({...formData, cabang_id: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium">
                                        <option value="">Semua Cabang</option>
                                        {cabangList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" 
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-orange-500/20 transition-all uppercase tracking-widest">
                                    {editingUser ? 'Simpan Perubahan' : 'Daftarkan User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
