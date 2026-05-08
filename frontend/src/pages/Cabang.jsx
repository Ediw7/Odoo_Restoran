import React, { useState, useEffect } from "react";
import { api, formatRupiah } from "../api";
import { useToast } from "../hooks/useToast";

export default function Cabang({ onOpenManagerDashboard }) {
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
        name: '', login: '', password: '', role: 'cashier',
        branchName: '' // Added for rename
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
        const branchName = newCabang.trim();
        if (!branchName) return;
        
        setIsSubmitting(true);
        try {
            const res = await api.createCabang({ name: branchName });
            if (res?.status === "success") {
                toast.success(`Cabang "${branchName}" berhasil ditambahkan!`);
                const createdCabang = res.data;
                setNewCabang("");
                
                // Open user form immediately for the new branch
                setSelectedCabang(createdCabang);
                handleOpenUserForm(null);
                
                // Refresh list in background
                fetchData();
            } else {
                toast.error(res?.message || "Gagal menambah cabang");
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
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

    const handleOpenUserForm = (user = null, cabang = selectedCabang) => {
        setSelectedCabang(cabang);
        if (user) {
            setEditingUser(user);
            setUserFormData({ 
                name: user.name, 
                login: user.login, 
                password: '', 
                role: user.role || 'cashier',
                branchName: cabang?.name || ''
            });
        } else {
            setEditingUser(null);
            setUserFormData({ 
                name: '', 
                login: '', 
                password: '', 
                role: 'cashier',
                branchName: cabang?.name || ''
            });
        }
        setShowUserForm(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Rename Branch if changed
            if (userFormData.branchName !== selectedCabang.name) {
                await api.manageCabang({
                    action: 'update',
                    id: selectedCabang.id,
                    name: userFormData.branchName
                });
            }

            // 2. Update User
            const payload = {
                action: editingUser ? 'update' : 'create',
                cabang_id: selectedCabang.id,
                name: userFormData.name,
                login: userFormData.login,
                password: userFormData.password,
                role: userFormData.role
            };
            if (editingUser) payload.id = editingUser.id;
            
            const res = await api.manageUser(payload);
            if (res.status === 'success') {
                toast.success("Data berhasil diperbarui!");
                setShowUserForm(false);
                fetchData();
            } else toast.error(res.message);
        } catch (err) {
            toast.error("Gagal memperbarui data");
        } finally {
            setIsSubmitting(false);
        }
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

    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        branchName: '', userName: '', login: '', password: ''
    });

    const filteredCabangs = cabangs.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUnifiedCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Create Branch
            const resC = await api.createCabang({ name: createFormData.branchName });
            if (resC.status !== 'success') throw new Error(resC.message);
            
            const newBranchId = resC.data.id;
            
            // 2. Create Users for that Branch
            const roles = ['cashier', 'kitchen', 'manager'];
            const prefix = createFormData.branchName.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const r of roles) {
                let namePrefix = r === 'cashier' ? 'Kasir' : (r === 'kitchen' ? 'Dapur' : 'Manajer');
                let loginPrefix = r === 'cashier' ? 'kasir' : (r === 'kitchen' ? 'dapur' : 'manajer');
                await api.manageUser({
                    action: 'create',
                    cabang_id: newBranchId,
                    name: `${namePrefix} ${createFormData.branchName}`,
                    login: `${loginPrefix}${prefix}@gmail.com`,
                    password: `${prefix}123`,
                    role: r
                });
            }
            
            toast.success("Cabang & Akun berhasil dibuat!");
            setShowCreateModal(false);
            setCreateFormData({ branchName: '', userName: '', login: '', password: '' });
            fetchData();
        } catch (err) {
            toast.error(err.message || "Gagal membuat data");
        } finally {
            setIsSubmitting(false);
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
                <div className="flex gap-3">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cari cabang..." 
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-orange-500 transition-all text-sm font-medium w-64 shadow-sm" 
                        />
                    </div>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap"
                    >
                        + Tambah Cabang
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="py-20 text-center text-gray-400 text-sm font-medium">Memuat data...</div>
                ) : filteredCabangs.map((c) => {
                    const branchUsers = users.filter(u => u.cabang_id === c.id);
                    return (
                        <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-gray-200 transition-all group shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Toggle Buka/Tutup */}
                                    <button 
                                        onClick={async () => {
                                            const res = await api.manageCabang({ action: 'toggle', id: c.id });
                                            if (res?.status === 'success') { toast.success(`Cabang ${c.is_open ? 'ditutup' : 'dibuka'}`); fetchData(); }
                                            else toast.error(res?.message || 'Gagal toggle');
                                        }}
                                        className={`w-12 h-7 rounded-full relative transition-all cursor-pointer ${c.is_open ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                        title={c.is_open ? 'Klik untuk tutup' : 'Klik untuk buka'}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${c.is_open ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800 text-lg">{c.name}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${c.is_open ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {c.is_open ? 'Buka' : 'Tutup'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Actions */}
                                    <div className="flex gap-2 items-center">
                                        <button onClick={() => onOpenManagerDashboard && onOpenManagerDashboard(c.id)} className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold px-4 py-2 rounded-xl transition-colors">
                                            Lihat Dashboard
                                        </button>
                                        <button onClick={() => handleDeleteCabang(c.id, c.name)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all" title="Hapus Cabang">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {/* Staff Accounts Section */}
                            <div className="mt-4 border-t border-gray-100 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Akun Staff Karyawan ({branchUsers.filter(u => u.role !== 'branch_device').length})</h5>
                                    <button onClick={() => handleOpenUserForm(null, c)} className="text-xs text-orange-500 font-bold hover:text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors">+ Tambah Staff</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {branchUsers.filter(u => u.role !== 'branch_device' && u.role !== 'branch').map(bu => (
                                        <div key={bu.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-3 rounded-xl">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-gray-800">{bu.name}</span>
                                                    <span className="text-[9px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{bu.role}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">{bu.login}</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenUserForm(bu, c)} className="p-2 text-gray-400 hover:text-orange-500 transition-colors" title="Edit">✏️</button>
                                                <button onClick={() => handleDeleteUser(bu)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Hapus">🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                    {branchUsers.filter(u => u.role !== 'branch_device' && u.role !== 'branch').length === 0 && (
                                        <div className="text-xs text-gray-400 italic py-2">Belum ada staf terdaftar di cabang ini.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredCabangs.length === 0 && !loading && (
                    <div className="py-20 text-center text-gray-400 text-sm font-medium">Cabang tidak ditemukan</div>
                )}
            </div>

            {/* Modal Tambah Cabang Baru */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-10 border border-gray-100 animate-scale-in">
                        <div className="mb-8 text-center">
                            <h2 className="text-2xl font-bold text-gray-800">Tambah Cabang Baru</h2>
                            <p className="text-sm text-gray-400 mt-1">Buat unit bisnis & akun pengelola sekaligus.</p>
                        </div>
                        
                        <form onSubmit={handleUnifiedCreate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Cabang</label>
                                <input type="text" value={createFormData.branchName} onChange={e => setCreateFormData({...createFormData, branchName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium" placeholder="Contoh: Cabang Jakarta" required />
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-orange-500 bg-orange-50 p-2 rounded-lg mt-2">
                                        INFO: Sistem akan otomatis membuat 3 akun staf standar dengan format password default (nama_cabang+123).<br/><br/>
                                        - kasir[namacabang]@gmail.com<br/>
                                        - dapur[namacabang]@gmail.com<br/>
                                        - manajer[namacabang]@gmail.com
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-bold rounded-xl text-sm transition-colors">Batal</button>
                                <button type="submit" disabled={isSubmitting} className="flex-2 py-3.5 bg-orange-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all px-8">
                                    {isSubmitting ? 'Memproses...' : 'Simpan & Buat Cabang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit Akses */}
            {showUserForm && selectedCabang && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-10 border border-gray-100 animate-scale-in">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-800">Edit Cabang & Akses</h2>
                            <p className="text-sm text-gray-400 mt-1">Sesuaikan identitas outlet dan kredensial login.</p>
                        </div>
                        
                        <form onSubmit={handleUserSubmit} className="space-y-5">
                            <div className="space-y-1.5 pb-4 border-b border-gray-50">
                                <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest ml-1">Nama Cabang</label>
                                <input type="text" value={userFormData.branchName} onChange={e => setUserFormData({...userFormData, branchName: e.target.value})} className="w-full px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-gray-800" placeholder="Nama Cabang" required />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Staff</label>
                                <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium" placeholder="Nama" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Login / Email</label>
                                <input type="text" value={userFormData.login} onChange={e => setUserFormData({...userFormData, login: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium" placeholder="email@login.com" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Role Akun</label>
                                <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium">
                                    <option value="cashier">Kasir (POS)</option>
                                    <option value="kitchen">Dapur (KDS)</option>
                                    <option value="manager">Manager Cabang (Gudang & Dash)</option>
                                    <option value="branch_device">Device Launcher (Hanya Layar Awal)</option>
                                    <option value="admin">Owner / General Manager</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password {editingUser && '(Isi untuk ganti)'}</label>
                                <input type="password" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-500 text-sm font-medium" placeholder="••••••••" required={!editingUser} />
                            </div>
                            
                            <div className="flex gap-2 pt-6">
                                <button type="button" onClick={() => setShowUserForm(false)} className="flex-1 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl text-sm transition-colors">Batal</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                                    {isSubmitting ? 'Saving...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
