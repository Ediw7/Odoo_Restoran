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
    getDashboard: (cabangId, period = 'today') => {
        let url = `/api/dashboard?period=${period}`;
        if (cabangId) url += `&cabang_id=${cabangId}`;
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
    getOrders: (cabangId, state) => {
        let url = '/api/orders';
        const params = [];
        if (cabangId) params.push(`cabang_id=${cabangId}`);
        if (state && state !== 'all') params.push(`state=${state}`);
        if (params.length) url += '?' + params.join('&');
        return apiFetch(url);
    },
    getChartData: (cabangId, days = 7) => {
        let url = `/api/dashboard/chart?days=${days}`;
        if (cabangId) url += `&cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    createOrder: (payload) => apiFetch('/api/orders_create', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    updateOrderStatus: (orderId, action, params = {}) => apiFetch(`/api/order_status/${orderId}/${action}`, {
        method: 'POST',
        body: JSON.stringify(params)
    }),
    updateStock: (menuId, qty) => apiFetch('/api/update_stock', {
        method: 'POST',
        body: JSON.stringify({ menu_id: menuId, qty })
    }),
    createMenu: (payload) => apiFetch('/api/menu_create', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    getBahanBaku: () => apiFetch('/api/bahan_baku'),
    updateStockBahan: (bahanId, qty) => apiFetch('/api/update_bahan_baku', {
        method: 'POST',
        body: JSON.stringify({ bahan_id: bahanId, qty })
    }),
    createBahanBaku: (payload) => apiFetch('/api/bahan_baku_create', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
};

export const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(number);
};

export const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const getStatusLabel = (s) => {
    const map = {
        'draft': 'Draft', 'confirmed': 'Dikonfirmasi', 'preparing': 'Disiapkan',
        'ready': 'Siap Saji', 'done': 'Selesai', 'cancelled': 'Dibatalkan',
    };
    return map[s] || s;
};

export const getStatusColor = (s) => {
    const map = {
        'draft': 'bg-gray-100 text-gray-500',
        'confirmed': 'bg-blue-50 text-blue-600',
        'preparing': 'bg-yellow-50 text-yellow-700',
        'ready': 'bg-green-50 text-green-700',
        'done': 'bg-gray-100 text-gray-600',
        'cancelled': 'bg-red-50 text-red-600'
    };
    return map[s] || 'bg-gray-100 text-gray-600';
};

export const getTypeLabel = (t) => {
    const map = { 'dine_in': 'Dine In', 'take_away': 'Take Away', 'delivery': 'Delivery' };
    return map[t] || t;
};