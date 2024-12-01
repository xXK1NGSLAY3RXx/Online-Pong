// src/utils/fetchConfig.js
export const fetchConfig = async () => {
    const response = await fetch('/config.json');
    if (!response.ok) {
        throw new Error('Failed to fetch configuration');
    }
    return response.json();
};
