import json
import logging
from odoo import http
from odoo.http import request
from .api_base import RestoranBase

_logger = logging.getLogger(__name__)

class RestoranAPI_User(RestoranBase):
    @http.route('/api/users', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_users(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            users = request.env['res.users'].sudo().search([('restoran_role', '!=', False)])
            data = []
            for u in users:
                data.append({
                    'id': u.id,
                    'name': u.name,
                    'login': u.login,
                    'role': u.restoran_role,
                    'cabang_id': u.cabang_id.id if u.cabang_id else None,
                    'cabang_name': u.cabang_id.name if u.cabang_id else 'Semua Cabang',
                })
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/users/action', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def user_action(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            action = data.get('action')
            
            User = request.env['res.users'].sudo()
            
            if action == 'create':
                if not data.get('login') or not data.get('password'):
                    return self._json_response({'status': 'error', 'message': 'Email/Login and Password are required'}, 400)
                
                # Check if login already exists
                existing = User.search([('login', '=', data.get('login'))])
                if existing:
                    return self._json_response({'status': 'error', 'message': f'Login {data.get("login")} already exists'}, 400)

                User.create({
                    'name': data.get('name'),
                    'login': data.get('login'),
                    'password': data.get('password'),
                    'restoran_role': data.get('role', 'cashier'),
                    'cabang_id': int(data.get('cabang_id')) if data.get('cabang_id') else False,
                    'groups_id': [(6, 0, [request.env.ref('base.group_user').id])] # Basic internal user
                })
                
            elif action == 'update':
                user = User.browse(data.get('id'))
                if user.exists():
                    vals = {
                        'name': data.get('name'),
                        'login': data.get('login'),
                        'restoran_role': data.get('role'),
                        'cabang_id': int(data.get('cabang_id')) if data.get('cabang_id') else False,
                    }
                    if data.get('password'):
                        vals['password'] = data.get('password')
                    user.write(vals)
            
            elif action == 'delete':
                user = User.browse(data.get('id'))
                if user.exists():
                    if user.id == request.env.user.id:
                        return self._json_response({'status': 'error', 'message': 'Cannot delete your own account'}, 400)
                    user.unlink()
                    
            return self._json_response({'status': 'success', 'message': 'User action processed successfully'})
        except Exception as e:
            _logger.error(f"User Action Error: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)
