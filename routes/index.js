'use strict';

module.exports = function(app, nconf, isLoggedIn, hasUsername) {
  var user = require('../lib/user');
  var playlist = require('../lib/playlist');

  app.get('/', function (req, res) {
    if (req.session.email) {
      user.loadProfile(req, function(err, user) {
        req.session.username = user.username;
        req.session.userId = user.id;
        req.session.background = user.background;
        res.redirect('/dashboard');
      });
    } else {
      res.render('index', {
        pageType: 'index',
        background: nconf.get('background_default')
      });
    }
  });

  app.get('/logout', function (req, res) {
    req.session.reset();

    res.redirect('/');
  });

  app.get('/profile', isLoggedIn, function (req, res) {
    user.loadProfile(req, function(err, user) {
      if (err) {
        res.render('profile', {
          pageType: 'profile',
          location: '',
          website: '',
          gravatar: '',
          background: nconf.get('background_default')
        });
      } else {
        req.session.username = user.username;
        req.session.userId = user.id;
        req.session.background = user.background;

        res.render('profile', {
          pageType: 'profile',
          location: user.location || '',
          website: user.website || '',
          gravatar: user.gravatar || '',
          background: user.background || nconf.get('background_default')
        });
      }
    });
  });

  app.post('/profile', isLoggedIn, function(req, res) {
    if (!req.session.username) {
      req.session.firstVisit = true;
    } else {
      req.session.firstVisit = false;
    }
    user.saveProfile(req, function(err, user) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.background = user.background;
        res.json({
          message: 'Profile has been updated!',
          meta: { firstVisit: req.session.firstVisit }
        });
      }
    });
  });

  app.post('/background', isLoggedIn, function(req, res) {
    user.saveBackground(req, nconf, function(err, background) {
      if (err) {
        res.redirect('/profile?error=1');
      } else {
        req.session.background = background;
        res.redirect('/profile');
      }
    });
  });

  app.post('/reset/background', isLoggedIn, function(req, res) {
    req.body.background = '';
    user.saveBackground(req, nconf, function(err, background) {
      if (err) {
        res.redirect('/profile?error=1');
      } else {
        req.session.background = '';
        res.redirect('/profile');
      }
    });
  });

  app.get('/dashboard', isLoggedIn, hasUsername, function (req, res) {
    playlist.getGlobal(req, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('dashboard', {
          pageType: 'dashboard',
          playlists: playlists || [],
          background: req.session.background || nconf.get('background_default')
        });
      }
    });
  });

  app.get('/user/:id', function(req, res) {
    var isOwner = false;
    var id = parseInt(req.params.id);

    playlist.userRecent(req, function(err, playlists) {
      if (err) {
        res.redirect('/404');
      } else {
        if (req.session && req.session.email &&
          parseInt(req.session.userId, 10) === parseInt(req.params.id, 10)) {
          isOwner = true;
        }

        res.render('playlists', {
          pageType: 'userProfile',
          playlists: playlists.data,
          owner: playlists.owner,
          isOwner: isOwner,
          background: playlists.owner.background || nconf.get('background_default')
        });
      }
    });
  });
};
