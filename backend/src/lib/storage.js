
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const cfg = require('../config');

const sb = createClient(cfg.supabaseUrl, cfg.supabaseKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    transport: WebSocket
  }
});

module.exports = sb.storage.from(cfg.bucket); // private bucket
