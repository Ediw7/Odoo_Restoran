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


class RestoranAPI_Dashboard_7(RestoranBase):
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
                    'total_menu': c.total_menu,
                    'total_order_today': c.total_order_today,
                    'revenue_today': c.revenue_today,
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
                'total_orders_today': len(all_orders), # for compatibility
                'total_revenue': sum(all_orders.mapped('total_amount')),
                'total_revenue_today': sum(all_orders.mapped('total_amount')), # for compatibility
                'total_menu_available': request.env['restoran.menu'].sudo().search_count([
                    ('available', '=', True)
                ] + ([('cabang_id', 'in', [False, int(cabang_id)])] if cabang_id else [])),
            }

            return self._json_response({'status': 'success', 'data': dashboard})
        except Exception as e:
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    

class RestoranAPI_Dashboard_9(RestoranBase):
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

    

class RestoranAPI_Dashboard_11(RestoranBase):
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
            branch_performance = {}

            # Cache the BOM cost to speed up
            menu_cost_cache = {}

            # Group data for charts (By Date/Month)
            chart_dict = {}

            for order in orders:
                total_revenue += order.total_amount
                
                # Branch Performance aggregation (if global)
                if not cabang_id:
                    br_name = order.cabang_id.name or 'Pusat'
                    if br_name not in branch_performance:
                        branch_performance[br_name] = {'name': br_name, 'total': 0.0, 'orders': 0}
                    branch_performance[br_name]['total'] += order.total_amount
                    branch_performance[br_name]['orders'] += 1

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

            # Sort branch performance
            sorted_branches = sorted(branch_performance.values(), key=lambda x: x['total'], reverse=True)
            
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
                'branch_performance': sorted_branches,
                'chart_data': chart_data
            }})
        except Exception as e:
            _logger.error(f"Error finance report: {e}")
            return self._json_response({'status': 'error', 'message': str(e)}, 500)

    
