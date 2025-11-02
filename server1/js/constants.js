// API base URL for backend server (cannot use env vars in frontend)
export const BACKEND_SERVER_URL = 'http://localhost:3000/api';

// Base URL for the standalone AI (text-to-speech) microservice
export const AI_SERVER_URL = 'http://localhost:8081/api/v1/tts';

const UI_STRINGS = {
    ERROR_UNAUTHORIZED: 'You must be logged in to use this service. Please register or login.',
    API_LIMIT_WARNING: 'You have reached your maximum free API calls (20). Service continues with warning.'
};

export { UI_STRINGS };
