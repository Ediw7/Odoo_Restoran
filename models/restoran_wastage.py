from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class RestoranWastage(models.Model):
    _name = 'restoran.wastage'
    _description = 'Manajemen Stok Rusak/Expired'
    _order = 'date desc, id desc'

    name = fields.Char(string='Nomor Referensi', required=True, copy=False, readonly=True, default=lambda self: _('New'))
    date = fields.Datetime(string='Tanggal', required=True, default=fields.Datetime.now)
    cabang_id = fields.Many2one('restoran.cabang', string='Asal Cabang', required=True)
    responsible_id = fields.Many2one('res.users', string='Penanggung Jawab', default=lambda self: self.env.user)
    notes = fields.Text(string='Catatan/Alasan')
    state = fields.Selection([
        ('draft', 'Draft'),
        ('done', 'Selesai'),
    ], string='Status', default='draft', required=True)
    
    line_ids = fields.One2many('restoran.wastage.line', 'wastage_id', string='Detail Bahan Rusak')
    total_loss = fields.Float(string='Total Kerugian (Rp)', compute='_compute_total_loss', store=True)

    @api.depends('line_ids.subtotal')
    def _compute_total_loss(self):
        for rec in self:
            rec.total_loss = sum(rec.line_ids.mapped('subtotal'))

    @api.model
    def create(self, vals):
        if vals.get('name', _('New')) == _('New'):
            vals['name'] = self.env['ir.sequence'].next_by_code('restoran.wastage') or _('New')
        return super(RestoranWastage, self).create(vals)

    def action_done(self):
        for rec in self:
            for line in rec.line_ids:
                if line.bahan_id.stock_qty < line.qty:
                    raise ValidationError(_('Stok bahan %s tidak cukup!') % line.bahan_id.name)
                line.bahan_id.stock_qty -= line.qty
            rec.state = 'done'

class RestoranWastageLine(models.Model):
    _name = 'restoran.wastage.line'
    _description = 'Line Detail Bahan Rusak'

    wastage_id = fields.Many2one('restoran.wastage', string='Wastage', ondelete='cascade')
    bahan_id = fields.Many2one('restoran.bahan', string='Bahan Baku', required=True)
    qty = fields.Float(string='Jumlah Dibuang', required=True, default=1.0)
    uom = fields.Selection(related='bahan_id.uom', string='Satuan', readonly=True)
    cost_unit = fields.Float(related='bahan_id.price_per_unit', string='Harga Satuan', readonly=True)
    subtotal = fields.Float(string='Subtotal Kerugian', compute='_compute_subtotal', store=True)
    reason = fields.Selection([
        ('expired', 'Expired/Kadaluarsa'),
        ('damaged', 'Rusak/Busuk'),
        ('spilled', 'Tumpah/Bocor'),
        ('human_error', 'Kesalahan Masak'),
        ('other', 'Lainnya'),
    ], string='Alasan', default='damaged', required=True)

    @api.depends('qty', 'cost_unit')
    def _compute_subtotal(self):
        for line in self:
            line.subtotal = line.qty * line.cost_unit
