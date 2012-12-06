'use strict';

var gravatar = require('gravatar');

var util = require('util');
var mox = require('./mox');
var user = require('./user');

var LIMIT = 25;
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
    'created': { 'type': 'string' },
    'description': { 'type': 'string' }
  }, {
    'validations': {
      'title': function(title, next) {
        var trimmed = title.trim();

        if (trimmed.length < 1 || trimmed.length > 100) {
          return next('Title must be between 1-100 characters');
        } else {
          return next();
        }
      },
      'description': function(description, next) {
        if (description.length > 350) {
          return next('Description cannot be more than 350 characters');
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
        var named = name.replace('<', '&lt;').replace('>', '&gt;').trim();

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
      created: new Date().getTime(),
      description: req.body.description
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

    var page = parseInt(req.query.page, 10) || 0;
    var limit = LIMIT;
    var skip = 0;

    if (page > 0) {
      limit = limit * page;
      skip = limit + LIMIT;
    }

    PlaylistStarred.find({ 'owner_id': req.session.userId }, 'id DESC', skip, limit, function(starred) {
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

    var page = parseInt(req.query.page, 10) || 0;
    var limit = LIMIT;
    var skip = 0;

    if (page > 0) {
      limit = limit * page;
      skip = limit + LIMIT;
    }

    Playlist.find('*', 'id DESC', skip, limit, function(playlistCollection) {
      var playlists = [];

      if (playlistCollection) {
        playlistCollection.forEach(function(p) {
          req.params.id = p.id;

          self.getSummary(req, function(err, playlist) {
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
              p.moxCount = moxes.length;
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
    PlaylistStarred.find({ 'playlist_id': p.id }, 'id DESC', 12, function(starred) {
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
    PlaylistStarred.find({
      'playlist_id': p.id,
      'owner_id': req.session.userId }, 'id DESC', function(starred) {

      var isStarred = false;

      if (starred) {
        isStarred = true;
      }

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
            p.created = dateDisplay(p.created);
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

  var getStarredSummary = function(p, req, isDeletable, callback) {
    PlaylistStarred.find({
      'playlist_id': p.id,
      'owner_id': req.session.userId }, 'id DESC', function(starred) {

      var isStarred = false;

      if (starred) {
        isStarred = true;
      }

      p.isStarred = isStarred;

      mox.allByPlaylistId(p.id, isDeletable, function(err, moxes) {
        if (err) {
          callback(err);
        } else {
          if (moxes.length > 0) {
            var moxCount = 0;
            moxes.forEach(function(m) {
              if (++moxCount === moxes.length) {
                p.moxCount = moxCount;
                callback(null, p);
              }
            });
          } else {
            callback(null, p);
          }
        }
      });
    });
  };

  exports.getSummary = function(req, callback) {
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
            p.created = dateDisplay(p.created);
            p.moxes = [];
            p.starredBy = [];
            if (p.description) {
              var longerDesc = false;
              if (p.description.length > 70) {
                 longerDesc = true;
              }
              p.description = p.description.slice(0, 70);
              if (longerDesc) {
                 p.description += '...';
              }
            }
            p.owner = {
              id: u.id,
              username: u.username,
              gravatar: gravatar.url(u.email, { d: DEFAULT_AVATAR }),
              background: u.background
            };

            if (p.user_id === parseInt(req.session.userId, 10)) {
              isDeletable = true;
            }

            getStarredSummary(p, req, isDeletable, callback);
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
          title: title,
          description: req.body.description
        });

        editPlaylist.save(function(err, p) {
          if (err) {
            callback(err.msg);
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

    var page = parseInt(req.query.page, 10) || 0;
    var limit = LIMIT;
    var skip = 0;

    if (page > 0) {
      limit = limit * page;
      skip = limit + LIMIT;
    }

    Playlist.find({ 'user_id': id }, 'id DESC', skip, limit, function(playlistCollection) {
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

              self.getSummary(req, function(err, playlist) {
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

    var page = parseInt(req.query.page, 10) || 0;
    var limit = LIMIT;
    var skip = 0;

    if (page > 0) {
      limit = limit * page;
      skip = limit + LIMIT;
    }

    Tag.find({ name: tag }, function(tag) {
      if (tag) {
        var playlists = [];

        PlaylistTags.find({ tags_id: tag[0].id }, skip, limit, function(p) {
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
