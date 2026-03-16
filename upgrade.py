import xmlrpc.client
url = 'http://localhost:8069'
db = 'odoo_produksi'
username = 'admin'
password = 'admin'
common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(url))
uid = common.authenticate(db, username, password, {})
models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(url))
modules = models.execute_kw(db, uid, password, 'ir.module.module', 'search', [[('name', '=', 'restoran_edi')]])
models.execute_kw(db, uid, password, 'ir.module.module', 'button_immediate_upgrade', [modules])
