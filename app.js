var express = require('express');
var configurations = module.exports;
var app = express();
var server = require('http').createServer(app);
var settings = require('./settings')(app, configurations, express);
var nconf = require('nconf');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;

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

var isAjaxRequest = function(req, res, next) {
  if (req.xhr) {
    next();
  } else {
    res.redirect('/#' + req.url);
  }
}

/* Passport OAuth setup */
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(new TwitterStrategy({
    consumerKey: nconf.get('twitter_key'),
    consumerSecret: nconf.get('twitter_secret'),
    callbackURL: nconf.get('domain') + ':' + nconf.get('authPort') + '/auth/twitter/callback'
  },
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function (err) {
      if (!profile.access_token) {
        profile.access_token = accessToken;
      }

      return done(err, profile);
    });
  }
));


// routes
require("./routes")(app, nconf, isLoggedIn, hasUsername, isAjaxRequest, passport);
require("./routes/playlist")(app, nconf, isLoggedIn, hasUsername, isAjaxRequest);
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
