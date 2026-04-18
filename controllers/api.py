import json
import logging
import os
from odoo import http
from odoo.http import request, Response
from odoo.fields import Date
from datetime import datetime, timedelta
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

    @http.route('/api/update_stock', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def update_stock(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            menu_id = data.get('menu_id')
            qty = data.get('qty', 0)
            if not menu_id or qty <= 0:
                return self._json_response({'status': 'error', 'message': 'menu_id dan qty wajib diisi'}, 400)
            menu = request.env['restoran.menu'].sudo().browse(int(menu_id))
            if not menu.exists():
                return self._json_response({'status': 'error', 'message': 'Menu tidak ditemukan'}, 404)
            menu.sudo().action_add_stock(qty)
            return self._json_response({'status': 'success', 'data': {'id': menu.id, 'name': menu.name, 'stock_qty': menu.stock_qty}})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/bahan_baku', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_bahan_baku(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            bahan_list = request.env['restoran.bahan'].sudo().search([])
            data = [{
                'id': b.id,
                'name': b.name,
                'code': b.code or '',
                'uom': b.uom or '',
                'stock_qty': b.stock_qty,
                'min_stock': b.min_stock,
                'stock_status': b.stock_status,
                'price_per_unit': b.price_per_unit,
            } for b in bahan_list]
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/update_bahan_baku', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def update_bahan_baku(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            bahan_id = data.get('bahan_id')
            qty = data.get('qty', 0)
            if not bahan_id or qty <= 0:
                return self._json_response({'status': 'error', 'message': 'bahan_id dan qty wajib diisi'}, 400)
            bahan = request.env['restoran.bahan'].sudo().browse(int(bahan_id))
            if not bahan.exists():
                return self._json_response({'status': 'error', 'message': 'Bahan Baku tidak ditemukan'}, 404)
            # update stock
            bahan.sudo().write({'stock_qty': bahan.stock_qty + float(qty)})
            return self._json_response({'status': 'success', 'data': {'id': bahan.id, 'name': bahan.name, 'stock_qty': bahan.stock_qty}})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/bahan_baku_create', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def bahan_baku_create(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if not data.get('name') or not data.get('uom'):
                return self._json_response({'status': 'error', 'message': 'Nama dan Satuan wajib diisi'}, 400)
            
            bahan = request.env['restoran.bahan'].sudo().create({
                'name': data.get('name'),
                'uom': data.get('uom'),
                'stock_qty': float(data.get('stock_qty', 0)),
                'min_stock': float(data.get('min_stock', 5)),
                'price_per_unit': float(data.get('price_per_unit', 0)),
            })
            return self._json_response({'status': 'success', 'message': 'Bahan Baku berhasil ditambahkan', 'data': {'id': bahan.id}})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/menu', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_menu_list(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            domain = []
            cabang_id = kwargs.get('cabang_id')
            kategori_id = kwargs.get('kategori_id')

            if cabang_id:
                domain += ['|', ('cabang_id', '=', int(cabang_id)), ('cabang_id', '=', False)]
            if kategori_id:
                domain.append(('kategori_id', '=', int(kategori_id)))

            menus = request.env['restoran.menu'].sudo().search(domain)
            data = []
            for m in menus:
                bom_lines = []
                for bl in m.bom_line_ids:
                    bom_lines.append({
                        'bahan_name': bl.bahan_id.name,
                        'qty': bl.qty,
                        'uom': bl.bahan_id.uom,
                    })
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
                    'use_stock': m.use_stock,
                    'stock_qty': m.stock_qty,
                    'stock_status': m.stock_status,
                    'is_spicy': m.is_spicy,
                    'is_bestseller': m.is_bestseller,
                    'tag': m.tag or '',
                    'preparation_time': m.preparation_time,
                    'cabang_id': m.cabang_id.id if m.cabang_id else None,
                    'image_url': f'/web/image/restoran.menu/{m.id}/image' if m.image else None,
                    'bom_line_ids': bom_lines,
                })
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/menu_create', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def menu_create(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if not data.get('name') or not data.get('kategori_id') or not data.get('price'):
                return self._json_response({'status': 'error', 'message': 'Nama, Kategori, dan Harga wajib diisi'}, 400)
            
            menu = request.env['restoran.menu'].sudo().create({
                'name': data.get('name'),
                'kategori_id': int(data.get('kategori_id')),
                'price': float(data.get('price')),
                'use_stock': data.get('use_stock', True),
                'stock_qty': float(data.get('stock_qty', 0)),
                'available': True,
            })
            return self._json_response({'status': 'success', 'message': 'Menu berhasil ditambahkan', 'data': {'id': menu.id}})
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
            date_filter = kwargs.get('date_filter')
            limit = int(kwargs.get('limit', 15))
            offset = int(kwargs.get('offset', 0))

            if cabang_id:
                domain.append(('cabang_id', '=', int(cabang_id)))
            if state:
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

            # Create brand new order (Simplified: record at the end of meal)
            order_vals = {
                'cabang_id': cabang_id,
                'order_type': order_type,
                'table_number': table_number,
                'customer_name': data.get('customer_name', ''),
                'customer_phone': data.get('customer_phone', ''),
                'payment_method': payment_method,
                'note': data.get('note', ''),
                'line_ids': [(0, 0, {
                    'menu_id': line['menu_id'],
                    'qty': line.get('qty', 1),
                    'note': line.get('note', ''),
                }) for line in lines_data],
            }
            order = request.env['restoran.order'].sudo().create(order_vals)
            
            # Auto-confirm and Auto-complete if payment is done
            if payment_method:
                order.action_confirm()
                order.action_done(payment_method)
            else:
                # Still confirm to deduct stock
                order.action_confirm()

            return self._json_response({'status': 'success', 'data': {
                'id': order.id, 
                'name': order.name, 
                'total_amount': order.total_amount,
                'table': table_number or '-'
            }})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

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
            elif period == 'week':
                # Start of current week (Monday)
                start_week = today - timedelta(days=today.weekday())
                order_domain += [('order_date', '>=', start_week.strftime('%Y-%m-%d 00:00:00'))]
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

    # ==========================================
    # API CHART DATA (Revenue + Analytics)
    # ==========================================
    @http.route('/api/dashboard/chart', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_dashboard_chart(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_id = kwargs.get('cabang_id')
            days = int(kwargs.get('days', 7))

            from datetime import timedelta
            from collections import Counter
            today = Date.today()
            start_date = today - timedelta(days=days - 1)

            order_domain = [
                ('state', '=', 'done'),
                ('order_date', '>=', start_date.strftime('%Y-%m-%d 00:00:00')),
                ('order_date', '<=', today.strftime('%Y-%m-%d 23:59:59')),
            ]
            if cabang_id:
                order_domain.append(('cabang_id', '=', int(cabang_id)))

            all_orders = request.env['restoran.order'].sudo().search(order_domain)

            # ---- 1. Daily Revenue ----
            daily_data = {}
            for i in range(days):
                d = start_date + timedelta(days=i)
                day_key = d.strftime('%Y-%m-%d')
                day_label = d.strftime('%d %b')
                daily_data[day_key] = {
                    'date': day_key,
                    'label': day_label,
                    'revenue': 0,
                    'orders': 0,
                }

            for order in all_orders:
                if order.order_date:
                    day_key = order.order_date.date().strftime('%Y-%m-%d')
                    if day_key in daily_data:
                        daily_data[day_key]['revenue'] += order.total_amount
                        daily_data[day_key]['orders'] += 1

            chart_data = list(daily_data.values())

            # ---- 2. Top Menu (Terlaris) ----
            menu_counter = Counter()
            menu_revenue = Counter()
            for order in all_orders:
                for line in order.line_ids:
                    menu_counter[line.menu_id.id] += line.qty
                    menu_revenue[line.menu_id.id] += line.subtotal

            top_menu_ids = [mid for mid, _ in menu_counter.most_common(5)]
            top_menu = []
            for mid in top_menu_ids:
                menu = request.env['restoran.menu'].sudo().browse(mid)
                if menu.exists():
                    top_menu.append({
                        'id': menu.id,
                        'name': menu.name,
                        'qty_sold': menu_counter[mid],
                        'revenue': menu_revenue[mid],
                        'kategori': menu.kategori_id.name if menu.kategori_id else '',
                    })

            # ---- 3. Payment Breakdown ----
            payment_counter = Counter()
            payment_revenue = Counter()
            for order in all_orders:
                method = order.payment_method or 'cash'
                payment_counter[method] += 1
                payment_revenue[method] += order.total_amount

            payment_labels = {
                'cash': 'Tunai', 'card': 'Kartu', 'qris': 'QRIS', 'transfer': 'Transfer'
            }
            payment_breakdown = []
            total_orders_count = len(all_orders)
            for method, count in payment_counter.most_common():
                payment_breakdown.append({
                    'method': method,
                    'label': payment_labels.get(method, method),
                    'count': count,
                    'revenue': payment_revenue[method],
                    'percentage': round((count / total_orders_count * 100), 1) if total_orders_count > 0 else 0,
                })

            # ---- 4. Summary ----
            total_rev = sum(o.total_amount for o in all_orders)
            avg_order = total_rev / len(all_orders) if all_orders else 0

            return self._json_response({'status': 'success', 'data': {
                'chart': chart_data,
                'top_menu': top_menu,
                'payment_breakdown': payment_breakdown,
                'summary': {
                    'total_revenue': total_rev,
                    'total_orders': len(all_orders),
                    'avg_order_value': avg_order,
                }
            }})
        except Exception as e:
            _logger.error(f"Error getting chart data: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    # ==========================================
    # API REPORT FINANCE & COGS
    # ==========================================
    @http.route('/api/report_finance', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_report_finance(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_id = kwargs.get('cabang_id')
            filter_mode = kwargs.get('filter_mode', 'day') # day, month, year
            filter_value = kwargs.get('filter_value') # YYYY-MM-DD, YYYY-MM, or YYYY

            from datetime import timedelta, datetime
            import calendar
            today = Date.today()
            
            start_date = today
            end_date = today

            if filter_value:
                try:
                    if filter_mode == 'day':
                        dt = datetime.strptime(filter_value, '%Y-%m-%d').date()
                        start_date = end_date = dt
                    elif filter_mode == 'week':
                        dt = datetime.strptime(filter_value, '%Y-%m-%d').date()
                        start_date = dt - timedelta(days=dt.weekday())
                        end_date = start_date + timedelta(days=6)
                    elif filter_mode == 'month':
                        dt = datetime.strptime(filter_value, '%Y-%m').date()
                        start_date = dt.replace(day=1)
                        last_day = calendar.monthrange(dt.year, dt.month)[1]
                        end_date = dt.replace(day=last_day)
                    elif filter_mode == 'year':
                        year = int(filter_value)
                        start_date = Date.to_date(f'{year}-01-01')
                        end_date = Date.to_date(f'{year}-12-31')
                except:
                    pass

            order_domain = [
                ('state', '=', 'done'),
                ('order_date', '>=', start_date.strftime('%Y-%m-%d 00:00:00')),
                ('order_date', '<=', end_date.strftime('%Y-%m-%d 23:59:59')),
            ]
            if cabang_id:
                order_domain.append(('cabang_id', '=', int(cabang_id)))

            orders = request.env['restoran.order'].sudo().search(order_domain)

            # Compute Revenue and Dynamic COGS (HPP)
            total_revenue = 0.0
            total_cogs = 0.0
            top_profit_menus = {}
            top_tables = {}

            # Cache the BOM cost to speed up
            menu_cost_cache = {}

            # Group data for charts (By Date/Month)
            chart_dict = {}

            for order in orders:
                total_revenue += order.total_amount
                
                # Top Tables aggregation
                tbl = order.table_number or '-'
                if tbl not in top_tables:
                    top_tables[tbl] = {'table': tbl, 'count': 0, 'total': 0.0}
                top_tables[tbl]['count'] += 1
                top_tables[tbl]['total'] += order.total_amount

                # Determine chart label
                order_date = order.order_date
                if filter_mode == 'day':
                    lbl = order_date.strftime('%H:') + '00' # hourly
                elif filter_mode in ['week', 'month']:
                    lbl = order_date.strftime('%d %b') # daily
                else:
                    lbl = order_date.strftime('%b %Y') # monthly
                    
                if lbl not in chart_dict:
                    chart_dict[lbl] = {'label': lbl, 'revenue': 0, 'profit': 0}
                    
                chart_dict[lbl]['revenue'] += order.total_amount

                # Calculate COGS line by line
                order_total_cogs = 0.0
                for line in order.line_ids:
                    menu = line.menu_id
                    qty_sold = line.qty

                    # Calculate HPP for this menu
                    if menu.id not in menu_cost_cache:
                        hpp = 0.0
                        for bom in menu.bom_line_ids:
                            hpp += bom.qty * bom.bahan_id.price_per_unit
                        menu_cost_cache[menu.id] = hpp
                    
                    line_cogs = menu_cost_cache[menu.id] * qty_sold
                    order_total_cogs += line_cogs
                    line_profit = line.subtotal - line_cogs

                    if menu.id not in top_profit_menus:
                        top_profit_menus[menu.id] = {
                            'id': menu.id,
                            'name': menu.name,
                            'kategori': menu.kategori_id.name if menu.kategori_id else '-',
                            'qty_sold': 0,
                            'revenue': 0.0,
                            'cogs': 0.0,
                            'profit': 0.0,
                        }
                    
                    top_profit_menus[menu.id]['qty_sold'] += qty_sold
                    top_profit_menus[menu.id]['revenue'] += line.subtotal
                    top_profit_menus[menu.id]['cogs'] += line_cogs
                    top_profit_menus[menu.id]['profit'] += line_profit

                total_cogs += order_total_cogs
                chart_dict[lbl]['profit'] += (order.total_amount - order_total_cogs)

            # Sort top menus by profit
            sorted_menus = sorted(top_profit_menus.values(), key=lambda x: x['profit'], reverse=True)
            
            # Sort top tables by total revenue
            sorted_tables = sorted(top_tables.values(), key=lambda x: x['total'], reverse=True)
            
            # Sort chart data chronologically
            chart_data = sorted(chart_dict.values(), key=lambda x: x['label'])

            return self._json_response({'status': 'success', 'data': {
                'filter_label': f"Periode: {start_date.strftime('%d %b %Y')} s/d {end_date.strftime('%d %b %Y')}",
                'total_revenue': total_revenue,
                'total_cogs': total_cogs,
                'gross_profit': total_revenue - total_cogs,
                'gross_margin_pct': round(((total_revenue - total_cogs) / total_revenue) * 100, 1) if total_revenue > 0 else 0,
                'total_orders': len(orders),
                'top_profit_menus': sorted_menus[:10],
                'top_tables': sorted_tables[:10],
                'chart_data': chart_data
            }})
        except Exception as e:
            _logger.error(f"Error finance report: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    # ==========================================
    # API WASTAGE (Stok Rusak/Expired)
    # ==========================================
    @http.route('/api/wastage', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_wastage(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_id = kwargs.get('cabang_id')
            limit = int(kwargs.get('limit', 20))
            offset = int(kwargs.get('offset', 0))
            
            domain = []
            if cabang_id:
                domain.append(('cabang_id', '=', int(cabang_id)))
            
            wastages = request.env['restoran.wastage'].sudo().search(domain, limit=limit, offset=offset)
            data = []
            for w in wastages:
                data.append({
                    'id': w.id,
                    'name': w.name,
                    'date': w.date.strftime('%Y-%m-%d %H:%M:%S') if w.date else None,
                    'cabang': w.cabang_id.name,
                    'responsible': w.responsible_id.name,
                    'notes': w.notes or '',
                    'state': w.state,
                    'total_loss': w.total_loss,
                    'lines': [{
                        'id': l.id,
                        'bahan_name': l.bahan_id.name,
                        'qty': l.qty,
                        'uom': l.uom,
                        'subtotal': l.subtotal,
                        'reason': l.reason,
                    } for l in w.line_ids]
                })
            
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/wastage_create', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def create_wastage(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']

            cabang_id = data.get('cabang_id')
            lines = data.get('lines', [])
            notes = data.get('notes', '')
            
            if not cabang_id:
                return self._json_response({'status': 'error', 'message': 'Cabang ID harus diisi!'}, 400)
            
            wastage = request.env['restoran.wastage'].sudo().create({
                'cabang_id': int(cabang_id),
                'notes': notes,
                'state': 'draft',
                'line_ids': [(0, 0, {
                    'bahan_id': int(l['bahan_id']),
                    'qty': float(l['qty']),
                    'reason': l.get('reason', 'damaged'),
                }) for l in lines]
            })
            
            return self._json_response({'status': 'success', 'data': {'id': wastage.id, 'name': wastage.name}})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/wastage_confirm', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def confirm_wastage(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']

            wastage_id = data.get('wastage_id')
            wastage = request.env['restoran.wastage'].sudo().browse(int(wastage_id))
            if not wastage.exists():
                return self._json_response({'status': 'error', 'message': 'Data wastage tidak ditemukan!'}, 404)
            
            wastage.action_done()
            return self._json_response({'status': 'success', 'message': f'Stok dari {wastage.name} berhasil dipotong.'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)