import json
import logging
import os
from odoo import http
from odoo.http import request, Response
from odoo.fields import Date

_logger = logging.getLogger(__name__)


class RestoranFrontend(http.Controller):

    @http.route('/restoran/pos', type='http', auth='user', csrf=False)
    def pos_frontend(self, **kwargs):
        module_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        html_path = os.path.join(module_path, 'static', 'frontend', 'index.html')
        try:
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            return Response(html_content, content_type='text/html')
        except FileNotFoundError:
            return Response('<h1>Frontend belum di-setup</h1>', content_type='text/html', status=404)


class RestoranAPI(http.Controller):

    def _json_response(self, data, status=200):
        return Response(
            json.dumps(data, default=str),
            content_type='application/json',
            status=status,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        )

    def _cors_preflight(self):
        return Response(
            status=200,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        )

    @http.route('/api/cabang', type='http', auth='user', methods=['GET', 'OPTIONS'], csrf=False)
    def get_cabang_list(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_list = request.env['restoran.cabang'].search([])
            data = []
            for c in cabang_list:
                data.append({
                    'id': c.id,
                    'name': c.name,
                    'code': c.code,
                    'address': c.address or '',
                    'phone': c.phone or '',
                    'is_open': c.is_open,
                    'total_menu': c.total_menu,
                    'total_order_today': c.total_order_today,
                    'revenue_today': c.revenue_today,
                    'manager': c.manager_id.name if c.manager_id else '',
                })
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            _logger.error(f"Error getting cabang: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/cabang/<int:cabang_id>', type='http', auth='user', methods=['GET'], csrf=False)
    def get_cabang_detail(self, cabang_id, **kwargs):
        try:
            cabang = request.env['restoran.cabang'].browse(cabang_id)
            if not cabang.exists():
                return self._json_response({'status': 'error', 'message': 'Cabang tidak ditemukan'}, 404)
            data = {
                'id': cabang.id,
                'name': cabang.name,
                'code': cabang.code,
                'address': cabang.address or '',
                'phone': cabang.phone or '',
                'is_open': cabang.is_open,
                'total_menu': cabang.total_menu,
                'total_order_today': cabang.total_order_today,
                'revenue_today': cabang.revenue_today,
            }
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/kategori', type='http', auth='user', methods=['GET', 'OPTIONS'], csrf=False)
    def get_kategori_list(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            kategori_list = request.env['restoran.menu.kategori'].search([])
            data = [{
                'id': k.id,
                'name': k.name,
                'icon': k.icon or '',
                'menu_count': k.menu_count,
            } for k in kategori_list]
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/menu', type='http', auth='user', methods=['GET', 'OPTIONS'], csrf=False)
    def get_menu_list(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            domain = [('available', '=', True)]
            cabang_id = kwargs.get('cabang_id')
            kategori_id = kwargs.get('kategori_id')

            if cabang_id:
                domain += ['|', ('cabang_id', '=', int(cabang_id)), ('cabang_id', '=', False)]
            if kategori_id:
                domain.append(('kategori_id', '=', int(kategori_id)))

            menus = request.env['restoran.menu'].search(domain)
            data = []
            for m in menus:
                menu_data = {
                    'id': m.id,
                    'name': m.name,
                    'code': m.code or '',
                    'description': m.description or '',
                    'kategori': {
                        'id': m.kategori_id.id,
                        'name': m.kategori_id.name,
                        'icon': m.kategori_id.icon or '',
                    },
                    'price': m.price,
                    'available': m.available,
                    'is_spicy': m.is_spicy,
                    'is_bestseller': m.is_bestseller,
                    'tag': m.tag or '',
                    'preparation_time': m.preparation_time,
                    'cabang_id': m.cabang_id.id if m.cabang_id else None,
                    'image_url': f'/web/image/restoran.menu/{m.id}/image' if m.image else None,
                }
                data.append(menu_data)
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            _logger.error(f"Error getting menu: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/orders', type='http', auth='user', methods=['GET', 'OPTIONS'], csrf=False)
    def get_orders(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            domain = []
            cabang_id = kwargs.get('cabang_id')
            state = kwargs.get('state')
            limit = int(kwargs.get('limit', 50))

            if cabang_id:
                domain.append(('cabang_id', '=', int(cabang_id)))
            if state:
                domain.append(('state', '=', state))

            orders = request.env['restoran.order'].search(domain, limit=limit, order='order_date desc')
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
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            _logger.error(f"Error getting orders: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/orders_create', type='http', auth='user', methods=['POST', 'OPTIONS'], csrf=False)
    def create_order(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            
            if 'params' in data:
                data = data['params']
                
            if not data.get('cabang_id'):
                return self._json_response({'status': 'error', 'message': 'cabang_id wajib diisi'})
            if not data.get('lines') or len(data['lines']) == 0:
                return self._json_response({'status': 'error', 'message': 'Minimal 1 item order'})

            order_vals = {
                'cabang_id': data['cabang_id'],
                'order_type': data.get('order_type', 'dine_in'),
                'table_number': data.get('table_number', ''),
                'customer_name': data.get('customer_name', ''),
                'customer_phone': data.get('customer_phone', ''),
                'payment_method': data.get('payment_method', 'cash'),
                'note': data.get('note', ''),
                'line_ids': [(0, 0, {
                    'menu_id': line['menu_id'],
                    'qty': line.get('qty', 1),
                    'note': line.get('note', ''),
                }) for line in data['lines']],
            }

            order = request.env['restoran.order'].create(order_vals)

            return self._json_response({
                'status': 'success',
                'message': 'Order berhasil dibuat',
                'data': {
                    'id': order.id,
                    'name': order.name,
                    'total_amount': order.total_amount,
                    'state': order.state,
                }
            })
        except Exception as e:
            _logger.error(f"Error creating order: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route(['/api/orders/<int:order_id>/<string:action_name>'], type='http', auth='user', methods=['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'], csrf=False)
    def update_order_status(self, order_id, action_name, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            order = request.env['restoran.order'].sudo().browse(order_id)
            if not order.exists():
                return self._json_response({'status': 'error', 'message': 'Order tidak ditemukan'}, 404)
            
            if action_name == 'confirm':
                order.action_confirm()
            elif action_name == 'prepare':
                order.action_prepare()
            elif action_name == 'ready':
                order.action_ready()
            elif action_name == 'done':
                order.action_done()
            elif action_name == 'cancel':
                order.action_cancel()
            else:
                return self._json_response({'status': 'error', 'message': 'Aksi tidak valid'}, 400)
            
            request.env.cr.commit()
            return self._json_response({'status': 'success', 'message': 'Status berhasil diupdate'})
        except Exception as e:
            _logger.error(f"Error updating order status: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/dashboard', type='http', auth='user', methods=['GET', 'OPTIONS'], csrf=False)
    def get_dashboard(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_id = kwargs.get('cabang_id')
            cabang_list = request.env['restoran.cabang'].search([])

            dashboard = {
                'total_cabang': len(cabang_list),
                'cabang_buka': len(cabang_list.filtered(lambda c: c.is_open)),
                'cabang_tutup': len(cabang_list.filtered(lambda c: not c.is_open)),
                'cabang_stats': [],
            }

            for c in cabang_list:
                dashboard['cabang_stats'].append({
                    'id': c.id,
                    'name': c.name,
                    'code': c.code,
                    'is_open': c.is_open,
                    'total_menu': c.total_menu,
                    'total_order_today': c.total_order_today,
                    'revenue_today': c.revenue_today,
                })

            today = Date.today()
            all_orders_today = request.env['restoran.order'].search([
                ('state', '=', 'done'),
            ]).filtered(lambda o: o.order_date and o.order_date.date() == today)

            dashboard['global'] = {
                'total_orders_today': len(all_orders_today),
                'total_revenue_today': sum(all_orders_today.mapped('total_amount')),
                'total_menu_available': request.env['restoran.menu'].search_count([
                    ('available', '=', True)
                ]),
            }

            return self._json_response({'status': 'success', 'data': dashboard})
        except Exception as e:
            _logger.error(f"Error getting dashboard: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)