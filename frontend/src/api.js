export const apiFetch = async (url, options = {}) => {
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        return { status: 'error', message: error.message };
    }
};

export const api = {
    apiFetch,
    login: (username, password) => apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    }),
    getDashboard: (cabangId) => {
        let url = '/api/dashboard';
        if (cabangId) url += `?cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    getCabang: () => apiFetch('/api/cabang'),


    manageCabang: (payload) => apiFetch('/api/cabang_action', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    getMenu: (kategoriId) => {
        let url = '/api/menu';
        if (kategoriId && kategoriId !== 'all') url += `?kategori_id=${kategoriId}`;
        return apiFetch(url);
    },
    getKategori: () => apiFetch('/api/kategori'),
    getOrders: () => apiFetch('/api/orders'),
    createOrder: (payload) => apiFetch('/api/orders_create', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    updateOrderStatus: (orderId, action) => apiFetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST'
    }),
};

export const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

export const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const getStatusLabel = (s) => {
    const map = {
        'draft': 'Draft', 'confirmed': 'Dikonfirmasi', 'preparing': 'Sedang Disiapkan',
        'ready': 'Siap Saji', 'done': 'Selesai', 'cancelled': 'Dibatalkan',
    };
    return map[s] || s;
};

export const getStatusColor = (s) => {
    const map = {
        'draft': 'bg-slate-100 text-slate-500',
        'confirmed': 'bg-blue-100 text-blue-700',
        'preparing': 'bg-amber-100 text-amber-700',
        'ready': 'bg-emerald-100 text-emerald-700',
        'done': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };
    return map[s] || 'bg-slate-100 text-slate-700';
};

export const getTypeLabel = (t) => {
    const map = { 'dine_in': 'Dine In', 'take_away': 'Take Away', 'delivery': 'Delivery' };
    return map[t] || t;
};