'use strict';

var gravatar = require('gravatar');
var util = require('util');
var knox = require('knox');
var MultiPartUpload = require('knox-mpu');
var upload = null;
var db = require('./database');
var User = db.getUser();

var USERNAME_MATCH = /[^A-Z0-9_]/gi;
var FILE_SIZE_MAX = 307200;
var DEFAULT_AVATAR = 'http://moxboxx.com/images/avatar.png';

var updateBackground = function(req, background) {
  User.find({
    where: {
      email: req.session.email
    }}).success(function(user) {
      if (user) {
        user.id = parseInt(user.id, 10);
        user.background = background;
        user.save();
      } else {
        throw new Error('user not found');
      }
    });
};

exports.getUser = function(req, callback) {
  User.find(parseInt(req.params.id, 10))
    .success(function(u) {
      callback(null, u);
    }).error(function(err) {
      callback(err);
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
        updateBackground(req, filename);
        callback(null, filename);
      }
    });
  } else {
    // delete file
    updateBackground(req, '');
    callback(null, '');
  }
};

exports.loadProfile = function(req, callback) {
  User.find({
    where: {
      email: req.session.email
    }}).success(function(user) {
      if (!user) {
        callback(new Error('user not found'));
      } else {
        user.gravatar = gravatar.url(user.email, { d: DEFAULT_AVATAR });
        callback(null, user);
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.saveProfile = function(req, callback) {
  var username = req.body.username.replace(USERNAME_MATCH, '').trim();
  var website = req.body.website.trim();

  if (!website.match(/^http/) && website.length > 0) {
    website = 'http://' + website;
  }

  User.find({
    where: {
      email: req.session.email
    }}).success(function(user) {
      if (user) {
        user.id = parseInt(user.id, 10);
        user.username = username;
        user.location = req.body.location;
        if (req.body.email_starred) {
          user.email_starred = 1;
        } else {
          user.email_starred = 0;
        }
        user.website = website;

        var errors = user.validate();

        if (errors) {
          callback(errors.username);
        } else {
          user.save()
            .success(function() {
              callback(null, user);
            }).error(function(err) {
              callback(err);
            });
        }
      } else {
        var newUser = User.build({
          'username': username,
          'email': req.session.email,
          'location': req.body.location,
          'website': website,
          'email_starred': 0
        });

        if (req.body.email_starred) {
          newUser.email_starred = 1;
        }

        newUser.save()
          .success(function() {
            callback(null, newUser);
          }).error(function(err) {
            callback(err);
          });
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.get = function(id, callback) {
  User.find(id)
    .success(function(user) {
      if (!user) {
        callback(new Error('user not found'));
      } else {
        callback(null, user);
      }
    }).error(function(err) {
      callback(err);
    });
};
