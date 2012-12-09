'use strict';

var gravatar = require('gravatar');

var util = require('util');
var mox = require('./mox');
var user = require('./user');

var knox = require('knox');
var MultiPartUpload = require('knox-mpu');
var upload = null;
var db = require('./database');
var Playlist = db.getPlaylist();
var PlaylistStarred = db.getPlaylistStarred();
var Tag = db.getTag();
var User = db.getUser();

var LIMIT = 20;
var FILE_SIZE_MAX = 307200;
var DEFAULT_AVATAR = 'http://moxboxx.com/images/avatar.png';

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

var getSummary = function(p, req, callback) {
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
};

var getMoxes = function(p, isDeletable, callback) {
  p.getMoxes({
    order: 'pos ASC, created ASC'
  }).success(function(moxes) {
    var moxCount = 0;
    p.moxes = [];
    p.moxCount = moxes.length;

    if (moxes.length > 0) {
      moxes.forEach(function(m) {
        m.isDeletable = isDeletable;
        p.moxes.push(m);

        if (++moxCount === moxes.length) {
          callback(null, p);
        }
      });
    } else {
      callback(null, p)
    }
  }).error(function(err) {
    callback(err);
  });
};

var getStarredBy = function(req, p, isDeletable, callback) {
  PlaylistStarred.findAll({
    where: {
      playlist_id: parseInt(p.id, 10)
    }, limit: 12, order: 'id DESC'
    }).success(function(starred) {
      if (starred && starred.length > 0) {
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
    }).error(function(err) {
      callback(err);
    });
};

var getStarred = function(req, p, isDeletable, callback) {
  PlaylistStarred.find({
    where: {
      playlist_id: p.id,
      owner_id: req.session.userId
    }, order: 'id DESC'
    }).success(function(starred) {
      var isStarred = false;

      if (starred) {
        isStarred = true;
      }

      p.isStarred = isStarred;

      getMoxes(p, isDeletable, function(err, moxes) {
        if (err) {
          callback(err);
        } else {
          p.getTags()
            .success(function(tags) {
              p.tags = tags;
              callback(null, p);
            }).error(function(err) {
              callback(err);
            });
        }
      });
    }).error(function(err) {
      callback(err);
    });
};

var getStarredSummary = function(p, req, isDeletable, callback) {
  PlaylistStarred.find({
    where: {
      playlist_id: p.id,
      owner_id: req.session.userId
    }, order: 'id DESC'
    }).success(function(starred) {
      var isStarred = false;

      if (starred) {
        isStarred = true;
      }

      p.isStarred = isStarred;

      p.getMoxes({
        order: 'pos ASC, created ASC'
      }).success(function(moxes) {
        var moxCount = 0;
        p.moxCount = moxes.length;
        callback(null, p);
      }).error(function(err) {
        callback(err);
      });
    }).error(function(err) {
      callback(err);
    });
};

var updateBackground = function(req, background) {
  Playlist.find(parseInt(req.body.playlist_id, 10))
    .success(function(playlist) {
      if (playlist) {
        playlist.id = parseInt(playlist.id, 10);
        playlist.background = background;
        playlist.save();
      } else {
        throw new Error('playlist not found');
      }
    });
};

exports.saveBackground = function(req, nconf, callback) {
  if (req.files && req.files.background &&
    req.files.background.size > 0 && req.files.background.size < FILE_SIZE_MAX) {
    var filename = 'playlist_' + (new Date().getTime().toString()) + req.files.background.name;
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
        updateBackground(req, filename);
        callback(null, filename);
      }
    });
  } else {
    // delete file
    updateBackground(req, '');
    callback(null, '');
  }
};

exports.add = function(req, callback) {
  var playlist = Playlist.build({
    title: req.body.title.trim(),
    user_id: req.session.userId,
    created: new Date().getTime(),
    description: req.body.description
  });

  playlist.save()
    .success(function(p) {
      callback(null, p);
    }).error(function(err) {
      callback(err);
    });
};

