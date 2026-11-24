// Express 4 doesn't catch async rejections; forward them to the error handler.
const Layer = require('express/lib/router/layer'); const handle = Layer.prototype.handle_request;
Layer.prototype.handle_request = function (req, res, next) {
  try { const r = handle.call(this, req, res, next); if (r && r.catch) r.catch(next); } catch (e) { next(e); }
};
