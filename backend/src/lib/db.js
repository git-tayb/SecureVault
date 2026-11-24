const { Pool } = require('pg'); const cfg = require('../config');
// Supabase requires TLS. For strict verification, supply Supabase's CA via ssl.ca.
module.exports = new Pool({ connectionString: cfg.databaseUrl, ssl: { rejectUnauthorized: false }, max: 10 });