exports.star = function(req, callback) {
  var id = parseInt(req.body.id, 10);

  PlaylistStarred.find({
    where: {
      owner_id: req.session.userId,
      playlist_id: id
    }}).success(function(starred) {
      if (!starred) {
        var starred = PlaylistStarred.build({
          owner_id: req.session.userId,
          playlist_id: id
        });

        starred.save()
          .success(function(s) {
            callback(null, true);
          }).error(function(err) {
            callback(err);
          });
      } else {
        starred.id = parseInt(starred.id, 10);
        starred.destroy();
        callback(null, true);
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.recentStarred = function(req, callback) {
  var self = this;

  var page = 0;
  if (req.query && req.query.page) {
    page = parseInt(req.query.page, 10);
  }
  var offset = 0;

  if (page > 0) {
    offset = LIMIT * page;
  }

  PlaylistStarred.findAll({
    where: {
      'owner_id': req.session.userId
    },
    limit: LIMIT, offset: offset, order: 'id DESC'
    }).success(function(starred) {
      var playlists = [];

      if (starred.length > 0) {
        starred.forEach(function(star) {
          Playlist.find(star.playlist_id)
            .success(function(p) {
              getSummary(p, req, function(err, playlist) {
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
            }).error(function(err) {
              callback(err);
            });
        });
      } else {
        callback(null, playlists);
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.getGlobal = function(req, callback) {
  var self = this;

  var page = 0;
  if (req.query && req.query.page) {
    page = parseInt(req.query.page, 10);
  }
  var offset = 0;

  if (page > 0) {
    offset = LIMIT * page;
  }

  Playlist.findAll({
    limit: LIMIT, offset: offset, order: 'id DESC'
    }).success(function(playlistCollection) {
      var playlists = [];

      if (playlistCollection.length > 0) {
        playlistCollection.forEach(function(p) {
          getSummary(p, req, function(err, playlist) {
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
    }).error(function(err) {
      callback(err);
    });
};

exports.get = function(req, callback) {
  var id = parseInt(req.params.id, 10);

  Playlist.find({
    where: {
      id: id
    }, include: ['Tags', 'Moxes'] }).success(function(p) {
      if (!p) {
        callback(new Error('invalid playlist'));
      } else {
        var isDeletable = false;

        user.get(p.user_id, function(err, u) {
          if (err) {
            callback(err);
          } else {
            p.created = dateDisplay(p.created);
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
    }).error(function(err) {
      callback(err);
    });
};

exports.hasEditPermission = function(id, userId, callback) {
  Playlist.find({
    where: {
      id: parseInt(id, 10),
      user_id: parseInt(userId, 10)
    }}).success(function(p) {
      if (p) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.update = function(req, callback) {
  var title = req.body.title.trim();
  var id = parseInt(req.params.id, 10);

  Playlist.find({
    where: {
      'id': id,
      'user_id': req.session.userId
    }}).success(function(playlist) {
      if (!playlist) {
        callback(new Error('User has no permission to update playlist ', id));

      } else {
        playlist.id = parseInt(playlist.id, 10);
        playlist.title = title;
        playlist.description = req.body.description;

        var errors = playlist.validate();

        if (errors) {
          callback(errors.title);
        } else {
          playlist.save()
            .success(function() {
               callback(null, playlist);
            }).error(function(err) {
              callback(err);
            });
        }
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.userRecent = function(req, callback) {
  var self = this;
  var id = parseInt(req.params.id, 10);

  var page = 0;
  if (req.query && req.query.page) {
    page = parseInt(req.query.page, 10);
  }
  var offset = 0;

  if (page > 0) {
    offset = LIMIT * page;
  }

  Playlist.findAll({
    where: {
      user_id: id
    }, limit: LIMIT, offset: offset, order: 'id DESC'
    }).success(function(playlistCollection) {
      var playlists = { data: [] };

      if (playlistCollection) {
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

            if (playlistCollection.length > 0) {
              playlistCollection.forEach(function(p) {
                getSummary(p, req, function(err, playlist) {
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
      } else {
        callback(null, playlists);
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.delete = function(req) {
  var id = parseInt(req.body.id, 10);

  Playlist.find({
    where: {
      id: id,
      user_id: req.session.userId
    }}).success(function(p) {
      if (!p) {
        throw new Error('User has no permission to delete playlist ', id);
      } else {
        p.id = parseInt(p.id, 10);
        p.destroy();
      }
    }).error(function(err) {
      throw new Error('Could not find playlist ', err);
    });
};

exports.getRecentByTag = function(req, callback) {
  var self = this;
  var tag = req.params.tag.trim().toLowerCase();

  var page = 0;
  if (req.query && req.query.page) {
    page = parseInt(req.query.page, 10);
  }
  var offset = 0;

  if (page > 0) {
    offset = LIMIT * page;
  }

  Tag.find({
    where: {
      name: tag
    }}).success(function(tg) {
      var playlists = [];

      if (tg) {
        tg.getPlaylists({
          limit: LIMIT, offset: offset, order: 'id DESC'
          }).success(function(playlistCollection) {
            if (playlistCollection.length > 0) {
              playlistCollection.forEach(function(p) {
                getSummary(p, req, function(err, playlist) {
                  if (err) {
                    callback(err);
                  } else {
                    playlists.push(playlist);
                  }

                  if (playlists.length === playlistCollection.length) {
                    callback(null, playlists);
                  }
                });
              });
            } else {
              callback(null, playlists);
            }
          }).error(function(err) {
            callback(err);
          });
      } else {
        callback(null, playlists);
      }
    }).error(function(err) {
      callback(err);
    });
};

exports.addTag = function(req, callback) {
  var tag = req.body.tag.toLowerCase().trim();

  Playlist.find({
    where: {
      id: req.body.playlist_id,
      user_id: req.session.userId
    }}).success(function(p) {
      if (!p) {
        callback(new Error('Playlist not found'));
      } else {
        Tag.find({
          where: {
            name: tag
          }}).success(function(t) {
            if (t) {
              p.addTag(t)
                .success(function(tg) {
                  callback(null, tg);
                }).error(function(err) {
                  callback(err);
                });
            } else {
              var newTag = Tag.build({
                name: tag
              });

              newTag.save()
                .success(function(tg) {
                  p.addTag(tg)
                    .success(function(tp) {
                      callback(null, tg);
                    }).error(function(err) {
                      callback(err);
                    });
                }).error(function(err) {
                  callback(err);
                });
            }
          }).error(function(err) {
            callback(err);
          });
      }
  });
};

exports.deleteTag = function(req) {
  var tag = req.body.tag.trim();

  Playlist.find({
    where: {
      id: req.params.id,
      user_id: req.session.userId
    }}).success(function(p) {
      if (p) {
        Tag.find({
          where: {
            name: tag
          }}).success(function(t) {
            p.removeTag(t);
          });
      }
    });
};
