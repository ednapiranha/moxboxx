'use strict';

module.exports = function(app, nconf, isLoggedIn) {
  var playlist = require('../lib/playlist');
  var mox = require('../lib/mox');

  app.post('/mox', isLoggedIn, function (req, res) {
    mox.add(req, function(err, mox) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ mox: mox });
      }
    });
  });

  app.get('/bookmarklet', isLoggedIn, function (req, res) {
    req.params.id = req.session.userId;
    playlist.userRecent(req, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        playlists.data.sort(function(a, b) {
          if (a.title < b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
          return 0;
        });

        res.render('bookmarklet', {
          pageType: 'bookmarklet',
          error: req.query.error || '',
          errorMsg: req.query.msg || '',
          playlists: playlists.data,
          background: req.session.background || nconf.get('background_default'),
          analytics: nconf.get('analytics')
        });
      }
    });
  });

  app.post('/mini/mox', isLoggedIn, function (req, res) {
    mox.add(req, function(err, mox) {
      if (err) {
        res.redirect('/bookmarklet?error=1&msg=' + err);
      } else {
        res.redirect('/bookmarklet?success=1');
      }
    });
  });

  app.delete('/mox', isLoggedIn, function (req, res) {
    mox.delete(req);
    res.json({ message: 'deleted' });
  });

  app.post('/mox/position', isLoggedIn, function (req, res) {
    mox.updatePositions(req);
  });
};
