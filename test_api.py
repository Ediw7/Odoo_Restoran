import urllib.request
import json
req = urllib.request.Request('http://localhost:8069/api/orders', 
    data=json.dumps({"cabang_id": 1, "lines": [{"menu_id": 1, "qty": 1}]}).encode('utf-8'),
    headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as f:
        print(f.read().decode('utf-8'))
except Exception as e:
    print(getattr(e, 'read', lambda: str(e))())
