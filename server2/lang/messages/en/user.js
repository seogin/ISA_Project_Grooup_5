/*

Claude Sonnet 4 (https://claude.ai/) was used to generate the following code solutions in this assignment:

  Default Patient Data - The DEFAULT_PATIENTS array containing the 4 required patient records (Sara Brown, John Smith, Jack Ma, Elon Musk) with proper date formatting.

*/

const STRINGS = {
  // SQL Queries
  CREATE_TABLE_QUERY: `
    CREATE TABLE IF NOT EXISTS patient (
      patientId INT(11) AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      dateOfBirth DATETIME NOT NULL
    ) ENGINE=InnoDB
  `,
  
  INSERT_PATIENT_QUERY: 'INSERT INTO patient (name, dateOfBirth) VALUES (?, ?)',
  
  // Default patient data
  // This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
  DEFAULT_PATIENTS: [
    { name: 'Sara Brown', dateOfBirth: '1981-01-01' },
    { name: 'John Smith', dateOfBirth: '1941-01-01' },
    { name: 'Jack Ma', dateOfBirth: '1961-01-30' },
    { name: 'Elon Musk', dateOfBirth: '1999-01-01' }
  ],
  
  // HTTP Response Messages
  RESPONSES: {
    SUCCESS_INSERT: 'Patient data inserted successfully',
    SUCCESS_SELECT: 'Query executed successfully',
    ERROR_INVALID_QUERY: 'Invalid or dangerous query detected',
    ERROR_DATABASE: 'Database error occurred',
    ERROR_METHOD: 'Method not allowed',
    ERROR_MISSING_QUERY: 'SQL query is required',
    ERROR_SERVER: 'Internal server error'
  },
  
  // Security Messages
  SECURITY: {
    BLOCKED_OPERATIONS: ['UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'],
    BLOCKED_MESSAGE: 'Operation not allowed for security reasons'
  },
  
  // Server Messages
  SERVER: {
    STARTUP: 'Server running on port',
    DB_CONNECTED: 'Connected to MySQL database',
    DB_ERROR: 'Database connection failed',
    TABLE_CREATED: 'Patient table ready'
  }
};

module.exports = STRINGS;