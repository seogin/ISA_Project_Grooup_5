/*

Claude Sonnet 4 (https://claude.ai/) was used to generate the following code solutions in this assignment:
  
  1. HTTP Method Detection - The determineHttpMethod() function for automatically routing SELECT queries to GET and INSERT queries to POST methods.
  
  2. Response Formatting - The formatResponse() function for dynamically generating HTML tables and formatting server responses with success/error styling.
      
  3. DOM Manipulation - The dynamic HTML generation and innerHTML updates for displaying query results and server responses.
  
*/

const API_BASE_URL = 'https://comp4537-lab-in-pair-2.onrender.com';
const UI_STRINGS = {
    LOADING: 'Processing...',
    ERROR_NETWORK: 'Network error occurred. Please check if the server is running.',
    ERROR_EMPTY_QUERY: 'Please enter a SQL query.',
    SUCCESS_INSERT: 'Default patients inserted successfully!',
    QUERY_SENT: 'Query submitted successfully!',
    PLACEHOLDER_QUERY: 'Enter your SQL query here (SELECT or INSERT only)\nExample: SELECT * FROM patient'
};

// This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
function formatResponse(data) {
    if (data.success) {
        let html = `<div class="success">✓ ${data.message}</div>`;
        
        if (data.data && Array.isArray(data.data)) {
            if (data.data.length > 0) {
                html += '<div class="data-table">';
                html += '<table>';
                
                const headers = Object.keys(data.data[0]);
                html += '<thead><tr>';
                headers.forEach(header => {
                    html += `<th>${header}</th>`;
                });
                html += '</tr></thead>';
                
                html += '<tbody>';
                data.data.forEach(row => {
                    html += '<tr>';
                    headers.forEach(header => {
                        html += `<td>${row[header] || ''}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody>';
                
                html += '</table>';
                html += `<div class="row-count">${data.data.length} row(s) returned</div>`;
                html += '</div>';
            } else {
                html += '<div class="info">No rows returned.</div>';
            }
        }
        
        if (data.results && Array.isArray(data.results)) {
            html += '<div class="insert-results">';
            data.results.forEach((result, index) => {
                const status = result.success ? '✓' : '✗';
                const className = result.success ? 'success' : 'error';
                html += `<div class="${className}">${status} Row ${index + 1}: ${result.message}</div>`;
            });
            html += '</div>';
        }
        
        return html;
    } else {
        return `<div class="error">✗ ${data.message}</div>`;
    }
}

// This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
function determineHttpMethod(query) {
    const trimmedQuery = query.trim().toUpperCase();
    if (trimmedQuery.startsWith('SELECT')) {
        return 'GET';
    } else if (trimmedQuery.startsWith('INSERT')) {
        return 'POST';
    } else {
        return 'POST';
    }
}

async function makeRequest(url, method, data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && method === 'POST') {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        return result;
    } catch (error) {
        console.error('Request error:', error);
        return {
            success: false,
            message: UI_STRINGS.ERROR_NETWORK
        };
    }
}

async function insertDefaultPatients() {
    const responseDiv = document.getElementById('insertResponse');
    responseDiv.innerHTML = `<div class="loading">${UI_STRINGS.LOADING}</div>`;
    
    const result = await makeRequest(`${API_BASE_URL}/api/v1/patients/default`, 'POST');
    responseDiv.innerHTML = formatResponse(result);
}

async function submitQuery() {
    const queryInput = document.getElementById('queryInput');
    const responseDiv = document.getElementById('queryResponse');
    const query = queryInput.value.trim();
    
    if (!query) {
        responseDiv.innerHTML = `<div class="error">${UI_STRINGS.ERROR_EMPTY_QUERY}</div>`;
        return;
    }
    
    responseDiv.innerHTML = `<div class="loading">${UI_STRINGS.LOADING}</div>`;
    
    const method = determineHttpMethod(query);
    let result;
    
    if (method === 'GET') {
        const encodedQuery = encodeURIComponent(query);
        const url = `${API_BASE_URL}/api/v1/sql/${encodedQuery}`;
        result = await makeRequest(url, 'GET');
    } else {
        const url = `${API_BASE_URL}/api/v1/sql`;
        result = await makeRequest(url, 'POST', { query: query });
    }
    
    // This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
    responseDiv.innerHTML = formatResponse(result);
}

function initializeEventListeners() {
    const insertButton = document.getElementById('insertButton');
    const submitButton = document.getElementById('submitQuery');
    const queryInput = document.getElementById('queryInput');
    
    insertButton.addEventListener('click', insertDefaultPatients);
    submitButton.addEventListener('click', submitQuery);
    
    queryInput.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
            submitQuery();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    
    console.log('Patient Database Client initialized');
    console.log('Server URL:', API_BASE_URL);
});