'use strict';

process.env.NODE_ENV = 'test'

var playlist = require('../lib/playlist');
var user = require('../lib/user');

var should = require('should');
var nock = require('nock');
var db = require('../lib/database');
var Playlist = db.getPlaylist();
var User = db.getUser();
var PlaylistStarred = db.getPlaylistStarred();

var nconf = require('nconf');
nconf.argv().env().file({ file: 'local-test.json' });

var playlistId;
var userId;

var req = {
  session: {
    email: 'test@test.com',
    username: 'test'
  },
  body: {
  },
  params: {
  }
};

describe('playlist', function() {
  after(function() {
    Playlist.all()
      .success(function(playlists) {
        playlists.forEach(function(p) {
          p.destroy();
        });
      }).error(function(err) {
        throw new Error(err);
      });
    console.log('cleared test database');
  });

  it('adds a playlist', function(done) {
    req.body.username = 'test';
    req.body.location = '';
    req.body.website = '';

    user.saveProfile(req, function(err, u) {
      req.body.title = 'test';
      req.body.description = '';
      req.session.userId = u.id;
      req.session.username = u.username;

      playlist.add(req, function(err, p) {
        p.title.should.equal('test');
        playlistId = p.id;
        done();
      });
    });
  });

  it('updates a playlist', function(done) {
    req.body.title = 'test2';
    req.body.description = '';
    req.params.id = playlistId;

    playlist.update(req, function(err, p) {
      p.title.should.equal('test2');
      done();
    });
  });

  it('stars/unstars a playlist', function(done) {
    req.body.id = playlistId;

    playlist.star(req, nconf, function(err, s) {
      s.should.equal(true);
      done();
    });
  });

  it('gets your recent starred', function(done) {
    playlist.recentStarred(req, function(err, s) {
      should.exist(s);
      done();
    });
  });

  it('gets recent global', function(done) {
    playlist.getGlobal(req, function(err, s) {
      should.exist(s);
      done();
    });
  });

  it('gets a playlist', function(done) {
    req.params.id = playlistId;
    playlist.get(req, function(err, s) {
      should.exist(s);
      done();
    });
  });

  it('updates a playlist', function(done) {
    req.params.id = playlistId;
    req.body.title = 'new title';
    playlist.update(req, function(err, s) {
      s.title.should.equal('new title');
      done();
    });
  });

  it('gets a recent playlist from a specific user', function(done) {
    req.params.id = req.session.userId;
    playlist.userRecent(req, function(err, p) {
      should.exist(p);
      done();
    });
  });

  it('adds a tag and gets recent playlists by the tag', function(done) {
    req.body.tag = 'tag';
    req.body.playlist_id = playlistId;
    playlist.addTag(req, function(err, tag) {
      req.params.tag = 'tag';
      playlist.getRecentByTag(req, function(err, p) {
        should.exist(p);
        done();
      });
    });
  });

  it('deletes a tag from a playlist', function() {
    req.params.id = playlistId;
    req.body.tag = 'tag';
    playlist.deleteTag(req);
  });

  it('deletes a playlist', function() {
    req.body.id = playlistId;
    playlist.delete(req);
  });

  it('does not update a playlist', function(done) {
    req.body.title = 'test3';
    req.body.description = '';
    req.session.userId = 0;
    req.params.id = playlistId;

    playlist.update(req, function(err, p) {
      should.not.exist(p);
      done();
    });
  });
});
