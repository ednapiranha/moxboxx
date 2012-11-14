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
    client.hgetall('moxboxx:profile:' + req.session.userId, function(err, user) {
      if (err) {
        callback(err);
      } else {
        var user = {
          username: user.username
        };

        callback(null, user);
      }
    });
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

  if (errors.length > 0) {
    callback(errors);
  } else {
    createUser(req, client, callback);
  }
};
