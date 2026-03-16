from odoo import models, fields, api


class RestoranCabang(models.Model):
    _name = 'restoran.cabang'
    _description = 'Cabang Restoran'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name'

    name = fields.Char(string='Nama Cabang', required=True, tracking=True)
    code = fields.Char(string='Kode Cabang', required=True, tracking=True)
    address = fields.Text(string='Alamat', tracking=True)
    phone = fields.Char(string='Telepon')
    manager_id = fields.Many2one('res.users', string='Manager Cabang')
    company_id = fields.Many2one(
        'res.company', string='Company',
        default=lambda self: self.env.company, required=True
    )
    active = fields.Boolean(default=True)
    is_open = fields.Boolean(string='Buka', default=True, tracking=True)

    # Relasi
    menu_ids = fields.One2many('restoran.menu', 'cabang_id', string='Menu')
    order_ids = fields.One2many('restoran.order', 'cabang_id', string='Orders')

    # Computed
    total_menu = fields.Integer(compute='_compute_stats', string='Total Menu')
    total_order_today = fields.Integer(compute='_compute_stats', string='Order Hari Ini')
    revenue_today = fields.Float(compute='_compute_stats', string='Pendapatan Hari Ini')

    @api.depends('menu_ids', 'order_ids')
    def _compute_stats(self):
        today = fields.Date.today()
        for rec in self:
            rec.total_menu = len(rec.menu_ids.filtered(lambda m: m.available))
            today_orders = rec.order_ids.filtered(
                lambda o: o.order_date and o.order_date.date() == today and o.state == 'done'
            )
            rec.total_order_today = len(today_orders)
            rec.revenue_today = sum(today_orders.mapped('total_amount'))

    _sql_constraints = [
        ('code_unique', 'UNIQUE(code)', 'Kode cabang harus unik!')
    ]
