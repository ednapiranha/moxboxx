'use strict';

module.exports = function(app, nconf, isLoggedIn, isAjaxRequest, passport) {
  var user = require('../lib/user');
  var playlist = require('../lib/playlist');

  var loadDashboard = function(req, res) {
    res.format({
      html: function() {
        playlist.getGlobal(req, function(err, playlists) {
          if (err) {
            res.redirect('/500');
          } else {
            var nextPage = parseInt(req.query.page, 10) + 1 || 1;
            var prevPage = parseInt(req.query.page, 10) - 1 || 0;
            if (prevPage < 0) {
              prevPage = 0;
            }
          }

          res.render('_dashboard', {
            playlists: playlists || [],
            currentHashPrev: '/#' + req.url.split('?')[0] + '?page=' + prevPage,
            currentHashNext: '/#' + req.url.split('?')[0] + '?page=' + nextPage,
            currentPage: parseInt(req.query.page, 10) || 0,
            analytics: nconf.get('analytics')
          });
        });
      },
      json: function() {
        res.send({
          title: 'moxboxx: dashboard',
          pageType: 'dashboard',
          background: req.session.background || nconf.get('background_default')
        });
      }
    });
  };

  app.get('/auth/twitter', passport.authenticate('twitter'), function (req, res) { });

  app.get('/auth/twitter/callback', passport.authenticate('twitter',
    { failureRedirect: '/' }), function (req, res) {

    req.session.avatar = req.session.passport.user.photos[0].value;
    req.session.username = req.session.passport.user.username;
    res.redirect('/profile');
  });

  app.get('/channel', function(req, res) {
    res.render('channel', {
      layout: false
    });
  });

  app.get('/dashboard', isLoggedIn, isAjaxRequest, function (req, res) {
    loadDashboard(req, res);
  });

  app.get('/', function (req, res) {
    if (req.session.username) {
      user.loadProfile(req, function(err, user) {
        if (user) {
          req.session.username = user.username;
          req.session.userId = user.id;
          req.session.background = user.background;
        }

        res.render('index', {
          pageType: 'index',
          background: req.session.background || nconf.get('background_default'),
          analytics: nconf.get('analytics')
        });
      });
    } else {
      res.render('home', {
        pageType: 'home',
        background: nconf.get('background_default'),
        analytics: nconf.get('analytics')
      });
    }
  });

  app.get('/logout', function (req, res) {
    req.session.destroy();
    req.logout();
    res.redirect('/');
  });

  app.get('/profile', isLoggedIn, function (req, res) {
    user.loadProfile(req, function(err, u) {
      if (err) {
        req.body.username = req.session.username;
        req.body.website = '';

        user.saveProfile(req, function(err, u) {
          if (err) {
            console.log(err)
            res.status(500);
            res.render('500');
          } else {
            res.render('profile', {
              pageType: 'profile',
              location: u.location || '',
              website: u.website || '',
              avatar: u.avatar,
              background: u.background || nconf.get('background_default')
            });
          }
        });
      } else {
        req.session.username = u.username;
        req.session.userId = u.id;
        req.session.background = u.background;

        res.render('profile', {
          pageType: 'profile',
          location: u.location || '',
          website: u.website || '',
          avatar: u.avatar || '',
          background: u.background || nconf.get('background_default')
        });
      }
    });
  });

  app.post('/profile', isLoggedIn, function(req, res) {
    user.saveProfile(req, function(err, user) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.background = user.background;
        res.json({ message: 'Profile updated' });
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

  app.get('/recent', isAjaxRequest, function (req, res) {
    loadDashboard(req, res);
  });

  app.get('/user/:id', isAjaxRequest, function(req, res) {
    res.format({
      html: function() {
        var isOwner = false;
        var id = parseInt(req.params.id);

        var nextPage = parseInt(req.query.page, 10) + 1 || 1;
        var prevPage = parseInt(req.query.page, 10) - 1 || 0;
        if (prevPage < 0) {
          prevPage = 0;
        }

        playlist.userRecent(req, function(err, playlists) {
          if (err) {
            res.redirect('/404');
          } else {
            if (req.session && req.session.username &&
              parseInt(req.session.userId, 10) === parseInt(req.params.id, 10)) {
              isOwner = true;
            }

            res.render('_playlists_user', {
              playlists: playlists.data,
              owner: playlists.owner,
              background: playlists.owner.background,
              isOwner: isOwner,
              currentHashPrev: '/#' + req.url.split('?')[0] + '?page=' + prevPage,
              currentHashNext: '/#' + req.url.split('?')[0] + '?page=' + nextPage,
              currentPage: parseInt(req.query.page, 10) || 0,
              analytics: nconf.get('analytics')
            });
          }
        });
      },
      json: function() {
        user.getUser(req, function(err, u) {
          if (!err) {
            res.send({
              title: 'moxboxx: user profile for ' + u.username,
              pageType: 'userProfile',
              background: u.background || nconf.get('background_default'),
            });
          }
        });
      }
    });
  });
};
