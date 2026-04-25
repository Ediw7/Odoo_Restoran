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

    
