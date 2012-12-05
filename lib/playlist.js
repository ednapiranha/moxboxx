'use strict';

var gravatar = require('gravatar');

var util = require('util');
var mox = require('./mox');
var user = require('./user');

var LIMIT = 40;
var DEFAULT_AVATAR = 'http://moxboxx.com/images/avatar.png';

var nconf = require('nconf');
var orm = require('orm');

nconf.argv().env().file({ file: 'local.json' });

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

orm.connect('mysql://' + nconf.get('db_username') + ':' +
  nconf.get('db_password') + '@127.0.0.1:3306/' + nconf.get('database'), function(success, db) {
  if (!success) {
    throw new Error('Could not connect to the database ', success);
  }

  var Playlist = db.define('playlist', {
    'title': { 'type': 'string' },
    'created': { 'type': 'string' }
  }, {
    'validations': {
      'title': function(title, next) {
        var trimmed = title.trim();

        if (trimmed.length < 1 || trimmed.length > 100) {
          return next('Title must be between 1-100 characters');
        } else {
          return next();
        }
      }
    }
  });

  var PlaylistStarred = db.define('playlist_starred', {
  });

  Playlist.hasOne('user');

  PlaylistStarred.hasOne('owner', user.User);
  PlaylistStarred.hasOne('playlist', Playlist);

  var Tag = db.define('tagged', {
    'name': { 'type': 'string' }
  }, {
    'validations': {
      'name': function(name, next) {
        var named = name.trim();

        if (named.length < 1 || named.length > 20) {
          return next('Tag must be between 1-20 characters');
        } else {
          return next();
        }
      }
    }
  });

  var PlaylistTags = db.define('playlist_tags', {

  });

  PlaylistTags.hasOne('playlist', Playlist);
  PlaylistTags.hasOne('tag', Tag);

  Playlist.hasMany('tags', Tag);
  Tag.sync();
  Playlist.sync();
  //PlaylistStarred.sync();

  exports.add = function(req, callback) {
    var newPlaylist = new Playlist({
      title: req.body.title.trim(),
      user_id: req.session.userId,
      created: req.body.created || new Date().getTime()
    });

    user.get(req.session.userId, function(err, u) {
      if (err) {
        callback(err);
      } else {
        newPlaylist.save(function(err, p) {
          if (err) {
            callback(err.msg);
          } else {
            p.setUser(u, function() {
              newPlaylist.owner = u;
              callback(null, newPlaylist);
            });
          }
        });
      }
    });
  };

  exports.star = function(req, callback) {
    var id = parseInt(req.body.id, 10);

    PlaylistStarred.find({ 'owner_id': req.session.userId, 'playlist_id': id }, function(starred) {
      if (!starred) {

        var newStarred = new PlaylistStarred({
          owner_id: req.session.userId,
          playlist_id: id
        });

        newStarred.save(function(err, s) {
          if (err) {
            callback(err);
          } else {
            callback(null, true);
          }
        });
      } else {
        starred[0].remove();
        callback(null, true);
      }
    });
  };

  exports.recentStarred = function(req, callback) {
    var self = this;

    PlaylistStarred.find({ 'owner_id': req.session.userId }, 'id DESC', LIMIT, function(starred) {
      var playlists = [];

      if (starred) {
        starred.forEach(function(star) {
          req.params.id = star.playlist_id;

          self.get(req, function(err, playlist) {
            if (err) {
              callback(err);
            } else {
              playlists.push(playlist);
            }

            if (playlists.length === starred.length) {
              callback(null, playlists);
            }
          });
        });
      } else {
        callback(null, playlists);
      }
    });
  };

  exports.getGlobal = function(req, callback) {
    var self = this;

    Playlist.find('*', 'created DESC', LIMIT, function(playlistCollection) {
      var playlists = [];

      if (playlistCollection) {
        playlistCollection.forEach(function(p) {
          req.params.id = p.id;

          self.get(req, function(err, playlist) {
            if (err) {
              callback(err);
            } else {
              playlists.push(playlist);

              if (playlists.length === playlistCollection.length) {
                callback(null, playlists);
              }
            }
          });
        });
      } else {
        callback(null, playlists);
      }
    });
  };

  var getMoxes = function(p, isDeletable, callback) {
    mox.allByPlaylistId(p.id, isDeletable, function(err, moxes) {
      if (err) {
        callback(err);
      } else {
        if (moxes.length > 0) {
          moxes.forEach(function(m) {
            p.moxes.push(m);

            if (p.moxes.length === moxes.length) {
              callback(null, p);
            }
          });
        } else {
          callback(null, p);
        }
      }
    });
  };

  var getStarredBy = function(req, p, isDeletable, callback) {
    PlaylistStarred.find({ 'playlist_id': p.id }, 'id DESC', 20, function(starred) {
      if (starred) {
        starred.forEach(function(s) {
          user.get(s.owner_id, function(err, user) {
            if (err) {
              callback(err);
            } else {
              p.starredBy.push({
                id: user.id,
                username: user.username,
                gravatar: gravatar.url(user.email, { d: DEFAULT_AVATAR })
              });
            }

            if (p.starredBy.length === starred.length) {
              getStarred(req, p, isDeletable, callback);
            }
          });
        });
      } else {
        getStarred(req, p, isDeletable, callback);
      }
    });
  };

  var getStarred = function(req, p, isDeletable, callback) {
    PlaylistStarred.find({ 'playlist_id': p.id, 'owner_id': req.session.userId }, function(starred) {
      var isStarred = false;

      if (starred) {
        isStarred = true;
      }

      p.created = dateDisplay(p.created);
      p.isStarred = isStarred;

      getMoxes(p, isDeletable, function(err, moxes) {
        if (err) {
          callback(err);
        } else {
          p.tags = [];
          PlaylistTags.find({ playlist_id: p.id }, function(tags) {
            if (tags) {
              p.getTags(function(t) {
                t.forEach(function(tag) {
                  p.tags.push({
                    id: tag.id,
                    name: tag.name
                  });

                  if (p.tags.length === t.length) {
                    callback(null, p);
                  }
                });
              });
            } else {
              callback(null, p);
            }
          });
        }
      });
    });
  };

  exports.get = function(req, callback) {
    var id = parseInt(req.params.id, 10);

    Playlist.get(id, function(p) {
      if (!p) {
        callback(new Error('invalid playlist'));
      } else {
        var isDeletable = false;

        user.get(p.user_id, function(err, u) {
          if (err) {
            callback(err);
          } else {
            p.moxes = [];
            p.starredBy = [];
            p.owner = {
              id: u.id,
              username: u.username,
              gravatar: gravatar.url(u.email, { d: DEFAULT_AVATAR }),
              background: u.background
            };

            if (p.user_id === parseInt(req.session.userId, 10)) {
              isDeletable = true;
            }

            getStarredBy(req, p, isDeletable, callback);
          }
        });
      }
    });
  };

  exports.update = function(req, callback) {
    var title = req.body.title.trim();
    var id = parseInt(req.params.id, 10);
    var errors = [];

    Playlist.find({ 'id': id, 'user_id': req.session.userId }, function(playlist) {
      if (!playlist) {
        callback(new Error('User has no permission to update playlist ', id));

      } else {

        var editPlaylist = new Playlist({
          id: id,
          user_id: req.session.userId,
          title: title
        });

        editPlaylist.save(function(err, p) {
          if (err) {
            callback(err);
          } else {
            p.getUser(function(user) {
              editPlaylist.owner = user;
              callback(null, editPlaylist);
            });
          }
        });
      }
    });
  };

  exports.userRecent = function(req, callback) {
    var self = this;
    var id = parseInt(req.params.id, 10);

    Playlist.find({ 'user_id': id }, 'created DESC', LIMIT, function(playlistCollection) {
      var playlists = { data: [] };

      user.get(id, function(err, u) {
        if (err) {
          callback(err);
        } else {
          playlists.owner = {
            id: u.id,
            location: u.location,
            website: u.website,
            username: u.username,
            gravatar: gravatar.url(u.email, { d: DEFAULT_AVATAR }),
            background: u.background
          };

          if (playlistCollection) {
            playlistCollection.forEach(function(p) {
              req.params.id = p.id;

              self.get(req, function(err, playlist) {
                if (err) {
                  callback(err);
                } else {
                  playlists.data.push(playlist);
                }

                if (playlists.data.length === playlistCollection.length) {
                  callback(null, playlists);
                }
              });
            });
          } else {
            callback(null, playlists);
          }
        }
      });
    });
  };

  exports.getRecentByTag = function(req, callback) {
    var self = this;
    var tag = req.params.tag.trim().toLowerCase();

    Tag.find({ name: tag }, function(tag) {
      if (tag) {
        var playlists = [];

        PlaylistTags.find({ tags_id: tag[0].id }, function(p) {
          p.forEach(function(pl) {
            req.params.id = pl.playlist_id;

            self.get(req, function(err, playlist) {
              if (err) {
                callback(err);
              } else {
                playlists.push(playlist);
              }

              if (playlists.length === p.length) {
                callback(null, playlists);
              }
            });
          });
        });
      } else {
        callback(null, []);
      }
    });
  };

  exports.delete = function(req) {
    var id = parseInt(req.body.id, 10);

    Playlist.find({ 'id': id, 'user_id': req.session.userId }, function(p) {
      if (!p) {
        throw new Error('User has no permission to delete playlist ', id);
      } else {
        p[0].removeTags(function() { });
        p[0].remove();
      }
    });
  };

  exports.addTag = function(req, callback) {
    var tag = req.body.tag.toLowerCase().trim();

    Playlist.find({ 'id': req.body.playlist_id, 'user_id': req.session.userId }, function(p) {
      if (!p) {
        callback(new Error('Playlist not found'));
      } else {
        Tag.find({ 'name': tag }, function(t) {
          if (t) {
            p[0].addTags(t[0], function(err, tg) {
              if (err) {
                callback(err);
              } else {
                callback(null, tg);
              }
            });
          } else {
            var newTag = new Tag({
              name: tag
            });

            newTag.save(function(err, tg) {
              if (err) {
                callback(err.msg);
              } else {
                p[0].addTags(tg, function(err, tp) {
                  if (err) {
                    callback(err);
                  } else {
                    callback(null, tg);
                  }
                });
              }
            });
          }
        });
      }
    });
  };

  exports.deleteTag = function(req) {
    Playlist.find({ 'id': req.params.id, 'user_id': req.session.userId }, function(p) {
      if (p) {
        Tag.find({ 'name': req.body.tag }, function(t) {
          if (t) {
            p[0].removeTags(t[0], function(err, tg) { });
          }
        });
      }
    });
  };
});
