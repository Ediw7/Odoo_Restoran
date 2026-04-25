import json
import logging
from odoo import http
from odoo.http import request, Response
from odoo.fields import Date

from .api_base import RestoranBase

_logger = logging.getLogger(__name__)

class RestoranAPI_Purchasing(RestoranBase):

    @http.route('/api/suppliers', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_suppliers(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            suppliers = request.env['restoran.supplier'].sudo().search([('active', '=', True)])
            data = [{'id': s.id, 'name': s.name, 'phone': s.phone or '', 'address': s.address or ''} for s in suppliers]
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/purchases', type='http', auth='public', methods=['GET', 'OPTIONS'], csrf=False)
    def get_purchases(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            cabang_id = kwargs.get('cabang_id')
            limit = int(kwargs.get('limit', 20))
            offset = int(kwargs.get('offset', 0))
            
            domain = []
            if cabang_id:
                domain.append(('cabang_id', '=', int(cabang_id)))
            
            purchases = request.env['restoran.purchase'].sudo().search(domain, limit=limit, offset=offset)
            data = []
            for p in purchases:
                data.append({
                    'id': p.id,
                    'name': p.name,
                    'supplier': {'id': p.supplier_id.id, 'name': p.supplier_id.name},
                    'cabang': p.cabang_id.name,
                    'date_order': p.date_order.strftime('%Y-%m-%d %H:%M:%S') if p.date_order else None,
                    'date_received': p.date_received.strftime('%Y-%m-%d %H:%M:%S') if p.date_received else None,
                    'state': p.state,
                    'total_amount': p.total_amount,
                    'note': p.note or '',
                    'lines': [{
                        'id': l.id,
                        'bahan_id': l.bahan_id.id,
                        'bahan_name': l.bahan_id.name,
                        'qty': l.qty,
                        'uom': l.uom,
                        'price_unit': l.price_unit,
                        'subtotal': l.subtotal,
                    } for l in p.line_ids]
                })
            
            return self._json_response({'status': 'success', 'data': data})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/purchase_create', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def create_purchase(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']

            cabang_id = data.get('cabang_id')
            supplier_id = data.get('supplier_id')
            note = data.get('note', '')
            lines = data.get('lines', [])
            
            if not cabang_id or not supplier_id:
                return self._json_response({'status': 'error', 'message': 'Cabang dan Supplier harus diisi!'}, 400)
            
            purchase = request.env['restoran.purchase'].sudo().create({
                'cabang_id': int(cabang_id),
                'supplier_id': int(supplier_id),
                'state': 'confirmed', # Langsung konfirmasi (asumsi sudah deal dengan pasar)
                'note': note,
                'line_ids': [(0, 0, {
                    'bahan_id': int(l['bahan_id']),
                    'qty': float(l['qty']),
                    'price_unit': float(l['price_unit']),
                }) for l in lines]
            })
            
            return self._json_response({'status': 'success', 'data': {'id': purchase.id, 'name': purchase.name}})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    @http.route('/api/purchase_receive', type='http', auth='public', methods=['POST', 'OPTIONS'], csrf=False)
    def receive_purchase(self, **kwargs):
        if request.httprequest.method == 'OPTIONS': return self._cors_preflight()
        try:
            data_str = request.httprequest.data.decode('utf-8')
            data = json.loads(data_str) if data_str else {}
            if 'params' in data: data = data['params']
            
            purchase_id = data.get('purchase_id')
            po = request.env['restoran.purchase'].sudo().browse(int(purchase_id))
            
            if not po.exists():
                return self._json_response({'status': 'error', 'message': 'PO tidak ditemukan!'}, 404)
            
            po.action_receive()
            return self._json_response({'status': 'success', 'message': f'Barang dari {po.name} berhasil di-stok!'})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)
