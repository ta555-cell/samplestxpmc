// Netlify Specific Configuration & Environment Settings
window.NetlifyConfig = {
    environment: "production",
    hostingType: "netlify",
    // Netlify Serverless Function Endpoint
    apiEndpoint: "/.netlify/functions/labapi",
    
    // Netlify specific features or settings
    features: {
        offlineMode: false,
        autoSync: true
    },
    
    // Helper function to get current API URL
    getApiUrl() {
        return this.apiEndpoint;
    }
};

console.log("Netlify environment configuration loaded successfully.");
