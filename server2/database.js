/*

Claude Sonnet 4 (https://claude.ai/) was used to generate the following code solutions in this assignment:
  
  1. Table Creation Logic - The automated table creation with Engine=InnoDB specification and IF NOT EXISTS condition for proper database schema management.
  
  2. The isQuerySafe(), insertPatient(), executeQuery() method for blocking dangerous SQL operations (UPDATE, DELETE, DROP) while allowing only SELECT and INSERT queries.

  3. Database Class Structure - The object-oriented approach using ES6 classes for organizing database operations and connection management.

*/

const mysql = require('mysql2/promise');
const STRINGS = require('./lang/messages/en/user');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      console.log('DB Config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        database: process.env.DB_NAME
      });
      
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });
      
      console.log(STRINGS.SERVER.DB_CONNECTED);
      await this.createTable();
      return true;
    } catch (error) {
      console.error(STRINGS.SERVER.DB_ERROR, error.message);
      return false;
    }
  }

  // This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
  async createTable() {
    try {
      await this.connection.execute(STRINGS.CREATE_TABLE_QUERY);
      console.log(STRINGS.SERVER.TABLE_CREATED);
    } catch (error) {
      console.error('Table creation error:', error.message);
      throw error;
    }
  }

  // This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
  async insertPatient(name, dateOfBirth) {
    try {
      const [result] = await this.connection.execute(
        STRINGS.INSERT_PATIENT_QUERY,
        [name, dateOfBirth]
      );
      return {
        success: true,
        message: STRINGS.RESPONSES.SUCCESS_INSERT,
        insertId: result.insertId
      };
    } catch (error) {
      console.error('Insert error:', error.message);
      return {
        success: false,
        message: STRINGS.RESPONSES.ERROR_DATABASE,
        error: error.message
      };
    }
  }

  async insertDefaultPatients() {
    try {
      const results = [];
      for (const patient of STRINGS.DEFAULT_PATIENTS) {
        const result = await this.insertPatient(patient.name, patient.dateOfBirth);
        results.push(result);
      }
      return {
        success: true,
        message: `Inserted ${results.length} patients`,
        results: results
      };
    } catch (error) {
      return {
        success: false,
        message: STRINGS.RESPONSES.ERROR_DATABASE,
        error: error.message
      };
    }
  }

  // This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
  isQuerySafe(query) {
    const upperQuery = query.toUpperCase().trim();
    
    for (const operation of STRINGS.SECURITY.BLOCKED_OPERATIONS) {
      if (upperQuery.includes(operation)) {
        return false;
      }
    }
    
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('INSERT')) {
      return false;
    }
    
    return true;
  }

  // This block of code below was assisted by Claude Sonnet 4 (https://claude.ai/)
  async executeQuery(query) {
    try {
      if (!this.isQuerySafe(query)) {
        return {
          success: false,
          message: STRINGS.SECURITY.BLOCKED_MESSAGE
        };
      }

      const [rows] = await this.connection.execute(query);
      
      return {
        success: true,
        message: STRINGS.RESPONSES.SUCCESS_SELECT,
        data: rows
      };
    } catch (error) {
      console.error('Query execution error:', error.message);
      return {
        success: false,
        message: STRINGS.RESPONSES.ERROR_DATABASE,
        error: error.message
      };
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
    }
  }
}

module.exports = Database;