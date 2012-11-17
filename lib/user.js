'use strict';

var createUser = function(req, client, callback) {
  var username = req.body.username.replace(/[^A-Z0-9-_]/gi, '').trim();

  client.incr('moxboxx:userCount', function(err, id) {
    if (err) {
      callback(err);
    } else {
      var profile = {
        id: id,
        username: username || '',
        email: req.session.email
      };

      client.sadd('moxboxx:users', username.toLowerCase());
      if (req.session.username) {
        client.srem('moxboxx:users', req.session.username.toLowerCase());
      }

      client.hmset('moxboxx:profile:' + id, profile, function(err, resp) {
        if (err) {
          callback(err);
        } else {
          callback(null, profile);
        }
      });
    }
  });
};

exports.loadProfile = function(req, client, callback) {
  if (req.session.userId) {
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

  client.sismember('moxboxx:users', username, function(err, exists) {
    if (err) {
      callback(err);
    } else {
      if (exists && req.session.username !== username) {
        errors.push(new Error('Username already taken'));
      }

      if (errors.length > 0) {
        callback(errors);
      } else {
        createUser(req, client, callback);
      }
    }
  });
};

exports.get = function(id, client, callback) {
  client.hgetall('moxboxx:profile:' + id, function(err, user) {
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
