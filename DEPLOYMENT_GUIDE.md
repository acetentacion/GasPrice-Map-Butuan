# Deployment Guide: GasPrice Map Backend to Render

This guide will help you deploy your backend to Render so it runs online instead of locally.

## Prerequisites

1. A Render account (free tier available)
2. Your GitHub repository connected to Render
3. Your MongoDB Atlas connection string

## Step 1: Prepare Your Environment

### 1.1 Create Environment Variables

Create a `.env` file in your project root (this file should NOT be committed to git):

```bash
cp .env.example .env
```

Edit the `.env` file with your actual values:

```env
# MongoDB Connection String (get this from MongoDB Atlas)
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/gasprice?retryWrites=true&w=majority

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration (add your Render URL once you have it)
CORS_ORIGINS=http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,https://gasfinderbxu.netlify.app
```

### 1.2 Test Locally with Environment Variables

```bash
npm install
npm start
```

Make sure your server starts successfully and can connect to MongoDB.

## Step 2: Deploy to Render

### 2.1 Sign Up and Connect GitHub

1. Go to [render.com](https://render.com) and sign up for a free account
2. Connect your GitHub account
3. Click "New" → "Web Service" → "Connect GitHub repo"

### 2.2 Configure the Service

Fill in the deployment settings:

- **Name**: `gasprice-map-backend` (or your preferred name)
- **Repository**: Select your GitHub repository
- **Branch**: `main` (or your deployment branch)
- **Runtime**: `Node`
- **Region**: `Oregon` (or your preferred region)

### 2.3 Build and Start Commands

- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 2.4 Environment Variables

Add these environment variables in the Render dashboard:

| Key | Value |
|-----|-------|
| `NODE_VERSION` | `18` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,https://gasfinderbxu.netlify.app,https://your-render-url.onrender.com` |

**Note**: Replace `https://your-render-url.onrender.com` with the actual URL Render provides after deployment.

### 2.5 Health Check

- **Health Check Path**: `/api/health`

### 2.6 Persistent Storage

- **Disk Name**: `data`
- **Mount Path**: `/app/uploads`
- **Size**: `1 GB`

Click "Create Web Service" to deploy!

## Step 3: Update Frontend Configuration

Once your backend is deployed, you'll get a URL like `https://gasprice-map-backend.onrender.com`.

### 3.1 Update CORS Origins

Go back to your Render dashboard and add your frontend URLs to the `CORS_ORIGINS` environment variable:

```
http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,https://gasfinderbxu.netlify.app,https://gasprice-map-backend.onrender.com
```

### 3.2 Update Frontend API Calls

In your frontend files, update any hardcoded `localhost:3000` references to your new Render URL:

```javascript
// Before
const API_BASE = 'http://localhost:3000';

// After
const API_BASE = 'https://gasprice-map-backend.onrender.com';
```

## Step 4: Test Your Deployment

### 4.1 Check Health

Visit: `https://your-render-url.onrender.com/api/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45
}
```

### 4.2 Test API Endpoints

Test a few endpoints:

- `GET /api/prices` - Should return price submissions
- `GET /api/user-rankings` - Should return user rankings
- `POST /api/register` - Should allow user registration

### 4.3 Test Frontend Integration

Update your frontend to use the new backend URL and test:
- User registration and login
- Price submission
- Map functionality
- Admin features

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check your `MONGODB_URI` environment variable
   - Ensure your MongoDB Atlas IP whitelist includes Render's IPs or allows access from anywhere

2. **CORS Errors**
   - Verify `CORS_ORIGINS` includes your frontend URL
   - Check browser console for specific CORS errors

3. **Health Check Fails**
   - Ensure `/api/health` endpoint is working
   - Check server logs in Render dashboard

4. **Upload Issues**
   - Verify persistent storage is configured correctly
   - Check that the `/uploads` directory is writable

### Render Logs

Check deployment logs in your Render dashboard under "Logs" to troubleshoot any issues.

## Next Steps

1. **Set up a custom domain** (optional)
2. **Configure SSL** (Render provides this automatically)
3. **Set up monitoring** for your application
4. **Consider upgrading** to a paid plan for more resources if needed

## Security Notes

- Never commit `.env` files to your repository
- Use strong passwords for MongoDB
- Consider using Render's secret management for sensitive data
- Regularly update dependencies

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)