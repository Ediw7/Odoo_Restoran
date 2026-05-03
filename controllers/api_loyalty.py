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


class RestoranAPI_Loyalty_15(RestoranBase):
    @http.route('/api/customer_check', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def check_customer(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            name = kwargs.get('name')
            if not name:
                return self._json_response({'status': 'error', 'message': 'Name must be provided'}, 400)
            
            cust = request.env['restoran.customer'].sudo().search([('name', 'ilike', name)], limit=1)
            if not cust:
                return self._json_response({'status': 'not_found', 'message': 'Pelanggan belum terdaftar'})
            
            return self._json_response({
                'status': 'success',
                'data': {
                    'id': cust.id,
                    'name': cust.name,
                    'phone': cust.phone,
                    'visit_count': cust.visit_count,
                    'loyalty_points': cust.loyalty_points,
                    'is_eligible_reward': cust.visit_count >= 10,
                    'reward_message': "Selamat! Pelanggan berhak mendapat Gratis Es Teh / Kopi!" if cust.visit_count >= 10 else f"{10 - cust.visit_count} kunjungan lagi untuk Gratis Minuman.",
                    'special_reward': cust.special_reward or ''
                }
            })
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/top_customers', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_top_customers(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            cabang_id = kwargs.get('cabang_id')
            limit_val = int(kwargs.get('limit', 20))
            
            if cabang_id:
                # Filter: only customers who have orders at this branch
                orders = request.env['restoran.order'].sudo().search([
                    ('cabang_id', '=', int(cabang_id)),
                    ('state', '=', 'done'),
                    ('customer_name', '!=', False),
                    ('customer_name', '!=', ''),
                ])
                # Get unique customer names from orders at this branch
                branch_customer_names = list(set(orders.mapped('customer_name')))
                if not branch_customer_names:
                    return self._json_response({'status': 'success', 'data': []})
                customers = request.env['restoran.customer'].sudo().search(
                    [('name', 'in', branch_customer_names)], 
                    order='visit_count desc', limit=limit_val
                )
            else:
                customers = request.env['restoran.customer'].sudo().search([], order='visit_count desc', limit=limit_val)
            
            data = []
            for c in customers:
                data.append({
                    'id': c.id,
                    'name': c.name,
                    'phone': c.phone,
                    'visit_count': c.visit_count,
                    'loyalty_points': c.loyalty_points,
                    'is_eligible_reward': c.visit_count >= 10,
                    'special_reward': c.special_reward or '',
                })
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)
    @http.route('/api/customer_claim', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def claim_customer_reward(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']
            
            name = data.get('name')
            cust = request.env['restoran.customer'].sudo().search([('name', '=', name)], limit=1)
            if not cust:
                return self._json_response({'status': 'error', 'message': 'Pelanggan tidak ditemukan'}, 404)
            
            if cust.claim_reward():
                return self._json_response({'status': 'success', 'message': 'Reward berhasil diklaim!'})
            else:
                return self._json_response({'status': 'error', 'message': 'Kunjungan belum cukup untuk klaim reward.'}, 400)
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/customer_inject_reward', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def inject_customer_reward(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']
            
            customer_id = data.get('customer_id')
            reward_text = data.get('reward_text')
            
            cust = request.env['restoran.customer'].sudo().browse(int(customer_id))
            if not cust.exists():
                return self._json_response({'status': 'error', 'message': 'Pelanggan tidak ditemukan'}, 404)
            
            cust.sudo().write({'special_reward': reward_text})
            return self._json_response({'status': 'success', 'message': 'Reward berhasil disuntikkan ke pelanggan.'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/customer_claim_special', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def claim_special_reward(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']
            
            name = data.get('name')
            cust = request.env['restoran.customer'].sudo().search([('name', '=', name)], limit=1)
            if not cust:
                return self._json_response({'status': 'error', 'message': 'Pelanggan tidak ditemukan'}, 404)
            
            cust.sudo().write({'special_reward': False})
            return self._json_response({'status': 'success', 'message': 'Special reward berhasil dipakai!'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

