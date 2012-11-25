'use strict';

var util = require('util');

var createUser = function(req, client, callback) {
  var username = req.body.username.replace(/[^A-Z0-9-_]/gi, '').trim();
  util.print('got here', req.session.userId)

  client.incr('moxboxx:userCount', function(err, id) {
    if (err) {
      callback(err);
    } else {
      var profile = {
        id: id,
        username: username || '',
        email: req.session.email
      };

      client.sadd('moxboxx:users:set:', username.toLowerCase());
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
    }
  });
};

var updateUser = function(req, client, callback) {
  var username = req.body.username.replace(/[^A-Z0-9-_]/gi, '').trim();
  var id = req.session.userId;

  var profile = {
    username: username
  };

  client.sadd('moxboxx:users:set:', username.toLowerCase());
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

exports.loadProfile = function(req, client, callback) {
  if (parseInt(req.session.userId, 10) > 0) {
    this.get(req.session.userId, client, callback);
  } else {
    req.body.username = '';
    createUser(req, client, callback);
  }
};

exports.saveProfile = function(req, client, callback) {
  var username = req.body.username.replace(/[^A-Z0-9-_]/gi, '').trim();
  var errors = [];

  if (username.length < 1) {
    errors.push(new Error('Username is invalid'));
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
        var user = {
          id: user.id,
          username: user.username,
          email: user.email
        };

        callback(null, user);
      } else {
        callback(new Error('No such user'));
      }
    }
  });
};
