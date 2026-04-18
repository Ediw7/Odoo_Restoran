from odoo import models, fields, api
from odoo.exceptions import ValidationError


class RestoranBahan(models.Model):
    """Model untuk bahan baku / ingredient"""
    _name = 'restoran.bahan'
    _description = 'Bahan Baku'
    _order = 'name'

    name = fields.Char(string='Nama Bahan', required=True)
    code = fields.Char(string='Kode')
    uom = fields.Selection([
        ('kg', 'Kilogram'),
        ('g', 'Gram'),
        ('ltr', 'Liter'),
        ('ml', 'Mililiter'),
        ('pcs', 'Pcs/Buah'),
        ('bks', 'Bungkus'),
        ('btl', 'Botol'),
        ('pack', 'Pack'),
    ], string='Satuan', default='pcs', required=True)

    stock_qty = fields.Float(string='Stok Saat Ini', default=0)
    min_stock = fields.Float(string='Stok Minimum', default=5,
                             help='Peringatan muncul jika stok di bawah angka ini')
    price_per_unit = fields.Float(string='Harga per Satuan')

    stock_status = fields.Selection(
        compute='_compute_stock_status', store=True,
        selection=[
            ('available', 'Tersedia'),
            ('low', 'Menipis'),
            ('empty', 'Habis'),
        ], string='Status Stok'
    )
    active = fields.Boolean(default=True)

    @api.depends('stock_qty', 'min_stock')
    def _compute_stock_status(self):
        for rec in self:
            if rec.stock_qty <= 0:
                rec.stock_status = 'empty'
            elif rec.stock_qty <= rec.min_stock:
                rec.stock_status = 'low'
            else:
                rec.stock_status = 'available'

    def action_add_stock(self, qty):
        """Tambah stok bahan"""
        for rec in self:
            rec.stock_qty += qty

    # _sql_constraints = [
    #     ('stock_positive', 'CHECK(stock_qty >= 0)', 'Stok tidak boleh negatif!'),
    # ]


class RestoranMenuBomLine(models.Model):
    """Bill of Materials - Komposisi bahan per menu"""
    _name = 'restoran.menu.bom.line'
    _description = 'Komposisi Menu (BOM)'
    _order = 'sequence, id'

    menu_id = fields.Many2one(
        'restoran.menu', string='Menu',
        required=True, ondelete='cascade'
    )
    bahan_id = fields.Many2one(
        'restoran.bahan', string='Bahan Baku',
        required=True, ondelete='restrict'
    )
    qty = fields.Float(string='Jumlah per Porsi', required=True, default=1)
    uom = fields.Selection(related='bahan_id.uom', string='Satuan', readonly=True)
    sequence = fields.Integer(default=10)

    # Computed: stok bahan cukup untuk berapa porsi
    available_portions = fields.Float(
        compute='_compute_available_portions',
        string='Bisa Dibuat (porsi)'
    )

    @api.depends('bahan_id.stock_qty', 'qty')
    def _compute_available_portions(self):
        for line in self:
            if line.qty > 0 and line.bahan_id:
                line.available_portions = line.bahan_id.stock_qty / line.qty
            else:
                line.available_portions = 0
