'use strict';

process.env.NODE_ENV = 'test'

var mox = require('../lib/mox');
var user = require('../lib/user');
var playlist = require('../lib/playlist');

var should = require('should');
var qs = require('querystring');
var nock = require('nock');
var nconf = require('nconf');
var db = require('../lib/database');
var Mox  = db.getMox();
var User = db.getUser();

var playlistId;
var moxId;

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
    Mox.all()
      .success(function(moxes) {
        moxes.forEach(function(m) {
          m.destroy();
        });
      }).error(function(err) {
        throw new Error(err);
      });
    console.log('cleared test database');
  });

  it('adds a mox', function(done) {
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

        req.body.url = 'http://youtube.com/watch?v=123';
        req.body.playlist_id = playlistId;

        mox.add(req, function(err, m) {
          moxId = m.id;
          m.url.should.equal('http://youtube.com/watch?v=123');
          done();
        });
      });
    });
  });

  it('gets a mox', function(done) {
    req.params.id = moxId;

    mox.get(req, function(err, m) {
      should.exist(m);
      done();
    });
  });

  it('updates mox positions', function() {
    req.body.sort_arr = [
      {
        id: moxId,
        playlist_id: playlistId,
        pos: 1
      }
    ];

    mox.updatePositions(req);
  });

  it('deletes a mox', function() {
    req.body.id = moxId;

    mox.delete(req);
  });
});
