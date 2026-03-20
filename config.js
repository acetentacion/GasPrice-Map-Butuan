// Configuration file for API endpoints
// This will be replaced by environment variables in production

const config = {
    // API base URL - will be replaced by environment variables in production
    API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
        ? 'http://localhost:3000' 
        : 'https://gasfinderbxu.onrender.com'
};

// Override with environment variable if available (for Netlify)
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // For production, use the environment variable or default to a common backend URL pattern
    const envBaseUrl = window.location.origin.replace('netlify.app', 'onrender.com');
    config.API_BASE_URL = envBaseUrl;
    
    // Since the backend is not deployed on Render, always use localhost for now
    // This is a temporary solution until the backend is properly deployed
    console.warn('Using localhost backend as Render deployment is not available');
    config.API_BASE_URL = 'http://localhost:3000';
}

// Export for use in frontend
if (typeof window !== 'undefined') {
    window.config = config;
}

export default config;
