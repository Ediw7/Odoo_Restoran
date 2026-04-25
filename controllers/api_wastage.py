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


class RestoranAPI_Wastage_13(RestoranBase):
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
            wastage_id = None
            if request.httprequest.data:
                data = json.loads(request.httprequest.data.decode('utf-8'))
                if 'params' in data: data = data['params']
                wastage_id = data.get('wastage_id')

            wastage = request.env['restoran.wastage'].sudo().browse(int(wastage_id))
            if not wastage.exists():
                return self._json_response({'status': 'error', 'message': 'Data wastage tidak ditemukan!'}, 404)
            
            wastage.action_done()
            return self._json_response({'status': 'success', 'message': f'Stok dari {wastage.name} berhasil dipotong.'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    
