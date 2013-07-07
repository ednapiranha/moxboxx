'use strict';

process.env.NODE_ENV = 'test'

var user = require('../lib/user');

var should = require('should');
var nock = require('nock');
var nconf = require('nconf');
var db = require('../lib/database');
var User = db.getUser();

nconf.argv().env().file({ file: 'local-test.json' });

var req = {
  session: {
    email: 'test@test.com',
    userId: 1,
    username: 'test'
  },
  body: {
    username: '',
    location: '',
    website: ''
  }
};

describe('user', function() {
  after(function() {
    User.all()
      .success(function(users) {
        users.forEach(function(u) {
          u.destroy();
        });
      }).error(function(err) {
        throw new Error(err);
      });
    console.log('cleared test database');
  });

  it('saves a profile with a valid username', function(done) {
    req.body.username = 'test';
    req.body.location = '';

    user.saveProfile(req, function(err, u) {
      u.username.should.equal('test');
      done();
    });
  });

  it('loads an existing profile', function(done) {
    req.session.email = 'test@test.com';
    user.loadProfile(req, function(err, u) {
      u.username.should.equal('test');
      done();
    });
  });

  it('does not load an existing profile', function(done) {
    req.body.username = 'test';
    req.body.location = '';

    user.saveProfile(req, function(err, u) {
      u.username.should.equal('test');
      done();
    });
  });

  it('saves an existing profile', function(done) {
    req.body.location = 'the moon';
    user.saveProfile(req, function(err, u) {
      u.location.should.equal('the moon');
      done();
    });
  });

  it('does not save an existing profile', function(done) {
    req.body.username = '';
    user.saveProfile(req, function(err, u) {
      should.exist(err);
      done();
    });
  });

  it('rejects a background image', function(done) {
    var scope = nock('https://s3.amazonaws.com/moxboxx_dev');
    var file = {
      background: {
        size: 100000000,
        path: '/path/to/test.jpg',
        name: 'test.jpg'
      }
    };

    req.files = file;

    user.saveBackground(req, nconf, function(err, background) {
      background.should.equal('');
      done();
    });
  });
});
