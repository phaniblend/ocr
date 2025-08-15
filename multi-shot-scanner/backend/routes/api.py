# File: backend/routes/api.py
from flask import Blueprint, request, jsonify
from routes.ai_service import analyze_ui_with_ai
from utils.image_processor import process_image_data
from utils.code_analyzer import analyze_react_code
import base64
import time

api_blueprint = Blueprint('api', __name__)

# Simple in-memory rate limiting
request_counts = {}

def check_rate_limit(ip):
    """Simple rate limiting by IP"""
    current_hour = int(time.time() // 3600)
    key = f"{ip}:{current_hour}"
    
    if key not in request_counts:
        request_counts[key] = 0
    
    request_counts[key] += 1
    
    # Clean old entries
    for k in list(request_counts.keys()):
        if not k.endswith(str(current_hour)):
            del request_counts[k]
    
    return request_counts[key] <= 100  # 100 requests per hour

@api_blueprint.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'service': 'multi-shot-scanner'
    })

@api_blueprint.route('/analyze', methods=['POST'])
def analyze():
    """Main analysis endpoint"""
    try:
        # Rate limiting
        client_ip = request.remote_addr
        if not check_rate_limit(client_ip):
            return jsonify({'error': 'Rate limit exceeded'}), 429
        
        data = request.json
        
        # Validate required fields
        if not data or 'image' not in data or 'reactCode' not in data:
            return jsonify({'error': 'Missing required fields: image and reactCode'}), 400
        
        # Extract and validate image
        image_data = data['image']
        if not image_data.startswith('data:image'):
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Process image
        processed_image = process_image_data(image_data)
        
        # Analyze React code
        code_analysis = analyze_react_code(data['reactCode'])
        
        # Send to AI for analysis
        ai_result = analyze_ui_with_ai(
            image_data=processed_image,
            react_code=data['reactCode'],
            code_analysis=code_analysis,
            options=data.get('options', {})
        )
        
        return jsonify({
            'success': True,
            'result': ai_result,
            'timestamp': time.time(),
            'imageCount': data.get('imageCount', 1)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_blueprint.route('/process-image', methods=['POST'])
def process_image():
    """Process image without AI analysis"""
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({'error': 'Missing image data'}), 400
        
        # Process image
        processed_image = process_image_data(data['image'])
        
        return jsonify({
            'success': True,
            'processedImage': processed_image,
            'timestamp': time.time()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500