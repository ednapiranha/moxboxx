'use strict';

var should = require('should');
var qs = require('querystring');
var nock = require('nock');
var nconf = require('nconf');

nconf.argv().env().file({ file: 'test/local-test.json' });

var req = {
  session: {
    email: 'test@test.com',
    userId: 1,
    username: 'test'
  }
};

describe('user', function() {
  var user = require('../lib/user');
  it('saves a background image', function(done) {
    var scope = nock('https://s3.amazonaws.com')
      .post('/moxboxx_dev')
      .reply(200, 'test.jpg');
    var file = {
      background: {
        size: 1000,
        name: 'test.jpg'
      }
    };

    req.files = file;

    user.saveBackground(req, nconf, function(err, background) {
      if (err) {
        throw new Error('Could not save background image');
      } else {
        background.should.exist();
      }
      console.log(background)

      done();
    });
    done();
  });

});
