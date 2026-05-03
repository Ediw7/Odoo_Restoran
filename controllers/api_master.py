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


class RestoranAPI_Master_3(RestoranBase):
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
                    'manager_pin': c.manager_pin or '1234',
                })
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/cabang/update_pin', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def update_cabang_pin(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            cabang_id = data.get('cabang_id')
            new_pin = data.get('new_pin')
            if not cabang_id or not new_pin or len(str(new_pin)) != 4:
                return self._json_response({'status': 'error', 'message': 'ID Cabang dan PIN 4 digit wajib diisi'}, 400)
            cabang = request.env['restoran.cabang'].sudo().browse(int(cabang_id))
            if not cabang.exists():
                return self._json_response({'status': 'error', 'message': 'Cabang tidak ditemukan'}, 404)
            if not new_pin.isdigit():
                return self._json_response({'status': 'error', 'message': 'PIN harus terdiri dari 4 angka'}, 400)
            cabang.write({'manager_pin': str(new_pin)})
            return self._json_response({'status': 'success', 'message': 'PIN Manajer berhasil diperbarui'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/cabang_delete', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def delete_cabang(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']
            cabang_id = data.get('cabang_id')
            if not cabang_id:
                return self._json_response({'status': 'error', 'message': 'ID Cabang wajib diisi'}, 400)
            cabang = request.env['restoran.cabang'].sudo().browse(int(cabang_id))
            if not cabang.exists():
                return self._json_response({'status': 'error', 'message': 'Cabang tidak ditemukan'}, 404)
            cabang.unlink()
            return self._json_response({'status': 'success', 'message': 'Cabang berhasil dihapus'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/cabang_create', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def create_cabang(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']
            name = data.get('name')
            if not name:
                return self._json_response({'status': 'error', 'message': 'Nama cabang wajib diisi'}, 400)
            
            # Generate code based on name (uppercase first 3 letters + random or count)
            clean_name = ''.join(e for e in name if e.isalnum()).upper()
            code = clean_name[:3]
            existing_count = request.env['restoran.cabang'].sudo().search_count([('code', 'ilike', code)])
            if existing_count > 0:
                code = f"{code}{existing_count + 1}"
            
            cabang = request.env['restoran.cabang'].sudo().create({
                'name': name,
                'code': code
            })
            return self._json_response({'status': 'success', 'message': 'Cabang berhasil dibuat', 'data': {'id': cabang.id, 'name': cabang.name, 'code': cabang.code}})
        except Exception as e:
            _logger.error(f"Create Cabang Error: {e}")
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
            cabang_id = kwargs.get('cabang_id')
            domain = [('cabang_id', '=', int(cabang_id))] if cabang_id else []
            bahan_list = request.env['restoran.bahan'].sudo().search(domain)
            data = [{
                'id': b.id,
                'name': b.name,
                'code': b.code or '',
                'uom': b.uom or '',
                'stock_qty': b.stock_qty,
                'min_stock': b.min_stock,
                'stock_status': b.stock_status,
                'price_per_unit': b.price_per_unit,
                'cabang_id': b.cabang_id.id if b.cabang_id else False,
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
            
            vals = {
                'name': data.get('name'),
                'uom': data.get('uom'),
                'stock_qty': float(data.get('stock_qty', 0)),
                'min_stock': float(data.get('min_stock', 5)),
                'price_per_unit': float(data.get('price_per_unit', 0)),
            }
            if data.get('cabang_id'):
                vals['cabang_id'] = int(data.get('cabang_id'))
            bahan = request.env['restoran.bahan'].sudo().create(vals)
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
                domain.append(('cabang_id', '=', int(cabang_id)))
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
            
            vals = {
                'name': data.get('name'),
                'kategori_id': int(data.get('kategori_id')),
                'price': float(data.get('price')),
                'use_stock': data.get('use_stock', True),
                'stock_qty': float(data.get('stock_qty', 0)),
                'available': True,
            }
            if data.get('cabang_id'):
                vals['cabang_id'] = int(data.get('cabang_id'))
            menu = request.env['restoran.menu'].sudo().create(vals)
            return self._json_response({'status': 'success', 'message': 'Menu berhasil ditambahkan', 'data': {'id': menu.id}})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    
