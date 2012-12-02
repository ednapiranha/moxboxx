'use strict';

var util = require('util');
var knox = require('knox');
var MultiPartUpload = require('knox-mpu');
var upload = null;

var USERNAME_MATCH = /[^A-Z0-9_]/gi;
var FILE_SIZE_MAX = 102400;

var nconf = require('nconf');
var orm = require('orm');

nconf.argv().env().file({ file: 'local.json' });


orm.connect('mysql://' + nconf.get('db_username') + ':' +
  nconf.get('db_password') + '@localhost/' + nconf.get('database'), function(success, db) {
    if (!success) {
    throw new Error('Could not connect to the database');
  }

  var User = db.define('user', {
    'username': { 'type': 'string' },
    'email': { 'type': 'string' },
    'location': { 'type': 'string' },
    'website': { 'type': 'string' },
    'background': { 'type': 'string' }
  });

  //User.sync();

  var addUser = function(email, callback) {
    User.find({ 'email': email }, function(user) {
      if (!user) {
        var newUser = new User({
          'username': '',
          'email': email
        });

        newUser.save(function(err, u) {
          if (err) {
            callback(err);
          } else {
            callback(null, u);
          }
        });
      } else {
        callback(null, u);
      }
    });
  };

  var checkUsername = function(username, callback) {
    User.find({ 'username': username }, function(user) {
      if (user) {
        callback(new Error('username already taken'));
      } else {
        callback(null, true);
      }
    });
  };

  var updateUser = function(req, callback) {
    var username = req.body.username.replace(USERNAME_MATCH, '').trim();
    var id = req.session.userId;
    var website = req.body.website.trim();

    if (!website.match(/^http/) && website.length > 0) {
      website = 'http://' + website;
    }

    User.find({ 'email': req.session.email }, function(user) {
      if (user) {
        var editUser = new User({
          id: req.session.userId,
          username: req.body.username,
          location: req.body.location,
          website: website
        });

        editUser.save(user, function(err, u) {
          if (err) {
            callback(err);
          } else {
            callback(null, u);
          }
        });
      } else {
        callback(new Error('user not found'));
      }
    });
  };

  var updateBackground = function(background) {
    User.find({ 'email': req.session.email }, function(user) {
      if (user) {
        user.background = background;

        User.save(user, function(err, u) {
          if (err) {
            throw new Error('could not save background');
          }
        });
      } else {
        throw new Error('user not found');
      }
    });
  };

  exports.saveBackground = function(req, nconf, callback) {
    if (req.files && req.files.background &&
      req.files.background.size > 0 && req.files.background.size < FILE_SIZE_MAX) {
      var filename = (new Date().getTime().toString()) + req.files.background.name;
      var s3 = knox.createClient({
        key: nconf.get('s3_key'),
        secret: nconf.get('s3_secret'),
        bucket: nconf.get('s3_bucket')
      });

      upload = new MultiPartUpload({
        client: s3,
        objectName: filename,
        file: req.files.background.path

      }, function(err, res) {
        if (err) {
          callback(err);

        } else {
          filename = nconf.get('s3_url') + filename;
          updateBackground(filename);
          callback(null, filename);
        }
      });
    } else {
      // delete file
      updateBackground('');
      callback(null, '');
    }
  };

  exports.loadProfile = function(req, callback) {
    var self = this;
    var email = req.session.email.toLowerCase();

    if (req.session.userId && parseInt(req.session.userId, 10) > 0) {
      getUser(req.session.userId, callback);
    } else {
      addUser(email, callback);
    }
  };

  exports.saveProfile = function(req, callback) {
    var username = req.body.username.replace(USERNAME_MATCH, '').trim().toLowerCase();
    var errors = [];

    if (username.length < 1 || username.length > 20) {
      errors.push(new Error('Username must be between 1-20 characters'));
    }

    checkUsername(username, function(err, resp) {
      if (err) {
        callback(err);
      } else {
        if (errors.length > 0) {
          callback(errors);
        } else {
          updateUser(req, callback);
        }
      }
    });
  };

  exports.get = function(id, callback) {
    User.get(id, function(user) {
      if (!user) {
        callback(new Error('user not found'));
      } else {
        callback(null, user);
      }
    });
  };
});
