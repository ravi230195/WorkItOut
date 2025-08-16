from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import requests
import os
from datetime import datetime
from functools import wraps
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# CORS configuration
CORS(app, origins=[
    "http://localhost:3000",
    "https://*.figma.com",
    "https://*.figma-live.com",
    "*"  # For development - restrict in production
])

# Environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://lledulwstlcejiholstu.supabase.co')
SUPABASE_SERVICE_ROLE = os.getenv('SUPABASE_SERVICE_ROLE')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZWR1bHdzdGxjZWppaG9sc3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzYyNjQsImV4cCI6MjA3MDQ1MjI2NH0.c8-ZOMk76dUOhWiekUks04KFAn52F3_OOvNM28ZmjdU')

if not SUPABASE_SERVICE_ROLE:
    logger.warning("SUPABASE_SERVICE_ROLE not set - some operations may fail")

def validate_token(token):
    """Validate Supabase JWT token by calling /auth/v1/user"""
    try:
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {token}'
        }
        
        response = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
        
        if response.status_code == 200:
            user_data = response.json()
            return user_data.get('id')  # Return user ID
        else:
            logger.warning(f"Token validation failed: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return None

def require_auth(f):
    """Decorator to require authentication for endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = validate_token(token)
        
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user_id to request context
        request.user_id = user_id
        return f(*args, **kwargs)
    
    return decorated_function

def make_supabase_request(method, endpoint, data=None, params=None):
    """Make authenticated request to Supabase with service role"""
    if not SUPABASE_SERVICE_ROLE:
        raise Exception("SUPABASE_SERVICE_ROLE not configured")
    
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    url = f'{SUPABASE_URL}/rest/v1/{endpoint}'
    
    if method == 'GET':
        response = requests.get(url, headers=headers, params=params)
    elif method == 'POST':
        response = requests.post(url, headers=headers, json=data)
    elif method == 'PATCH':
        response = requests.patch(url, headers=headers, json=data)
    elif method == 'DELETE':
        response = requests.delete(url, headers=headers)
    else:
        raise ValueError(f"Unsupported method: {method}")
    
    if not response.ok:
        logger.error(f"Supabase request failed: {response.status_code} {response.text}")
        raise Exception(f"Supabase error: {response.status_code}")
    
    return response.json()

@app.route('/healthz', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'ok': True, 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/workouts/start', methods=['POST'])
@require_auth
def start_workout():
    """Start a new workout"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        # Prepare workout data with user_id from token
        workout_data = {
            'user_id': request.user_id,
            'started_at': data.get('started_at', datetime.utcnow().isoformat())
        }
        
        # Handle template_id - only include if it's not null and is numeric
        template_id = data.get('template_id')
        if template_id is not None:
            try:
                # Try to convert to int to ensure it's numeric
                template_id = int(template_id)
                workout_data['template_id'] = template_id
            except (ValueError, TypeError):
                # If not numeric, ignore template_id and log it
                logger.warning(f"Ignoring non-numeric template_id: {template_id}")
        
        # Store template name for reference if provided
        template_name = data.get('template_name')
        if template_name:
            workout_data['template_name'] = template_name
        
        # Create workout in Supabase
        result = make_supabase_request('POST', 'workouts', workout_data)
        
        # Return the first workout if it's a list
        if isinstance(result, list) and result:
            return jsonify(result[0])
        elif isinstance(result, dict):
            return jsonify(result)
        else:
            return jsonify({'error': 'Unexpected response format'}), 500
            
    except Exception as e:
        logger.error(f"Start workout error: {str(e)}")
        return jsonify({'error': 'Failed to start workout'}), 500

@app.route('/api/workouts/recent', methods=['GET'])
@require_auth
def get_recent_workouts():
    """Get recent workouts for the authenticated user"""
    try:
        since = request.args.get('since')
        
        # Build query parameters
        params = {
            'user_id': f'eq.{request.user_id}',
            'select': '*',
            'order': 'started_at.desc'
        }
        
        if since:
            params['started_at'] = f'gte.{since}'
        
        # Fetch workouts from Supabase
        result = make_supabase_request('GET', 'workouts', params=params)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Get recent workouts error: {str(e)}")
        return jsonify({'error': 'Failed to fetch workouts'}), 500

@app.route('/api/workouts/<workout_id>/end', methods=['PATCH'])
@require_auth
def end_workout(workout_id):
    """End a workout"""
    try:
        data = request.get_json() or {}
        
        # Update workout with end time
        update_data = {
            'ended_at': data.get('ended_at', datetime.utcnow().isoformat())
        }
        
        # Add duration if provided
        if 'duration_minutes' in data:
            update_data['duration_minutes'] = data['duration_minutes']
        
        # Update in Supabase with user filter for security
        params = {'user_id': f'eq.{request.user_id}', 'id': f'eq.{workout_id}'}
        result = make_supabase_request('PATCH', 'workouts', update_data, params)
        
        if isinstance(result, list) and result:
            return jsonify(result[0])
        elif isinstance(result, dict):
            return jsonify(result)
        else:
            return jsonify({'error': 'Workout not found or not owned by user'}), 404
            
    except Exception as e:
        logger.error(f"End workout error: {str(e)}")
        return jsonify({'error': 'Failed to end workout'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1', 'on']
    
    logger.info(f"Starting Flask app on port {port}")
    logger.info(f"Supabase URL: {SUPABASE_URL}")
    logger.info(f"Service role configured: {'Yes' if SUPABASE_SERVICE_ROLE else 'No'}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)