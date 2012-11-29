'use strict';

var util = require('util');
var knox = require('knox');
var MultiPartUpload = require('knox-mpu');
var upload = null;

var USERNAME_MATCH = /[^A-Z0-9_]/gi;
var FILE_SIZE_MAX = 102400;

var updateUserAttributes = function(req, username, id, profile, client, callback) {
  if (username.length > 0) {
    client.sadd('moxboxx:users:set:', username.toLowerCase());
  }
  if (req.session.username) {
    client.srem('moxboxx:users:set:', req.session.username.toLowerCase());
  }

  client.hmset('moxboxx:profile:hash:' + id, profile, function(err, resp) {
    if (err) {
      callback(err);
    } else {
      callback(null, profile);
    }
  });
};

var createUser = function(req, client, callback) {
  var username = '';

  client.incr('moxboxx:userCount', function(err, id) {
    if (err) {
      callback(err);
    } else {
      var profile = {
        id: id,
        username: username,
        email: req.session.email,
        location: '',
        website: '',
        background: ''
      };

      updateUserAttributes(req, username, id, profile, client, callback);
    }
  });
};

var updateUser = function(req, client, callback) {
  var username = req.body.username.replace(USERNAME_MATCH, '').trim();
  var id = req.session.userId;
  var website = req.body.website.trim();

  if (!website.match(/^http/) && website.length > 0) {
    website = 'http://' + website;
  }

  var profile = {
    username: username,
    location: req.body.location.trim(),
    website: website,
  };

  client.set('moxboxx:userKeys:' + req.session.email, id);
  updateUserAttributes(req, username, id, profile, client, callback);
};

exports.saveBackground = function(req, client, nconf, callback) {
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
        client.hset('moxboxx:profile:hash:' + req.session.userId, 'background', filename);
        callback(null, filename);
      }
    });
  } else {
    // delete file
    client.hset('moxboxx:profile:hash:' + req.session.userId, 'background', '');
    callback(null, '');
  }
};

exports.loadProfile = function(req, client, callback) {
  var self = this;

  if (parseInt(req.session.userId, 10) > 0) {
    this.get(req.session.userId, client, callback);
  } else if (req.session.email) {
    client.get('moxboxx:userKeys:' + req.session.email, function(err, resp) {
      if (resp) {
        var id = resp;
        self.get(id, client, callback);
      } else {
        req.body.username = '';
        createUser(req, client, callback);
      }
    });
  } else {
    req.body.username = '';
    createUser(req, client, callback);
  }
};

exports.saveProfile = function(req, client, callback) {
  var username = req.body.username.replace(USERNAME_MATCH, '').trim();
  var errors = [];

  if (username.length < 1 || username.length > 20) {
    errors.push(new Error('Username must be between 1-20 characters'));
  }

  client.sismember('moxboxx:users:set:', username, function(err, exists) {
    if (err) {
      callback(err);
    } else {
      if (exists && req.session.username !== username) {
        errors.push(new Error('Username already taken'));
      }

      if (errors.length > 0) {
        callback(errors);
      } else {
        updateUser(req, client, callback);
      }
    }
  });
};

exports.get = function(id, client, callback) {
  client.hgetall('moxboxx:profile:hash:' + id, function(err, user) {
    if (err) {
      callback(err);
    } else {
      if (user) {
        callback(null, user);
      } else {
        callback(new Error('No such user'));
      }
    }
  });
};
