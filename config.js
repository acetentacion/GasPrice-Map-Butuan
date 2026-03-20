// Configuration file for API endpoints
// This will be replaced by environment variables in production

const config = {
    // API base URL - will be replaced by environment variables in production
    API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
        ? 'http://localhost:3000' 
        : (window.location.origin || window.location.protocol + '//' + window.location.host)
};

// Export for use in frontend
if (typeof window !== 'undefined') {
    window.config = config;
}

export default config;