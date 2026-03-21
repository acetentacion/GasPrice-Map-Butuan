const config = {
    API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost') 
        ? 'http://localhost:3000' 
        : 'https://gasprice-map-butuan.onrender.com'
};

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const envBaseUrl = window.location.origin.replace('netlify.app', 'onrender.com');
    config.API_BASE_URL = envBaseUrl;
    config.API_BASE_URL = 'https://gasprice-map-butuan.onrender.com';
}

if (typeof window !== 'undefined') {
    window.config = config;
}

export default config;
