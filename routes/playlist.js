'use strict';

module.exports = function(app, nconf, isLoggedIn, hasUsername) {
  var user = require('../lib/user');
  var playlist = require('../lib/playlist');
  var mox = require('../lib/mox');

  app.get('/playlist/new', isLoggedIn, hasUsername, function (req, res) {
    res.render('new', {
      pageType: 'new',
      session: req.session,
      background: req.session.background || nconf.get('background_default')
    });
  });

  app.get('/playlists/starred', isLoggedIn, hasUsername, function (req, res) {
    playlist.recentStarred(req, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('starred', {
          pageType: 'starred',
          playlists: playlists,
          background: req.session.background || nconf.get('background_default')
        });
      }
    });
  });

  app.post('/playlist/star/', isLoggedIn, hasUsername, function (req, res) {
    playlist.star(req, function(err, resp) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        if (req.body.starred === 'true') {
          res.json({ 'message': 'unstarred' });
        } else {
          res.json({ 'message': 'starred' });
        }
      }
    });
  });

  app.post('/playlist', isLoggedIn, hasUsername, function (req, res) {
    playlist.add(req, function(err, p) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ url: '/playlist/' + p.id });
      }
    });
  });

  app.get('/playlist/:id', function (req, res) {
    playlist.get(req, function(err, p) {
      if (err) {
        res.redirect('/404');
      } else {
        var isOwner = false;

        if (req.session && req.session.email &&
          parseInt(p.owner.id, 10) === parseInt(req.session.userId, 10)) {
          isOwner = true;
        }

        res.render('playlist', {
          pageType: 'playlist',
          playlist: p,
          moxes: p.moxes,
          isOwner: isOwner,
          background: p.owner.background || nconf.get('background_default')
        });
      }
    });
  });

  app.post('/playlist/:id', isLoggedIn, hasUsername, function(req, res) {
    playlist.update(req, function(err, playlist) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ 'message': 'updated' });
      }
    });
  });

  app.get('/tag/:tag', function(req, res) {
    playlist.getRecentByTag(req, function(err, playlists) {
      if (err) {
        res.redirect('/500');
      } else {
        res.render('tagged', {
          pageType: 'tagged',
          tag: req.params.tag.trim().toLowerCase(),
          playlists: playlists || [],
          background: req.session.background || nconf.get('background_default')
        });
      }
    });
  });

  app.delete('/playlist', isLoggedIn, hasUsername, function(req, res) {
    playlist.delete(req);
    res.json({ message: 'deleted' });
  });

  app.post('/tag', isLoggedIn, hasUsername, function(req, res) {
    playlist.addTag(req, function(err, tag) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        res.json({ 'message': 'added tag' });
      }
    });
  });

  app.delete('/tag/:id', isLoggedIn, hasUsername, function(req, res) {
    playlist.deleteTag(req);
    res.json({ message: 'deleted' });
  });
};
