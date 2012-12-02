var express = require('express');
var configurations = module.exports;
var app = express();
var server = require('http').createServer(app);
var settings = require('./settings')(app, configurations, express);
var nconf = require('nconf');

nconf.argv().env().file({ file: 'local.json' });

/* Filters for routes */

var isLoggedIn = function(req, res, next) {
  if (req.session.email) {
    next();
  } else {
    res.redirect('/');
  }
};

var hasUsername = function(req, res, next) {
  if (req.session.username) {
    next();
  } else {
    res.redirect('/profile');
  }
};

require('express-persona')(app, {
  audience: nconf.get('domain') + ':' + nconf.get('authPort')
});

// routes
require("./routes")(app, nconf, isLoggedIn, hasUsername);
require("./routes/playlist")(app, nconf, isLoggedIn, hasUsername);
require("./routes/mox")(app, nconf, isLoggedIn, hasUsername);

app.get('/404', function(req, res, next) {
  next();
});

app.get('/403', function(req, res, next) {
  err.status = 403;
  next(new Error('not allowed!'));
});

app.get('/500', function(req, res, next) {
  next(new Error('something went wrong!'));
});

app.listen(process.env.PORT || nconf.get('port'));
