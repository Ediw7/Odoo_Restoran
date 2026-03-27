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

    # ========== STOCK MANAGEMENT ==========
    stock_qty = fields.Float(string='Stok', default=0, tracking=True)
    min_stock = fields.Float(string='Stok Minimum', default=5,
                             help='Menu akan ditandai "Menipis" jika stok kurang dari angka ini')
    stock_status = fields.Selection(
        compute='_compute_stock_status', store=True,
        selection=[
            ('in_stock', 'Tersedia'),
            ('low_stock', 'Menipis'),
            ('out_of_stock', 'Habis'),
        ], string='Status Stok'
    )
    use_stock = fields.Boolean(string='Gunakan Manajemen Stok', default=True,
                               help='Jika diaktifkan, stok akan berkurang setiap order dikonfirmasi')

    # ========== BILL OF MATERIALS (BOM) ==========
    bom_line_ids = fields.One2many(
        'restoran.menu.bom.line', 'menu_id',
        string='Komposisi Bahan (BOM)'
    )
    bom_count = fields.Integer(compute='_compute_bom_count', string='Jumlah Bahan')

    @api.depends('bom_line_ids')
    def _compute_bom_count(self):
        for rec in self:
            rec.bom_count = len(rec.bom_line_ids)

    @api.depends('price', 'cost')
    def _compute_profit_margin(self):
        for rec in self:
            if rec.price > 0 and rec.cost > 0:
                rec.profit_margin = ((rec.price - rec.cost) / rec.price) * 100
            else:
                rec.profit_margin = 0.0

    @api.depends('stock_qty', 'min_stock', 'use_stock')
    def _compute_stock_status(self):
        for rec in self:
            if not rec.use_stock:
                rec.stock_status = 'in_stock'
            elif rec.stock_qty <= 0:
                rec.stock_status = 'out_of_stock'
            elif rec.stock_qty <= rec.min_stock:
                rec.stock_status = 'low_stock'
            else:
                rec.stock_status = 'in_stock'

    def action_add_stock(self, qty):
        """Tambah stok menu"""
        for rec in self:
            rec.stock_qty += qty
            if rec.stock_qty > 0 and not rec.available:
                rec.available = True

    def _deduct_stock(self, qty):
        """Kurangi stok menu saat order dikonfirmasi"""
        for rec in self:
            if not rec.use_stock:
                return
            if rec.stock_qty < qty:
                raise models.ValidationError(
                    f'Stok "{rec.name}" tidak cukup! Sisa: {rec.stock_qty}, dibutuhkan: {qty}'
                )
            rec.stock_qty -= qty
            # Auto-set unavailable jika stok habis
            if rec.stock_qty <= 0:
                rec.available = False

    def _deduct_bom_stock(self, portions=1):
        """Kurangi stok bahan baku berdasarkan BOM"""
        for rec in self:
            for bom_line in rec.bom_line_ids:
                needed = bom_line.qty * portions
                bahan = bom_line.bahan_id
                if bahan.stock_qty < needed:
                    raise models.ValidationError(
                        f'Bahan "{bahan.name}" tidak cukup! '
                        f'Sisa: {bahan.stock_qty} {bahan.uom}, '
                        f'dibutuhkan: {needed} {bahan.uom} untuk {portions} porsi "{rec.name}"'
                    )
                bahan.stock_qty -= needed

    _sql_constraints = [
        ('price_positive', 'CHECK(price >= 0)', 'Harga tidak boleh negatif!'),
    ]

