// Configuration file for API endpoints
// This will be replaced by environment variables in production

const config = {
    // API base URL - will be replaced by environment variables in production
    API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
        ? 'http://localhost:3000' 
        : 'https://gasprice-map-butuan.onrender.com'
};

// Override with environment variable if available (for Netlify)
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // For production, use the environment variable or default to a common backend URL pattern
    const envBaseUrl = window.location.origin.replace('netlify.app', 'onrender.com');
    config.API_BASE_URL = envBaseUrl;
    
    // Use the Render backend URL for production
    config.API_BASE_URL = 'https://gasprice-map-butuan.onrender.com';
}

// Export for use in frontend
if (typeof window !== 'undefined') {
    window.config = config;
}

export default config;
