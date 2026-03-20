// Configuration file for API endpoints
// This will be replaced by environment variables in production

const config = {
    // API base URL - will be replaced by environment variables in production
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000'
};

// Export for use in frontend
if (typeof window !== 'undefined') {
    window.config = config;
}

export default config;