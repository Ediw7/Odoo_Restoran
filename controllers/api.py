import json
import logging
import os
from odoo import http
from odoo.http import request, Response
from odoo.fields import Date
from odoo.exceptions import AccessDenied  

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

    # ==========================================
    # API LOGIN
    # ==========================================
    @http.route('/api/login', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def api_login(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            
            username = data.get('username')
            password = data.get('password')
            db = request.env.cr.dbname
            
            uid = request.session.authenticate(db, username, password)
            if not uid:
                return self._json_response({'status': 'error', 'message': 'Username atau Password salah'}, 401)
            
            user = request.env['res.users'].sudo().browse(uid)
            return self._json_response({
                'status': 'success',
                'data': {
                    'name': user.name,
                    'role': user.restoran_role,
                    'cabang_id': user.cabang_id.id if user.cabang_id else None,
                    'cabang_name': user.cabang_id.name if user.cabang_id else 'Semua Cabang'
                }
            })
            
        except AccessDenied:
            return self._json_response({'status': 'error', 'message': 'Username atau Password salah!'}, 401)
            
        except Exception as e:
            _logger.error(f"Login Error: {e}")
            return self._json_response({'status': 'error', 'message': f'Server Error: {str(e)}'}, 500)

    # ==========================================
    # API CABANG & MENU
    # ==========================================
    @http.route('/api/cabang', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_cabang_list(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_list = request.env['restoran.cabang'].sudo().search([])
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
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/cabang/<int:cabang_id>', type='http', auth='public', methods=['GET'], csrf=False)
    def get_cabang_detail(self, cabang_id, **kwargs):
        try:
            cabang = request.env['restoran.cabang'].sudo().browse(cabang_id)
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

    
    @http.route('/api/cabang_action', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def cabang_action(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            action = data.get('action')
            
            Cabang = request.env['restoran.cabang'].sudo()
            
            if action == 'create':
                Cabang.create({
                    'name': data.get('name'),
                    'code': data.get('code'),
                    'address': data.get('address', ''),
                    'phone': data.get('phone', ''),
                    'is_open': True
                })
            elif action == 'update':
                cabang = Cabang.browse(data.get('id'))
                if cabang.exists():
                    cabang.write({
                        'name': data.get('name'),
                        'code': data.get('code'),
                        'address': data.get('address', ''),
                        'phone': data.get('phone', ''),
                    })
            elif action == 'toggle':
                cabang = Cabang.browse(data.get('id'))
                if cabang.exists():
                    cabang.is_open = not cabang.is_open
                    
            return self._json_response({'status': 'success', 'message': 'Berhasil memproses cabang'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/kategori', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_kategori_list(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            kategori_list = request.env['restoran.menu.kategori'].sudo().search([])
            data = [{
                'id': k.id,
                'name': k.name,
                'icon': k.icon or '',
                'menu_count': k.menu_count,
            } for k in kategori_list]
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/menu', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
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

            menus = request.env['restoran.menu'].sudo().search(domain)
            data = []
            for m in menus:
                data.append({
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
                })
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    # ==========================================
    # API ORDERS
    # ==========================================
    @http.route('/api/orders', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
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

            orders = request.env['restoran.order'].sudo().search(domain, limit=limit, order='order_date desc')
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

            order = request.env['restoran.order'].sudo().create(order_vals)

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
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route(['/api/orders/<int:order_id>/<string:action_name>'], type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
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
                order.sudo().action_done()
            elif action_name == 'cancel':
                order.sudo().action_cancel()
            else:
                return self._json_response({'status': 'error', 'message': 'Aksi tidak valid'}, 400)
            
            return self._json_response({'status': 'success', 'message': 'Status berhasil diupdate'})
        except Exception as e:
            _logger.error(f"Error updating order status: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

   # ==========================================
    # API DASHBOARD
    # ==========================================
    @http.route('/api/dashboard', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_dashboard(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_id = kwargs.get('cabang_id')
            period = kwargs.get('period', 'today') # Ambil filter waktu, default: hari ini
            
            domain = [('id', '=', int(cabang_id))] if cabang_id else []
            cabang_list = request.env['restoran.cabang'].sudo().search(domain)

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
                    'is_open': c.is_open,
                })

            # Filter waktu untuk pesanan
            order_domain = [('state', '=', 'done')]
            if cabang_id:
                order_domain.append(('cabang_id', '=', int(cabang_id)))
                
            today = Date.today()
            if period == 'today':
                order_domain += [('order_date', '>=', today.strftime('%Y-%m-%d 00:00:00')), 
                                 ('order_date', '<=', today.strftime('%Y-%m-%d 23:59:59'))]
            elif period == 'month':
                first_day_of_month = today.replace(day=1)
                order_domain += [('order_date', '>=', first_day_of_month.strftime('%Y-%m-%d 00:00:00'))]
            elif period == 'year':
                first_day_of_year = today.replace(month=1, day=1)
                order_domain += [('order_date', '>=', first_day_of_year.strftime('%Y-%m-%d 00:00:00'))]

            all_orders = request.env['restoran.order'].sudo().search(order_domain)

            dashboard['global'] = {
                'total_orders': len(all_orders),
                'total_revenue': sum(all_orders.mapped('total_amount')),
                'total_menu_available': request.env['restoran.menu'].sudo().search_count([
                    ('available', '=', True)
                ] + ([('cabang_id', 'in', [False, int(cabang_id)])] if cabang_id else [])),
            }

            return self._json_response({'status': 'success', 'data': dashboard})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)