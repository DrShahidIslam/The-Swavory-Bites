import os
import sys
import json
import subprocess
from http.server import SimpleHTTPRequestHandler, HTTPServer

# Directory containing the admin HTML files
ADMIN_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'bridge_page', 'admin'))

class AdminServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from the bridge_page/admin directory
        super().__init__(*args, directory=ADMIN_DIR, **kwargs)

    def do_GET(self):
        # Reroute /admin/... to /... since we serve from the admin directory
        if self.path.startswith('/admin/'):
            self.path = self.path.replace('/admin/', '/', 1)
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/generate':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                trend = data.get('trend', 'Viral Food')
            except:
                trend = 'Viral Food'
            
            print(f"\n--- [API] UI REQUESTED PIN GENERATION FOR: {trend} ---")
            
            # Execute the pin_generator.py script
            try:
                # We use sys.executable to ensure it runs with the same python interpreter
                result = subprocess.run([sys.executable, "pin_generator.py", "--trend", trend], check=True, text=True, capture_output=True)
                print(result.stdout)
                success = True
            except subprocess.CalledProcessError as e:
                print(e.stdout)
                print(e.stderr)
                success = False
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "success": success,
                "pinUrl": "https://www.pinterest.com/TheSwavoryBites/sandbox-testing/"
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_error(404, "Endpoint not found")

if __name__ == '__main__':
    port = 5000
    server = HTTPServer(('localhost', port), AdminServerHandler)
    print(f"==================================================")
    print(f" THE SWAVORY BITES - DASHBOARD SERVER ACTIVE")
    print(f"==================================================")
    print(f" Open your browser to: http://localhost:{port}/admin/dashboard.html")
    print(f" Press Ctrl+C to stop the server.")
    print(f"--------------------------------------------------")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()
