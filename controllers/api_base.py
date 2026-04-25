import json
import logging
from odoo import http
from odoo.http import request, Response
from odoo.fields import Date
from datetime import datetime, timedelta
from odoo.exceptions import AccessDenied

_logger = logging.getLogger(__name__)

class RestoranFrontend(http.Controller):
    @http.route('/restoran/pos', type='http', auth='user', csrf=False)
    def pos_frontend(self, **kwargs):
        import os
        module_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        html_path = os.path.join(module_path, 'static', 'frontend', 'index.html')
        try:
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            return Response(html_content, content_type='text/html')
        except FileNotFoundError:
            return Response('<h1>Frontend belum di-setup</h1>', content_type='text/html', status=404)

class RestoranBase(http.Controller):
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
