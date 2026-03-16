from odoo import models, fields, api


class RestoranMenuKategori(models.Model):
    _name = 'restoran.menu.kategori'
    _description = 'Kategori Menu'
    _order = 'sequence, name'

    name = fields.Char(string='Nama Kategori', required=True)
    sequence = fields.Integer(default=10)
    icon = fields.Char(string='Icon (emoji)', default='🍽️')
    active = fields.Boolean(default=True)
    menu_count = fields.Integer(compute='_compute_menu_count')

    @api.depends()
    def _compute_menu_count(self):
        for rec in self:
            rec.menu_count = self.env['restoran.menu'].search_count([
                ('kategori_id', '=', rec.id)
            ])


class RestoranMenu(models.Model):
    _name = 'restoran.menu'
    _description = 'Menu Restoran'
    _inherit = ['mail.thread']
    _order = 'kategori_id, sequence, name'

    name = fields.Char(string='Nama Menu', required=True, tracking=True)
    code = fields.Char(string='Kode Menu')
    description = fields.Text(string='Deskripsi')
    kategori_id = fields.Many2one(
        'restoran.menu.kategori', string='Kategori',
        required=True, ondelete='restrict'
    )
    cabang_id = fields.Many2one(
        'restoran.cabang', string='Cabang',
        help='Kosongkan jika menu berlaku untuk semua cabang'
    )
    price = fields.Float(string='Harga', required=True, tracking=True)
    cost = fields.Float(string='Harga Pokok')
    image = fields.Binary(string='Gambar', attachment=True)
    sequence = fields.Integer(default=10)
    available = fields.Boolean(string='Tersedia', default=True, tracking=True)
    is_spicy = fields.Boolean(string='Pedas')
    is_bestseller = fields.Boolean(string='Best Seller')
    preparation_time = fields.Integer(string='Waktu Persiapan (menit)', default=15)

    # Tags
    tag = fields.Selection([
        ('new', 'Baru'),
        ('promo', 'Promo'),
        ('bestseller', 'Best Seller'),
        ('recommended', 'Rekomendasi'),
    ], string='Tag')

    company_id = fields.Many2one(
        'res.company', string='Company',
        default=lambda self: self.env.company
    )

    profit_margin = fields.Float(
        compute='_compute_profit_margin',
        string='Margin Keuntungan (%)'
    )

    @api.depends('price', 'cost')
    def _compute_profit_margin(self):
        for rec in self:
            if rec.price > 0 and rec.cost > 0:
                rec.profit_margin = ((rec.price - rec.cost) / rec.price) * 100
            else:
                rec.profit_margin = 0.0

    _sql_constraints = [
        ('price_positive', 'CHECK(price >= 0)', 'Harga tidak boleh negatif!'),
    ]
