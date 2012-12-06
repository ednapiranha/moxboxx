'use strict';

module.exports = function(app, nconf, isLoggedIn, hasUsername) {
  var playlist = require('../lib/playlist');
  var mox = require('../lib/mox');

  app.post('/mox', isLoggedIn, hasUsername, function (req, res) {
    mox.add(req, function(err, mox) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ mox: mox });
      }
    });
  });

  app.get('/bookmarklet', isLoggedIn, hasUsername, function (req, res) {
    playlist.yourRecent(req, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('bookmarklet', {
          pageType: 'bookmarklet',
          playlists: playlists,
          background: req.session.background || nconf.get('background_default')
        });
      }
    });
  });

  app.post('/mini/mox', isLoggedIn, hasUsername, function (req, res) {
    mox.add(req, function(err, mox) {
      if (err) {
        res.redirect('/bookmarklet?error=1');
      } else {
        res.redirect('/bookmarklet?sucess=1');
      }
    });
  });

  app.delete('/mox', isLoggedIn, hasUsername, function (req, res) {
    mox.delete(req);
    res.json({ message: 'deleted' });
  });

  app.post('/mox/position', isLoggedIn, hasUsername, function (req, res) {
    mox.updatePositions(req);
  });
};
