# File: backend/app.py
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
import os
from routes.api import api_blueprint
from config.settings import Config

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# Load configuration
app.config.from_object(Config)

# Register blueprints
app.register_blueprint(api_blueprint, url_prefix='/api')

# Serve frontend
@app.route('/')
def serve_frontend():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path.startswith('static/'):
        return send_from_directory('../frontend', path)
    return send_from_directory('../frontend', 'index.html')

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('../frontend', 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)