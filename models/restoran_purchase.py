from odoo import models, fields, api, _

class RestoranPurchase(models.Model):
    _name = 'restoran.purchase'
    _description = 'Purchase Order Bahan'
    _order = 'date_order desc, id desc'

    name = fields.Char(string='No. PO', required=True, copy=False, readonly=True, default=lambda self: _('New'))
    supplier_id = fields.Many2one('restoran.supplier', string='Supplier', required=True)
    cabang_id = fields.Many2one('restoran.cabang', string='Cabang Penerima', required=True)
    date_order = fields.Datetime(string='Tanggal Order', default=fields.Datetime.now, required=True)
    date_received = fields.Datetime(string='Tanggal Terima')
    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Dikonfirmasi (PO Dikirim)'),
        ('done', 'Selesai (Barang Diterima)'),
        ('cancelled', 'Dibatalkan')
    ], string='Status', default='draft')
    
    line_ids = fields.One2many('restoran.purchase.line', 'purchase_id', string='Detail PO')
    total_amount = fields.Float(string='Total Tagihan', compute='_compute_total', store=True)
    note = fields.Text(string='Catatan')

    @api.depends('line_ids.subtotal')
    def _compute_total(self):
        for rec in self:
            rec.total_amount = sum(rec.line_ids.mapped('subtotal'))

    @api.model
    def create(self, vals):
        if vals.get('name', _('New')) == _('New'):
            vals['name'] = self.env['ir.sequence'].next_by_code('restoran.purchase') or _('New')
        return super(RestoranPurchase, self).create(vals)

    def action_confirm(self):
        for rec in self:
            rec.write({'state': 'confirmed'})

    def action_receive(self):
        # Saat barang diterima, tambah stok ke restoran.bahan
        for rec in self:
            for line in rec.line_ids:
                line.bahan_id.stock_qty += line.qty
                # Update HPP bahan jika harga beli baru berbeda drastis (opsional, tp kita skip dlu atau sederhananya kita update)
                # Opsi: line.bahan_id.price_per_unit = line.price_unit (metode Last Purchase Price)
                line.bahan_id.price_per_unit = line.price_unit
            rec.write({'state': 'done', 'date_received': fields.Datetime.now()})

class RestoranPurchaseLine(models.Model):
    _name = 'restoran.purchase.line'
    _description = 'Line Detail PO'

    purchase_id = fields.Many2one('restoran.purchase', string='PO Reference', ondelete='cascade')
    bahan_id = fields.Many2one('restoran.bahan', string='Bahan Baku', required=True)
    qty = fields.Float(string='Jumlah', required=True, default=1.0)
    uom = fields.Selection(related='bahan_id.uom', string='Satuan', readonly=True)
    price_unit = fields.Float(string='Harga Beli Satuan', required=True)
    subtotal = fields.Float(string='Subtotal', compute='_compute_subtotal', store=True)

    @api.depends('qty', 'price_unit')
    def _compute_subtotal(self):
        for line in self:
            line.subtotal = line.qty * line.price_unit

    @api.onchange('bahan_id')
    def _onchange_bahan(self):
        if self.bahan_id:
            # Default ke harga beli lama (HPP)
            if hasattr(self.bahan_id, 'price_per_unit') and getattr(self.bahan_id, 'price_per_unit', False):
                self.price_unit = self.bahan_id.price_per_unit
