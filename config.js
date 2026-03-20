// Configuration file for API endpoints
// This will be replaced by environment variables in production

const config = {
    // API base URL - will be replaced by environment variables in production
    API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
        ? 'http://localhost:3000' 
        : (window.location.origin || window.location.protocol + '//' + window.location.host)
};

// Override with environment variable if available (for Netlify)
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // For production, use the environment variable or default to a common backend URL pattern
    const envBaseUrl = window.location.origin.replace('netlify.app', 'onrender.com');
    config.API_BASE_URL = envBaseUrl;
}

// Export for use in frontend
if (typeof window !== 'undefined') {
    window.config = config;
}

export default config;