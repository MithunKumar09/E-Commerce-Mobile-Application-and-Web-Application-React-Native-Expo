// backend/middleware/rawBodyParser.js
module.exports = function rawBodyParser(req, res, next) {
  if (req.originalUrl === '/api/user/webhook-order') {
    req.rawBody = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
      req.rawBody += chunk;
    });
    req.on('end', function () {
      if (!req.rawBody) {
        console.error("No raw body received for the request.");
      } else {
        console.log("Raw Body parsed successfully: ", req.rawBody);
      }
      next();
    });
  } else {
    next();
  }
};
