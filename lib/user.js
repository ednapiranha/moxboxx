'use strict';

var gravatar = require('gravatar');
var util = require('util');
var knox = require('knox');
var MultiPartUpload = require('knox-mpu');
var upload = null;

var USERNAME_MATCH = /[^A-Z0-9_]/gi;
var FILE_SIZE_MAX = 307200;
var DEFAULT_AVATAR = 'http://moxboxx.com/images/avatar.png';

var nconf = require('nconf');
var nconf = require('nconf');
var Sequelize = require('sequelize');

nconf.argv().env().file({ file: 'local.json' });

var sequelize = new Sequelize(
  nconf.get('database'),
  nconf.get('db_username'),
  nconf.get('db_password')
);

exports.modelize = function(sequelize) {
  var User = sequelize.define('user', {
    'username': {
      allowNull: false,
      unique: true,
      type: Sequelize.STRING,
      validate: {
        hasValidUsername: function(username) {
          var usernameCheck = username.replace(USERNAME_MATCH, '').trim();

          if (usernameCheck.length < 1 || usernameCheck.length > 20) {
            throw new Error('Username must be between 1-20 characters');
          }
        }
      }
    },
    'email': Sequelize.STRING,
    'location': Sequelize.STRING,
    'website': Sequelize.STRING,
    'background': Sequelize.STRING
  }, {
    timestamps: false,
    underscored: true,
  });

  User.sync();

  return User;
};

var User = exports.modelize(sequelize);

var updateUser = function(req, callback) {
  var username = req.body.username.replace(USERNAME_MATCH, '').trim();
  var id = req.session.userId;
  var website = req.body.website.trim();

  if (!website.match(/^http/) && website.length > 0) {
    website = 'http://' + website;
  }

  User.find({
    where: {
      email: req.session.email
    }
  }).success(function(user) {
    if (user) {
      user.username = req.body.username;
      user.location = req.body.location;
      user.website = website;

      var errors = user.validate();

      if (errors) {
        callback(errors.username[0]);
      } else {
        user.updateAttributes()
          .success(function() {
            callback(null, user);
          });
      }
    } else {
      var newUser = User.build({
        'username': username,
        'email': req.session.email,
        'location': req.body.location,
        'website': website
      });

      var errors = newUser.validate();

      if (errors) {
        callback(errors.username[0]);
      } else {
        User.create(newUser)
          .success(function() {
            callback(null, newUser);
          });
      }
    }
  }).error(function(err) {
    callback(err);
  });
};

var updateBackground = function(req, background) {
  User.find({
    where: {
      email: req.session.email
    }
  }).success(function(user) {
    if (user) {
      user.background = background;
      user.updateAttributes();
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
  User.find({
    where: {
      email: req.session.email
    }
  }).success(function(user) {
    if (!user) {
      callback(new Error('user not found'))
    } else {
      user.gravatar = gravatar.url(user.email, { d: DEFAULT_AVATAR });
      callback(null, user);
    }
  }).error(function(err) {
    callback(err);
  });
};

exports.saveProfile = function(req, callback) {
  updateUser(req, callback);
};

exports.get = function(id, callback) {
  User.find(id)
    .success(function(user) {
      callback(null, user);
  }).error(function() {
    callback(new Error('user not found'));
  });
};
