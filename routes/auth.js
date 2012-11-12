var auth = require('../lib/authenticate');

module.exports = function(app, nconf) {
  // Login
  app.post('/login', function(req, res) {
    auth.verify(req, nconf, function(error, email) {
      if (email) {
        req.session.email = email;
        req.session.authenticated = true;
      }
      res.redirect('/');
    });
  });

  // Logout
  app.get('/logout', function(req, res) {
    req.session.destroy();
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/', 303);
  });
};
