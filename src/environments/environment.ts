const host = (typeof window !== 'undefined' && window.location) ? window.location.hostname : 'localhost';

export const environment = {
    production: false,
    apiUrl: `http://${host}:5125/api/v1`,
    imageBaseUrl: `http://${host}:5125`,
    hubUrl: `http://${host}:5125/hubs`,
    // apiUrl: 'https://ramaroundapi1.runasp.net/api/v1',
    // imageBaseUrl: 'https://ramaroundapi1.runasp.net',
    // hubUrl: 'https://ramaroundapi1.runasp.net/hubs',
    appName: 'نظام إدارة البطولات',
    version: '1.0.0-dev',
    enableDebugTools: true,
    logLevel: 'debug'
};
