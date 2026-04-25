import json
import logging
import os
from odoo import http
from odoo.http import request, Response
from odoo.fields import Date
from datetime import datetime, timedelta
from odoo.exceptions import AccessDenied
from .api_base import RestoranBase

_logger = logging.getLogger(__name__)


class RestoranAPI_Order_5(RestoranBase):
    @http.route('/api/orders', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_orders(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            domain = []
            cabang_id = kwargs.get('cabang_id')
            state = kwargs.get('state')
            date_filter = kwargs.get('date_filter')
            limit = int(kwargs.get('limit', 15))
            offset = int(kwargs.get('offset', 0))

            if cabang_id:
                domain.append(('cabang_id', '=', int(cabang_id)))
            if state:
                if state == 'active':
                    domain.append(('state', 'in', ['draft', 'confirmed', 'preparing', 'ready']))
                else:
                    domain.append(('state', '=', state))

            today = Date.context_today(request.env.user)
            if date_filter == 'today':
                domain.append(('order_date', '>=', today))
                domain.append(('order_date', '<', today + timedelta(days=1)))
            elif date_filter == 'week':
                start_week = today - timedelta(days=today.weekday())
                domain.append(('order_date', '>=', start_week))
            elif date_filter == 'month':
                first_day = today.replace(day=1)
                domain.append(('order_date', '>=', first_day))
            elif date_filter and date_filter != 'all':
                # Assume YYYY-MM-DD format from frontend date picker
                try:
                    target_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                    domain.append(('order_date', '>=', target_date))
                    domain.append(('order_date', '<', target_date + timedelta(days=1)))
                except (ValueError, TypeError):
                    pass # Invalid date format, ignore filter

            total_count = request.env['restoran.order'].sudo().search_count(domain)
            orders = request.env['restoran.order'].sudo().search(domain, offset=offset, limit=limit, order='order_date desc')
            data = []
            for o in orders:
                data.append({
                    'id': o.id,
                    'name': o.name,
                    'cabang': {'id': o.cabang_id.id, 'name': o.cabang_id.name},
                    'order_date': o.order_date,
                    'order_type': o.order_type,
                    'table_number': o.table_number or '',
                    'customer_name': o.customer_name or '',
                    'state': o.state,
                    'total_items': o.total_items,
                    'subtotal': o.subtotal,
                    'tax_amount': o.tax_amount,
                    'total_amount': o.total_amount,
                    'payment_method': o.payment_method or '',
                    'cashier': o.cashier_id.name if o.cashier_id else '',
                    'lines': [{
                        'id': l.id,
                        'menu': {'id': l.menu_id.id, 'name': l.menu_id.name},
                        'qty': l.qty,
                        'price': l.price,
                        'subtotal': l.subtotal,
                        'note': l.note or '',
                    } for l in o.line_ids],
                })
            return self._json_response({'status': 'success', 'data': data, 'total': total_count})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/orders_create', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def create_order(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            
            if 'params' in data:
                data = data['params']
                
            if not data.get('cabang_id'):
                return self._json_response({'status': 'error', 'message': 'cabang_id wajib diisi'}, 400)
            if not data.get('lines') or len(data['lines']) == 0:
                return self._json_response({'status': 'error', 'message': 'Minimal 1 item order'}, 400)

            cabang_id = data['cabang_id']
            table_number = data.get('table_number', '')
            order_type = data.get('order_type', 'dine_in')
            payment_method = data.get('payment_method')
            lines_data = data['lines']

            customer_name = data.get('customer_name', '')
            
            # Check if there's an existing active order for this name
            existing_order = False
            if customer_name:
                existing_order = request.env['restoran.order'].sudo().search([
                    ('cabang_id', '=', cabang_id),
                    ('customer_name', '=ilike', customer_name),
                    ('state', 'in', ['draft', 'confirmed', 'preparing', 'ready'])
                ], limit=1)

            try:
                if existing_order and not payment_method:
                    # Append new items to the existing order
                    new_lines = [(0, 0, {
                        'menu_id': int(line['menu_id']),
                        'qty': line.get('qty', 1),
                        'note': line.get('note', ''),
                    }) for line in lines_data if str(line.get('menu_id', '')).isdigit()]
                    
                    existing_order.write({
                        'line_ids': new_lines,
                        'state': 'confirmed' # Send back to kitchen if it was ready
                    })
                    order = existing_order
                else:
                    # Create a brand new order
                    order_vals = {
                        'cabang_id': cabang_id,
                        'order_type': order_type,
                        'table_number': table_number,
                        'customer_name': customer_name,
                        'customer_phone': data.get('customer_phone', ''),
                        'payment_method': payment_method,
                        'note': data.get('note', ''),
                        'line_ids': [(0, 0, {
                            'menu_id': int(line['menu_id']),
                            'qty': line.get('qty', 1),
                            'note': line.get('note', ''),
                        }) for line in lines_data if str(line.get('menu_id', '')).isdigit()],
                    }
                    order = request.env['restoran.order'].sudo().create(order_vals)
                    
                    # Auto-confirm and Auto-complete if payment is done
                    if payment_method:
                        order.action_confirm()
                        order.action_done(payment_method)
                    else:
                        order.action_confirm()

                return self._json_response({'status': 'success', 'data': {
                    'id': order.id, 
                    'name': order.name, 
                    'total_amount': order.total_amount,
                    'table': order.table_number or '-'
                }})
            except Exception as e:
                _logger.error(f"FATAL ORDER ERROR: {str(e)}")
                # Raise to ensure transaction is rolled back correctly but we want to see it
                raise e

        except Exception as e:
            _logger.error(f"Create Order Failed: {str(e)}")
            return self._json_response({'status': 'error', 'message': f"Gagal Transaksi: {str(e)}"}, 500)

    @http.route(['/api/order_status/<int:order_id>/<string:action_name>'], type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def update_order_status(self, order_id, action_name, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            order = request.env['restoran.order'].sudo().browse(order_id)
            if not order.exists():
                return self._json_response({'status': 'error', 'message': 'Order tidak ditemukan'}, 404)

            if action_name == 'confirm':
                order.sudo().action_confirm()
            elif action_name == 'prepare':
                order.sudo().action_prepare()
            elif action_name == 'ready':
                order.sudo().action_ready()
            elif action_name == 'done':
                data_str = request.httprequest.data.decode('utf-8')
                data = json.loads(data_str) if data_str else {}
                pm = data.get('payment_method')
                order.sudo().action_done(payment_method=pm)
            elif action_name == 'cancel':
                order.sudo().action_cancel()
            else:
                return self._json_response({'status': 'error', 'message': 'Aksi tidak valid'}, 400)

            return self._json_response({'status': 'success', 'message': 'Status berhasil diupdate'})
        except Exception as e:
            _logger.error(f"Error updating order status: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

   
