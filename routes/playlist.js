'use strict';

module.exports = function(app, nconf, isLoggedIn, hasUsername, isAjaxRequest) {
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

  app.get('/playlists/starred', isLoggedIn, hasUsername, isAjaxRequest, function (req, res) {
    res.format({
      html: function() {
        playlist.recentStarred(req, function(err, playlists) {
          if (err) {
            res.redirect('/500');
          } else {
            var nextPage = parseInt(req.query.page, 10) + 1 || 1;
            var prevPage = parseInt(req.query.page, 10) - 1 || 0;
            if (prevPage < 0) {
              prevPage = 0;
            }
          }

          res.render('_starred', {
            playlists: playlists,
            currentHashPrev: '/#' + req.url.split('?')[0] + '?page=' + prevPage,
            currentHashNext: '/#' + req.url.split('?')[0] + '?page=' + nextPage,
            currentPage: parseInt(req.query.page, 10) || 0
          });
        });
      },
      json: function() {
        res.send({
          title: 'moxboxx: your starred',
          pageType: 'starred',
          background: req.session.background || nconf.get('background_default'),
        });
      }
    });
  });

  app.post('/playlist/star/', isLoggedIn, hasUsername, function (req, res) {
    playlist.star(req, nconf, function(err, resp) {
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
        res.json({ url: '/playlist/edit/' + p.id });
      }
    });
  });

  app.get('/playlist/:id', isAjaxRequest, function (req, res) {
    res.format({
      html: function() {
        playlist.get(req, function(err, p) {
          if (err) {
            res.redirect('/404');
          } else {
            var isOwner = false;

            playlist.addViewCount(req, p);

            if (req.session && req.session.email &&
              parseInt(p.owner.id, 10) === parseInt(req.session.userId, 10)) {
              isOwner = true;
            }

            var nextPage = parseInt(req.query.page, 10) + 1 || 1;
            var prevPage = parseInt(req.query.page, 10) - 1 || 0;
            if (prevPage < 0) {
              prevPage = 0;
            }

            res.render('_playlist', {
              playlist: p,
              moxes: p.moxes,
              isOwner: isOwner,
              currentHashPrev: '/#' + req.url.split('?')[0] + '?page=' + prevPage,
              currentHashNext: '/#' + req.url.split('?')[0] + '?page=' + nextPage,
              currentPage: parseInt(req.query.page, 10) || 0
            });
          }
        });
      },
      json: function() {
        playlist.get(req, function(err, p) {
          if (!err) {
            res.send({
              playlist: p,
              title: 'moxboxx: ' + p.title,
              pageType: 'playlist',
              background: p.background || p.owner.background || nconf.get('background_default'),
            });
          }
        });
      }
    });
  });

  app.get('/playlist/edit/:id', isLoggedIn, hasUsername, function (req, res) {
    playlist.get(req, function(err, p) {
      if (err) {
        res.redirect('/404');
      } else {
        if (req.session && req.session.email &&
          parseInt(p.owner.id, 10) === parseInt(req.session.userId, 10)) {

          res.render('edit', {
            pageType: 'playlist-edit',
            playlist: p,
            moxes: p.moxes,
            isOwner: true,
            background: p.background || req.session.background || nconf.get('background_default')
          });
        } else {
          res.redirect('/playlist/' + p.id);
        }
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

  app.get('/tag/:tag', isAjaxRequest, function(req, res) {
    res.format({
      html: function() {
        playlist.getRecentByTag(req, function(err, playlists) {
          if (err) {
            res.redirect('/500');
          } else {
            var nextPage = parseInt(req.query.page, 10) + 1 || 1;
            var prevPage = parseInt(req.query.page, 10) - 1 || 0;
            if (prevPage < 0) {
              prevPage = 0;
            }
          }

          res.render('_tagged', {
            tag: req.params.tag.trim().toLowerCase(),
            playlists: playlists || [],
            currentHashPrev: '/#' + req.url.split('?')[0] + '?page=' + prevPage,
            currentHashNext: '/#' + req.url.split('?')[0] + '?page=' + nextPage,
            currentPage: parseInt(req.query.page, 10) || 0
          });
        });
      },
      json: function() {
        res.send({
          title: 'moxboxx: tagged with ' + req.params.tag,
          pageType: 'tagged',
          background: req.session.background || nconf.get('background_default'),
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

  app.post('/playlist/set/background', isLoggedIn, hasUsername, function(req, res) {
    playlist.saveBackground(req, nconf, function(err, background) {
      if (err) {
        res.redirect('/playlist/edit/' + req.body.playlist_id + '?error=1');
      } else {
        res.redirect('/playlist/edit/' + req.body.playlist_id);
      }
    });
  });

  app.post('/playlist/reset/background', isLoggedIn, hasUsername, function(req, res) {
    req.body.background = '';
    playlist.saveBackground(req, nconf, function(err, background) {
      if (err) {
        res.redirect('/playlist/edit/' + req.body.playlist_id + '?error=1');
      } else {
        res.redirect('/playlist/edit/' + req.body.playlist_id);
      }
    });
  });

  app.delete('/tag/:id', isLoggedIn, hasUsername, function(req, res) {
    playlist.deleteTag(req);
    res.json({ message: 'deleted' });
  });
};
