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
    createCabang: (data) => apiFetch('/api/cabang_create', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteCabang: (cabangId) => apiFetch('/api/cabang_delete', {
        method: 'POST',
        body: JSON.stringify({ cabang_id: cabangId })
    }),
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
    getOrders: (cabangId, state, dateFilter = 'all', limit = 15, offset = 0) => {
        let url = '/api/orders';
        const params = [];
        if (cabangId) params.push(`cabang_id=${cabangId}`);
        if (state && state !== 'all') params.push(`state=${state}`);
        if (dateFilter && dateFilter !== 'all') params.push(`date_filter=${dateFilter}`);
        params.push(`limit=${limit}`, `offset=${offset}`);
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
    getBahanBaku: (cabangId) => {
        let url = '/api/bahan_baku';
        if (cabangId) url += `?cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    createBahanBaku: (data) => apiFetch('/api/bahan_baku_create', { method: 'POST', body: JSON.stringify(data) }),
    updateBahanStock: (data) => apiFetch('/api/update_bahan_baku', { method: 'POST', body: JSON.stringify(data) }),
    getFinanceReport: (cabangId, filterMode, filterValue) => {
        let url = `/api/report_finance?filter_mode=${filterMode}&filter_value=${filterValue}`;
        if (cabangId) url += `&cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    getWastage: (cabangId, limit = 20, offset = 0) => {
        let url = `/api/wastage?limit=${limit}&offset=${offset}`;
        if (cabangId) url += `&cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    createWastage: (cabangId, lines, notes) => apiFetch('/api/wastage_create', {
        method: 'POST',
        body: JSON.stringify({ cabang_id: cabangId, lines, notes })
    }),
    confirmWastage: (wastageId) => apiFetch('/api/wastage_confirm', {
        method: 'POST',
        body: JSON.stringify({ wastage_id: wastageId })
    }),
    getTopCustomers: (limit = 20, cabangId) => {
        let url = `/api/top_customers?limit=${limit}`;
        if (cabangId) url += `&cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    checkCustomer: (name) => apiFetch(`/api/customer_check?name=${encodeURIComponent(name)}`),
    claimReward: (name) => apiFetch('/api/customer_claim', {
        method: 'POST',
        body: JSON.stringify({ name })
    }),
    injectReward: (customerId, rewardText) => apiFetch('/api/customer_inject_reward', {
        method: 'POST',
        body: JSON.stringify({ customer_id: customerId, reward_text: rewardText })
    }),
    claimSpecialReward: (name) => apiFetch('/api/customer_claim_special', {
        method: 'POST',
        body: JSON.stringify({ name })
    }),
    updatePin: (cabangId, newPin) => apiFetch('/api/cabang/update_pin', {
        method: 'POST',
        body: JSON.stringify({ cabang_id: cabangId, new_pin: newPin })
    }),
    createSupplier: (data) => apiFetch('/api/supplier_create', { method: 'POST', body: JSON.stringify(data) }),
    deleteSupplier: (supplierId) => apiFetch(`/api/supplier_delete/${supplierId}`, { method: 'POST' }),

    // Purchasing
    getSuppliers: (cabangId) => {
        let url = '/api/suppliers';
        if (cabangId) url += `?cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    getPurchases: (cabangId, limit = 20, offset = 0) => {
        let url = `/api/purchases?limit=${limit}&offset=${offset}`;
        if (cabangId) url += `&cabang_id=${cabangId}`;
        return apiFetch(url);
    },
    createPurchase: (cabangId, supplierId, lines, note) => apiFetch('/api/purchase_create', {
        method: 'POST',
        body: JSON.stringify({ cabang_id: cabangId, supplier_id: supplierId, lines, note })
    }),
    receivePurchase: (purchaseId) => apiFetch('/api/purchase_receive', {
        method: 'POST',
        body: JSON.stringify({ purchase_id: purchaseId })
    }),
    // User Management
    getUsers: () => apiFetch('/api/users'),
    manageUser: (payload) => apiFetch('/api/users/action', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
};

export const formatRupiah = (number) => {
    const val = parseFloat(number) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(val);
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