'use strict';

var gravatar = require('gravatar');

var user = require('./user');

var LIMIT = 20;

var incrPlaylist = function(req, title, client, callback) {
  client.incr('moxboxx:playlistCount', function(err, id) {
    if (err) {
      callback(err);
    } else {
      var playlist = {
        id: id,
        title: title || 'Untitled',
        owner: req.session.userId,
        created: new Date().getTime()
      };

      client.hmset('moxboxx:playlist:' + id, playlist, function(err, resp) {
        if (err) {
          callback(err);
        } else {
          client.lpush('moxboxx:user:playlists:' + req.session.userId, id);
          callback(null, playlist);
        }
      });
    }
  });
};

var getUser = function(client, plist, callback) {
  user.get(plist.owner, client, function(err, userResp) {
    if (err) {
      callback(err);
    } else {
      var owner = {
        id: userResp.id,
        username: userResp.username,
        gravatar: gravatar.url(userResp.email)
      };

      var playlist = {
        id: plist.id,
        title: plist.title,
        owner: owner,
        created: plist.created
      };

      callback(null, playlist);
    }
  });
};

exports.add = function(req, client, callback) {
  var title = req.body.title.trim();
  var errors = [];

  if (title.length < 1) {
    errors.push(new Error('Title cannot be empty'));
  }

  if (errors.length > 0) {
    callback(errors);
  } else {
    incrPlaylist(req, title, client, callback);
  }
};

exports.get = function(req, client, callback) {
  client.hgetall('moxboxx:playlist:' + req.params.id, function(err, plist) {
    if (err) {
      callback(err);
    } else {
      if (plist) {
        getUser(client, plist, callback);
      } else {
        callback(null, true);
      }
    }
  });
};

exports.yourRecent = function(req, client, callback) {
  var self = this;

  client.lrange('moxboxx:user:playlists:' + req.session.userId, 0, LIMIT + 1,
    function(err, playlistIds) {

    if (err) {
      callback(err);
    } else {
      var recentPlaylist = [];

      playlistIds.forEach(function(playlistId) {
        process.nextTick(function() {
          req.params.id = playlistId;
          self.get(req, client, function(err, plist) {
            recentPlaylist.push(plist);

            if (recentPlaylist.length === playlistIds.length) {
              callback(null, recentPlaylist);
            }
          });
        });
      });
    }
  });
};
