'use strict';

var gravatar = require('gravatar');

var mox = require('./mox');
var user = require('./user');
var utils = require('./utils');

var LIMIT = 20;

var dateDisplay = function(time) {
  var date = new Date(parseInt(time, 10));
  var diff = (Date.now() - date) / 1000;
  var dayDiff = Math.floor(diff / 86400);

  if (isNaN(dayDiff)) {
    return '';
  }

  if (dayDiff <= 0) {
    if (diff < 60) {
      return 'less than 1 minute';
    } else if (diff < 3600) {
      var minDiff = Math.floor(diff / 60);
      if (minDiff === 1) {
        return minDiff + ' minute ago';
      } else {
        return minDiff + ' minutes ago';
      }
    } else {
      var hourDiff = Math.floor(diff / 3600);
      if (hourDiff === 1) {
        return Math.floor(diff / 3600) + ' hour ago';
      } else {
        return Math.floor(diff / 3600) + ' hours ago';
      }
    }
  } else {
    if (dayDiff === 1) {
      return dayDiff + ' day ago';
    } else {
      return dayDiff + ' days ago';
    }
  }
};

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

      client.hmset('moxboxx:playlist:hash:' + id, playlist, function(err, resp) {
        if (err) {
          callback(err);
        } else {
          client.lpush('moxboxx:user:playlists:list:' + req.session.userId, id);
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
        created: dateDisplay(plist.created)
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
  client.hgetall('moxboxx:playlist:hash:' + req.params.id, function(err, plist) {
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

  client.lrange('moxboxx:user:playlists:list:' + req.session.userId, 0, LIMIT + 1,
    function(err, playlistIds) {

    if (err) {
      callback(err);
    } else {
      var recentPlaylist = [];

      if (playlistIds.length > 0) {
        playlistIds.forEach(function(playlistId) {
          req.params.id = playlistId;

          self.get(req, client, function(err, plist) {
            recentPlaylist.push(plist);

            if (recentPlaylist.length === playlistIds.length) {
              callback(null, recentPlaylist);
            }
          });
        });
      } else {
        callback(null, recentPlaylist);
      }
    }
  });
};

exports.delete = function(req, client) {
  var id = parseInt(req.body.id, 10);

  utils.isOwner(req.session.userId, id, client, function(err, resp) {
    if (err) {
      callback(err);
    } else {
      client.lrange('moxboxx:playlist:moxes:list:' + id, 0, -1, function(err, moxIds) {
        if (err) {
          throw new Error('Could not get playlist items ', id);
        } else {
          var moxCount = 0;

          if (moxIds.length > 0) {
            moxIds.forEach(function(moxId) {
              req.body.playlist_id = id;
              req.body.id = moxId;

              mox.delete(req, client);

              if (++moxCount === moxIds.length) {
                client.del('moxboxx:user:playlists:list:' + req.session.userId);
                client.del('moxboxx:playlist:hash:' + id);
              }
            });
          }
        }
      });
    }
  });
};
