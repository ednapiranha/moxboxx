module.exports = function(app, client, isLoggedIn, hasUsername) {
  var user = require('../lib/user');
  var playlist = require('../lib/playlist');
  var mox = require('../lib/mox');

  app.get('/', function (req, res) {
    if (req.session.email) {
      if (req.session.username) {
        res.redirect('/dashboard');
      } else {
        res.redirect('/profile');
      }
    } else {
      res.render('index', {
        pageType: 'index',
        session: req.session
      });
    }
  });

  app.get('/profile', isLoggedIn, function (req, res) {
    user.loadProfile(req, client, function(err, user) {
      if (!err) {
        req.session.username = user.username;
      }

      res.render('profile', {
        pageType: 'profile',
        session: req.session
      });
    });
  });

  app.post('/profile', isLoggedIn, function(req, res) {
    user.saveProfile(req, client, function(err, user) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ message: 'Profile has been updated!' });
      }
    });
  });

  app.get('/dashboard', isLoggedIn, hasUsername, function (req, res) {
    res.render('dashboard', {
      pageType: 'dashboard',
      session: req.session
    });
  });

  app.get('/playlist/new', isLoggedIn, hasUsername, function (req, res) {
    res.render('new', {
      pageType: 'new',
      session: req.session
    });
  });

  app.post('/playlist', isLoggedIn, hasUsername, function (req, res) {
    playlist.add(req, client, function(err, playlist) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ url: '/playlist/' + playlist.id });
      }
    });
  });

  app.get('/playlist/:id', function (req, res) {
    playlist.get(req, client, function(err, playlist) {
      if (req.params.id !== 'undefined') {
        if (err) {
          res.redirect('/500');
        } else {
          var moxes = [];

          mox.allByPlaylistId(req, client, function(err, moxes) {
            moxes = moxes.sort(function(a, b) {
              return parseInt(b.id, 10) - parseInt(a.id, 10);
            });

            if (err) {
              res.status(500);
              res.json({ message: err.toString() });
            } else {
              res.render('playlist', {
                pageType: 'playlist',
                session: req.session,
                playlist: playlist,
                moxes: moxes
              });
            }
          });
        }
      }
    });
  });

  app.get('/playlists', isLoggedIn, hasUsername, function(req, res) {
    playlist.yourRecent(req, client, function(err, playlists) {
      if (err) {
        //res.redirect('/500');
      } else {
        res.render('playlists', {
          pageType: 'playlists',
          session: req.session,
          playlists: playlists
        });
      }
    });
  });

  app.post('/mox', isLoggedIn, hasUsername, function (req, res) {
    mox.add(req, client, function(err, mox) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ mox: mox });
      }
    });
  });
};