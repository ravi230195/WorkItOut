# Workout Tracker Flask Backend

This Flask backend serves as an optional proxy for the workout tracker app, providing server-side JWT validation and secure Supabase operations.

## Features

- JWT token validation via Supabase Auth
- Proxy endpoints for workout operations
- CORS configuration for frontend integration
- Health check endpoint
- Docker support for easy deployment

## Environment Variables

Required environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE`: Supabase service role key (server-side only)
- `SUPABASE_ANON_KEY`: Supabase anonymous/public key
- `PORT`: Port to run the server (default: 5000)
- `FLASK_DEBUG`: Enable debug mode (default: False)

## API Endpoints

### Health Check
- `GET /healthz` - Returns server status

### Workouts
- `POST /api/workouts/start` - Start a new workout
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "template_id": "optional", "started_at": "iso_string" }`

- `GET /api/workouts/recent?since=<iso>` - Get recent workouts
  - Headers: `Authorization: Bearer <token>`
  - Query: `since` (optional ISO timestamp)

- `PATCH /api/workouts/<id>/end` - End a workout
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "ended_at": "iso_string", "duration_minutes": number }`

## Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE="your_service_role_key"
export SUPABASE_ANON_KEY="your_anon_key"
export FLASK_DEBUG="True"
```

3. Run the server:
```bash
python app.py
```

## Deployment Options

### Option 1: Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Use these settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`
   - **Environment**: Python 3
4. Add environment variables in Render dashboard
5. Deploy

### Option 2: Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway up`
4. Set environment variables: `railway variables`

### Option 3: Google Cloud Run

1. Build and push Docker image:
```bash
docker build -t gcr.io/YOUR_PROJECT/workout-backend .
docker push gcr.io/YOUR_PROJECT/workout-backend
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy workout-backend \
  --image gcr.io/YOUR_PROJECT/workout-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=your_url,SUPABASE_SERVICE_ROLE=your_key
```

### Option 4: Heroku

1. Create Heroku app: `heroku create your-app-name`
2. Set environment variables:
```bash
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_SERVICE_ROLE=your_key
heroku config:set SUPABASE_ANON_KEY=your_anon_key
```
3. Deploy: `git push heroku main`

## Docker

Run with Docker:

```bash
# Build
docker build -t workout-backend .

# Run
docker run -p 5000:5000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE=your_key \
  -e SUPABASE_ANON_KEY=your_anon_key \
  workout-backend
```

## Frontend Integration

### Enabling Flask Proxy Mode

To use the Flask backend proxy instead of direct Supabase calls, you need to modify the configuration in `/utils/supabase-api.ts`:

```typescript
// Change these lines in supabase-api.ts:
const USE_FLASK_PROXY = true; // Set to true to use Flask proxy
const FLASK_BASE_URL = "https://your-backend-url"; // Set your Flask backend URL here
```

**Important:** In a production app, these would be environment variables, but for simplicity in this demo they are hardcoded constants that you can modify directly in the file.

### Configuration Steps

1. Deploy your Flask backend to a hosting service (Render, Railway, etc.)
2. Get the deployed URL (e.g., `https://workout-backend-abc123.onrender.com`)
3. Update the `FLASK_BASE_URL` constant in `/utils/supabase-api.ts`
4. Set `USE_FLASK_PROXY = true` in the same file
5. The frontend will automatically route requests through the Flask proxy

### Switching Between Modes

- **Direct Supabase mode** (`USE_FLASK_PROXY = false`): Frontend calls Supabase REST API directly
- **Flask proxy mode** (`USE_FLASK_PROXY = true`): Frontend calls Flask backend, which then calls Supabase with service role permissions

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE` to the client
- Always validate JWT tokens before database operations
- Use HTTPS in production
- Restrict CORS origins in production
- User ID is derived from validated JWT, never from client input

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token validity and SUPABASE_ANON_KEY
2. **500 Internal Error**: Verify SUPABASE_SERVICE_ROLE is set correctly
3. **CORS Error**: Ensure your frontend URL is in the CORS origins list
4. **Connection Refused**: Check if the server is running and port is correct

### Logs

Enable debug logging by setting `FLASK_DEBUG=True` for detailed error information.