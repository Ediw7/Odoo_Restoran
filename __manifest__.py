{
    'name': 'Restoran Multi-Cabang',
    'version': '1.0',
    'category': 'Restaurant',
    'summary': 'Sistem Manajemen Restoran Multi-Cabang dengan REST API untuk Frontend React',
    'description': """
        Modul restoran multi-cabang yang mendukung:
        - Manajemen cabang restoran (buka/tutup, statistik per cabang)
        - Manajemen menu makanan & minuman per kategori
        - Order & transaksi per cabang dengan workflow
        - REST API (JSON) untuk integrasi dengan frontend React.js
        - Multi-cabang menggunakan fitur Multi-Company Odoo
        - Dashboard statistik semua cabang
    """,
    'depends': ['base', 'mail', 'product'],
    'data': [
        'security/ir.model.access.csv',
        'data/demo_data.xml',
        'views/cabang_view.xml',
        'views/menu_view.xml',
        'views/order_view.xml',
        'views/res_users_view.xml',
        'views/menuitem.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
