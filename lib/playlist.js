'use strict';

var gravatar = require('gravatar');

var mox = require('./mox');
var user = require('./user');
var utils = require('./utils');

var LIMIT = 40;

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
          client.lpush('moxboxx:global:playlists:list', id);
          client.lpush('moxboxx:user:playlists:list:' + req.session.userId, id);
          callback(null, playlist);
        }
      });
    }
  });
};

var getUser = function(req, client, plist, callback) {
  user.get(plist.owner, client, function(err, userResp) {
    if (err) {
      callback(err);
    } else {
      var isStarred = false;

      client.sismember('moxboxx:starred:playlist:user:set:' + req.session.userId, plist.id, function(err, resp) {
        if (err) {
          callback(err);
        } else {
          if (resp) {
            isStarred = true;
          }

          var owner = {
            id: userResp.id,
            username: userResp.username,
            gravatar: gravatar.url(userResp.email),
            background: userResp.background
          };

          var playlist = {
            id: plist.id,
            title: plist.title,
            owner: owner,
            created: dateDisplay(plist.created),
            isStarred: isStarred
          };
          callback(null, playlist);
        }
      });
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

exports.star = function(req, client, callback) {
  var id = parseInt(req.body.id, 10);

  client.sismember('moxboxx:starred:playlist:user:set:' + req.session.userId, id, function(err, resp) {
    if (err) {
      callback(err);
    } else {
      // Is a member, unstar
      if (resp) {
        client.lrem('moxboxx:starred:playlist:user:list:' + req.session.userId, 0, id);
        client.srem('moxboxx:starred:playlist:user:set:' + req.session.userId, id);
      // Is not a member, star
      } else {
        client.lpush('moxboxx:starred:playlist:user:list:' + req.session.userId, id);
        client.sadd('moxboxx:starred:playlist:user:set:' + req.session.userId, id);
      }

      callback(null, true);
    }
  });
};

exports.recentStarred = function(req, client, callback) {
  var self = this;

  client.lrange('moxboxx:starred:playlist:user:list:' + req.session.userId, 0, LIMIT + 1,
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

exports.getGlobal = function(req, client, callback) {
  var self = this;

  client.lrange('moxboxx:global:playlists:list', 0, LIMIT + 1,
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

exports.get = function(req, client, callback) {
  client.hgetall('moxboxx:playlist:hash:' + req.params.id, function(err, plist) {
    if (err) {
      callback(err);
    } else {
      if (plist) {
        getUser(req, client, plist, callback);
      } else {
        callback(null, true);
      }
    }
  });
};

exports.update = function(req, client, callback) {
  var title = req.body.title.trim();
  var self = this;
  var id = parseInt(req.params.id, 10);
  var errors = [];

  utils.isOwner(req.session.userId, id, client, function(err, resp) {
    if (err) {
      throw new Error('User has no permission to update playlist ', id);

    } else {
      if (title.length < 1) {
        errors.push(new Error('Title cannot be empty'));
      }

      if (errors.length > 0) {
        callback(errors);
      } else {
        client.hset('moxboxx:playlist:hash:' + req.params.id, 'title', title, function(err, resp) {
          if (err) {
            callback(new Error('Error updating playlist ', id));
          } else {
            callback(null, true);
          }
        });
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

exports.userRecent = function(req, client, callback) {
  var self = this;
  var id = parseInt(req.params.id, 10);

  user.get(id, client, function(err, user) {
    if (err) {
      callback(err);
    } else {
      client.lrange('moxboxx:user:playlists:list:' + id, 0, LIMIT + 1,
        function(err, playlistIds) {

        if (err) {
          callback(err);
        } else {
          var recentPlaylist = {
            owner: {
              id: user.id,
              username: user.username,
              gravatar: gravatar.url(user.email),
              location: user.location,
              website: user.website,
              background: user.background
            },
            data: []
          };

          if (playlistIds.length > 0) {
            playlistIds.forEach(function(playlistId) {
              req.params.id = playlistId;

              self.get(req, client, function(err, plist) {
                recentPlaylist.data.push(plist);

                if (recentPlaylist.data.length === playlistIds.length) {
                  callback(null, recentPlaylist);
                }
              });
            });
          } else {
            callback(null, recentPlaylist);
          }
        }
      });
    }
  });
};

var deleteStarred = function(id, client) {
  client.keys('moxboxx:starred:playlist:user:set:*', function(err, userIds) {
    if (err) {
      throw new Error('Could not retrieve starred playlist from user ', err);
    } else {
      userIds.forEach(function(user) {
        var userId = user.toString().split(':')
        userId = userId[userId.length - 1];
        console.log(userId)
        client.srem('moxboxx:starred:playlist:user:set:' + userId, id, function(err, resp) {
          if (err) {
            throw new Error('Could not delete starred playlist set from user ', err);
          } else {
            client.lrem('moxboxx:starred:playlist:user:list:' + userId, 0, id, function(err, resp) {
              if (err) {
                throw new Error('Could not delete starred playlist list from user ', err);
              }
            });
          }
        });
      });
    }
  });
};

exports.delete = function(req, client) {
  var id = parseInt(req.body.id, 10);

  utils.isOwner(req.session.userId, id, client, function(err, resp) {
    if (err) {
      throw new Error('User has no permission to delete playlist ', id);
    } else {
      deleteStarred(id, client);

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
            });
          }

          client.lrem('moxboxx:global:playlists:list', 0, id);
          client.lrem('moxboxx:user:playlists:list:' + req.session.userId, 0, id);
          client.del('moxboxx:playlist:hash:' + id);
        }
      });
    }
  });
};
