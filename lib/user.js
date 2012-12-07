'use strict';

var gravatar = require('gravatar');
var util = require('util');
var knox = require('knox');
var MultiPartUpload = require('knox-mpu');
var upload = null;
var User = require('./database').getUser();;

var USERNAME_MATCH = /[^A-Z0-9_]/gi;
var FILE_SIZE_MAX = 307200;
var DEFAULT_AVATAR = 'http://moxboxx.com/images/avatar.png';

var nconf = require('nconf');
console.log(User)
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
        location: req.body.location,
        website: website
      });

      if (username && username !== req.session.username) {
        editUser.username = username;
      }

      editUser.save(req.session, function(err) {
        if (err) {
          callback(err.msg);
        } else {
          callback(null, editUser);
        }
      });
    } else {
      var newUser = new User({
        'username': username,
        'email': req.session.email,
        'location': req.body.location,
        'website': website
      });

      newUser.save('', function(err) {
        if (err) {
          callback(err.msg);
        } else {
          callback(null, newUser);
        }
      });
    }
  });
};

var updateBackground = function(req, background) {
  User.find({ 'email': req.session.email }, function(user) {
    if (user) {
      var editUser = new User({
        id: req.session.userId,
        background: background
      });

      editUser.save();
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
  User.find({ 'email': req.session.email }, function(user) {
    if (!user) {
      callback(new Error('user not found'));
    } else {
      user[0].gravatar = gravatar.url(user[0].email, { d: DEFAULT_AVATAR });
      callback(null, user[0]);
    }
  });
};

exports.saveProfile = function(req, callback) {
  updateUser(req, callback);
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
