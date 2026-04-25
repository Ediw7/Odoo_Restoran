from odoo import models, fields

class RestoranSupplier(models.Model):
    _name = 'restoran.supplier'
    _description = 'Supplier Bahan Baku'
    _rec_name = 'name'

    name = fields.Char(string='Nama Supplier', required=True)
    phone = fields.Char(string='No. Telepon')
    address = fields.Text(string='Alamat')
    active = fields.Boolean(default=True)
    
    purchase_ids = fields.One2many('restoran.purchase', 'supplier_id', string='Riwayat Pembelian')
