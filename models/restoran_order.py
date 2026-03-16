from odoo import models, fields, api
from odoo.exceptions import ValidationError


class RestoranOrder(models.Model):
    _name = 'restoran.order'
    _description = 'Order Restoran'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'order_date desc, id desc'

    name = fields.Char(
        string='No. Order', required=True, readonly=True,
        default='New', copy=False
    )
    cabang_id = fields.Many2one(
        'restoran.cabang', string='Cabang',
        required=True, tracking=True
    )
    order_date = fields.Datetime(
        string='Tanggal Order',
        default=fields.Datetime.now, required=True
    )
    table_number = fields.Char(string='No. Meja')
    customer_name = fields.Char(string='Nama Pelanggan')
    customer_phone = fields.Char(string='Telepon Pelanggan')

    order_type = fields.Selection([
        ('dine_in', 'Dine In'),
        ('take_away', 'Take Away'),
        ('delivery', 'Delivery'),
    ], string='Tipe Order', default='dine_in', required=True)

    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Dikonfirmasi'),
        ('preparing', 'Sedang Disiapkan'),
        ('ready', 'Siap'),
        ('done', 'Selesai'),
        ('cancelled', 'Dibatalkan'),
    ], string='Status', default='draft', tracking=True)

    line_ids = fields.One2many('restoran.order.line', 'order_id', string='Item Order')
    note = fields.Text(string='Catatan')

    # Payment
    payment_method = fields.Selection([
        ('cash', 'Tunai'),
        ('card', 'Kartu Debit/Kredit'),
        ('qris', 'QRIS'),
        ('transfer', 'Transfer Bank'),
    ], string='Metode Pembayaran', default='cash')

    # computed
    subtotal = fields.Float(compute='_compute_amounts', store=True, string='Subtotal')
    tax_amount = fields.Float(compute='_compute_amounts', store=True, string='Pajak (10%)')
    total_amount = fields.Float(compute='_compute_amounts', store=True, string='Total')
    total_items = fields.Integer(compute='_compute_amounts', store=True, string='Total Item')

    cashier_id = fields.Many2one('res.users', string='Kasir',
                                  default=lambda self: self.env.user)
    company_id = fields.Many2one(
        'res.company', string='Company',
        default=lambda self: self.env.company
    )

    @api.model
    def create(self, vals):
        if vals.get('name', 'New') == 'New':
            cabang = self.env['restoran.cabang'].browse(vals.get('cabang_id'))
            prefix = cabang.code if cabang else 'ORD'
            vals['name'] = self.env['ir.sequence'].next_by_code('restoran.order') or 'New'
            vals['name'] = f"{prefix}-{vals['name']}"
        return super().create(vals)

    @api.depends('line_ids.subtotal')
    def _compute_amounts(self):
        for order in self:
            subtotal = sum(order.line_ids.mapped('subtotal'))
            order.subtotal = subtotal
            order.tax_amount = subtotal * 0.10
            order.total_amount = subtotal + order.tax_amount
            order.total_items = sum(order.line_ids.mapped('qty'))

    def action_confirm(self):
        self.write({'state': 'confirmed'})

    def action_prepare(self):
        self.write({'state': 'preparing'})

    def action_ready(self):
        self.write({'state': 'ready'})

    def action_done(self):
        self.write({'state': 'done'})

    def action_cancel(self):
        for order in self:
            if order.state == 'done':
                raise ValidationError('Order yang sudah selesai tidak bisa dibatalkan!')
        self.write({'state': 'cancelled'})

    def action_reset_draft(self):
        self.write({'state': 'draft'})


class RestoranOrderLine(models.Model):
    _name = 'restoran.order.line'
    _description = 'Item Order'
    _order = 'sequence, id'

    order_id = fields.Many2one(
        'restoran.order', string='Order',
        required=True, ondelete='cascade'
    )
    menu_id = fields.Many2one(
        'restoran.menu', string='Menu',
        required=True, ondelete='restrict'
    )
    qty = fields.Integer(string='Jumlah', default=1, required=True)
    price = fields.Float(string='Harga Satuan', related='menu_id.price', store=True)
    subtotal = fields.Float(compute='_compute_subtotal', store=True, string='Subtotal')
    note = fields.Char(string='Catatan')
    sequence = fields.Integer(default=10)

    @api.depends('qty', 'price')
    def _compute_subtotal(self):
        for line in self:
            line.subtotal = line.qty * line.price







class ResUsers(models.Model):
    _inherit = 'res.users'
    
    cabang_id = fields.Many2one('restoran.cabang', string='Cabang Restoran (Untuk Kasir)')
    
    restoran_role = fields.Selection([
        ('admin', 'Administrator (Bos)'),
        ('cashier', 'Kasir Cabang')
    ], string='Role Restoran', default='cashier')