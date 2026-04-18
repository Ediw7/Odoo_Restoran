from odoo import models, fields, api, _

class RestoranCustomer(models.Model):
    _name = 'restoran.customer'
    _description = 'Customer Loyalty'
    _rec_name = 'name'

    name = fields.Char(string='Nama Pelanggan', required=True, index=True)
    phone = fields.Char(string='No. Telepon')
    
    visit_count = fields.Integer(string='Jumlah Kunjungan', default=0)
    loyalty_points = fields.Integer(string='Poin Loyalty', default=0)
    
    last_visit = fields.Datetime(string='Kunjungan Terakhir')
    
    order_ids = fields.One2many('restoran.order', 'customer_id', string='Riwayat Order')

    _sql_constraints = [
        ('name_unique', 'unique(name)', 'Nama pelanggan sudah terdaftar!')
    ]

    def register_visit(self):
        for rec in self:
            rec.visit_count += 1
            rec.loyalty_points += 10 # 10 poin per kunjungan
            rec.last_visit = fields.Datetime.now()
