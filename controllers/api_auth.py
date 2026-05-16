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


class RestoranAPI_Auth_1(RestoranBase):
    @http.route('/api/login', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def api_login(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            
            username = data.get('username', '').strip()
            password = data.get('password', '').strip()
            
            if not username or not password:
                return self._json_response({'status': 'error', 'message': 'Email dan Password wajib diisi'}, 400)
            
            db = request.env.cr.dbname
            
            # Check if user exists first
            user_check = request.env['res.users'].sudo().search([('login', '=', username)], limit=1)
            if not user_check:
                return self._json_response({'status': 'error', 'message': 'Akun tidak ditemukan. Periksa kembali email Anda.'}, 401)
            
            try:
                uid = request.session.authenticate(db, username, password)
            except AccessDenied:
                return self._json_response({'status': 'error', 'message': 'Password salah. Silakan coba lagi.'}, 401)
            
            if not uid:
                return self._json_response({'status': 'error', 'message': 'Password salah. Silakan coba lagi.'}, 401)
            
            user = request.env['res.users'].sudo().browse(uid)
            
            if not user.restoran_role:
                return self._json_response({'status': 'error', 'message': 'Akun ini belum memiliki role. Hubungi Admin.'}, 403)
            
            return self._json_response({
                'status': 'success',
                'data': {
                    'name': user.name,
                    'role': user.restoran_role,
                    'cabang_id': user.cabang_id.id if user.cabang_id else None,
                    'cabang_name': user.cabang_id.name if user.cabang_id else 'Semua Cabang',
                    'manager_pin': user.cabang_id.manager_pin if user.cabang_id else '1234'
                }
            })
            
        except AccessDenied:
            return self._json_response({'status': 'error', 'message': 'Password salah. Silakan coba lagi.'}, 401)
            
        except Exception as e:
            _logger.error(f"Login Error: {e}")
            return self._json_response({'status': 'error', 'message': 'Terjadi kesalahan server. Coba beberapa saat lagi.'}, 500)

    
