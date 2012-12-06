'use strict';

var gravatar = require('gravatar');

var util = require('util');
var mox = require('./mox');
var user = require('./user');

var LIMIT = 40;
var DEFAULT_AVATAR = 'http://moxboxx.com/images/avatar.png';

var nconf = require('nconf');
var Sequelize = require('sequelize');

nconf.argv().env().file({ file: 'local.json' });

var sequelize = new Sequelize(
  nconf.get('database'),
  nconf.get('db_username'),
  nconf.get('db_password')
);

exports.modelize = function(sequelize) {
  var Playlist = sequelize.define('playlist', {
    'title': {
      type: Sequelize.STRING,
      validate: {
        isValidTitle: function(title) {
          var trimmed = title.trim();
          if (trimmed.length < 1 || trimmed.length > 100) {
            throw new Error('Title must be between 1-100 characters');
          }
        }
      }
    },
    'created': Sequelize.STRING
  }, {
    timestamps: false,
    underscored: true,
  });

  Playlist.belongsTo(user.modelize(sequelize));
  Playlist.sync();

  return Playlist;
};

var Playlist = exports.modelize(sequelize);

exports.playlistStarred = function(sequelize) {
  var PlaylistStarred = sequelize.define('playlist_starred', {
  }, {
    freezeTableName: true,
    timestamps: false,
    underscored: true
  });
  PlaylistStarred.belongsTo(user.modelize(sequelize),{
    joinTableName: 'playlist_starred',
    foreignKey: 'owner_id'
  });
  PlaylistStarred.belongsTo(Playlist);
  PlaylistStarred.sync();

  return PlaylistStarred;
};

var PlaylistStarred = exports.playlistStarred(sequelize);

exports.tagged = function(sequelize) {
  var Tag = sequelize.define('tagged', {
    'name': {
      type: Sequelize.STRING,
      validate: {
        isValidTag: function(name) {
          var named = name.replace('<', '&lt;').replace('>', '&gt;').trim();

          if (named.length < 1 || named.length > 20) {
            throw new Error('Tag must be between 1-20 characters');
          }
        }
      }
    }
  }, {
    freezeTableName: true,
    timestamps: false,
    underscored: true,
  });

  return Tag;
};

var Tag = exports.tagged(sequelize);

exports.playlistTags = function(sequelize) {
  Playlist.hasMany(Tag, {
    joinTableName: 'playlist_tags',
    timestamps: false,
    underscored: true
  });
  Tag.hasMany(Playlist, {
    joinTableName: 'playlist_tags',
    timestamps: false,
    underscored: true,
    foreignKey: 'tags_id'
  });

  Tag.sync();

  return Tag;
};

var PlaylistTags = exports.playlistTags(sequelize);

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

exports.add = function(req, callback) {
  var newPlaylist = Playlist.build({
    title: req.body.title.trim(),
    user_id: req.session.userId,
    created: req.body.created || new Date().getTime()
  });

  var errors = newPlaylist.validate();

  if (errors) {
    callback(errors.title[0]);
  } else {
    user.get(req.session.userId, function(err, u) {
      if (err) {
        callback(err);
      } else {
        Playlist.create(newPlaylist).
          success(function(p) {
            p.getUser().
              success(function(u) {
                newPlaylist.owner = u;
                callback(null, newPlaylist);
            });
        });
      }
    });
  }
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
            playlists = playlists.sort(function(a, b) {
              return parseInt(b.id, 10) - parseInt(a.id, 10);
            });
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

  Playlist.findAll({ 'limit': LIMIT, 'order': 'id DESC' })
    .success(function(playlistCollection) {
    var playlists = [];

    if (playlistCollection.length > 0) {
      playlistCollection.forEach(function(p) {
        req.params.id = p.id;

        self.get(req, function(err, playlist) {
          if (err) {
            callback(err);
          } else {
            playlists.push(playlist);

            if (playlists.length === playlistCollection.length) {
              playlists = playlists.sort(function(a, b) {
                return parseInt(b.id, 10) - parseInt(a.id, 10);
              });
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
  PlaylistStarred.find({ 'playlist_id': p.id, 'limit': 12, 'order': 'id DESC' })
    .success(function(starred) {
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
  PlaylistStarred.find({ 'playlist_id': p.id, 'owner_id': req.session.userId })
    .success(function(starred) {
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
          PlaylistTags.find({ playlist_id: p.id })
            .success(function(tags) {
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

  Playlist.find(id)
    .success(function(p) {
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
  }).error(function() {
    callback(new Error('invalid playlist'));
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

  Playlist.find({ 'user_id': id }, 'id DESC', LIMIT, function(playlistCollection) {
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
                playlists.data = playlists.data.sort(function(a, b) {
                  return parseInt(b.id, 10) - parseInt(a.id, 10);
                });
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
        if (p) {
          try {
            p.forEach(function(pl) {
              req.params.id = pl.playlist_id;

              self.get(req, function(err, playlist) {
                if (err) {
                  callback(err);
                } else {
                  playlists.push(playlist);
                }

                if (playlists.length === p.length) {
                  playlists = playlists.sort(function(a, b) {
                    return parseInt(b.id, 10) - parseInt(a.id, 10);
                  });
                  callback(null, playlists);
                }
              });
            });
          } catch(e) {
            callback(null, []);
          }
        } else {
          callback(null, []);
        }
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

  Playlist.find({ 'id': req.body.playlist_id, 'user_id': req.session.userId })
    .success(function(p) {
      Tag.find({ 'name': tag })
        .success(function(t) {
          if (t) {
            p.setTag(t)
              .success(function(err, tg) {
                callback(null, tg);
            }).error(function(err) {
              callback(err);
            });
          } else {
            var newTag = Tag.build({
              name: tag
            });

            var errors = newTag.validate();

            if (errors) {
              callback(errors.name[0]);
            } else {
              Tag.create(newTag)
                .success(function(err, tg) {
                  p.setTag(tg)
                    .success(function(err, tp) {
                      callback(null, tg);
                  });
              });
            }
          }
      });
  }).error(function() {
    callback(new Error('Playlist not found'));
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
