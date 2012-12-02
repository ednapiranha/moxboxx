'use strict';

var gravatar = require('gravatar');

var util = require('util');
var mox = require('./mox');
var user = require('./user');
var utils = require('./utils');

var LIMIT = 40;

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
  nconf.get('db_password') + '@localhost/' + nconf.get('database'), function(success, db) {
  if (!success) {
    throw new Error('Could not connect to the database');
  }

  var Playlist = db.define('playlist', {
    'title': { 'type': 'string' },
    'created': { 'type': 'string' }
  }, {
    'validations': {
      'title': function(title, next) {
        if (title.trim().length < 1) {
          return next('Title cannot be empty');
        } else {
          return next();
        }
      }
    }
  });

  var PlaylistStarred = db.define('playlist_starred', {
  });

  Playlist.hasOne('user');
  //Playlist.sync();

  PlaylistStarred.hasOne('owner', user.User);
  PlaylistStarred.hasOne('playlist', Playlist);
  //PlaylistStarred.sync();

  exports.add = function(req, callback) {
    var newPlaylist = new Playlist({
      title: req.body.title.trim(),
      user_id: req.session.userId,
      created: new Date().getTime()
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
        var deleteStarred = new PlaylistStarred({
          id: starred.id
        });

        deleteStarred.remove(function(err, s) {
          if (err) {
            callback(err);
          } else {
            callback(null, true);
          }
        });
      }
    });
  };

  exports.recentStarred = function(req, callback) {
    PlaylistStarred.find({ 'owner_id': req.session.userId }, function(err, starred) {
      if (err) {
        callback(err);
      } else {
        var playlists = [];

        starred.forEach(function(star) {
          Playlist.get(star.playlist_id, function(err, playlist) {
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
      }
    });
  };

  exports.getGlobal = function(req, callback) {
    var self = this;

    Playlist.find(function(playlistCollection) {
      var playlists = [];

      if (playlistCollection) {
        playlistCollection.forEach(function(p) {
          user.get(p.user_id, function(err, u) {
            p.owner = {
              id: u.id,
              username: u.username,
              gravatar: gravatar.url(u.email)
            };

            if (parseInt(p.user_id, 10) === parseInt(req.session.userId, 10)) {
              p.isDeletable = true;
            }

            playlists.push(p);

            if (playlists.length === playlistCollection.length) {
              callback(null, playlists);
            }
          });
        });
      } else {
        callback(null, playlists);
      }
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
            p.owner = {
              id: u.id,
              username: u.username,
              gravatar: gravatar.url(u.email)
            };

            if (p.user_id === parseInt(req.session.userId, 10)) {
              isDeletable = true;
            }

            p.created = dateDisplay(p.created);

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

        if (title.length < 1) {
          errors.push(new Error('Title cannot be empty'));
        }

        if (errors.length > 0) {
          callback(errors);
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
      }
    });
  };

  exports.userRecent = function(req, callback) {
    var self = this;
    var id = parseInt(req.params.id, 10);

    Playlist.find({ 'user_id': id }, function(playlistCollection) {
      var playlists = { data: [] };

      user.get(id, function(err, u) {
        if (err) {
          callback(err);
        } else {
          playlists.owner = {
            id: u.id,
            username: u.username,
            gravatar: gravatar.url(u.email),
            background: u.background
          };

          if (playlistCollection) {
            playlistCollection.forEach(function(p) {
              if (p.user_id === parseInt(req.session.userId, 10)) {
                isDeletable = true;
              }

              p.created = dateDisplay(p.created);
              playlists.data.push(p);

              if (playlists.data.length === playlistCollection.length) {
                callback(null, playlists);
              }
            });
          } else {
            callback(null, playlists);
          }
        }
      });
    });
  };

  exports.delete = function(req) {
    var id = parseInt(req.body.id, 10);

    Playlist.find({ 'id': id, 'user_id': req.session.userId }, function(p) {
      if (!p) {
        throw new Error('User has no permission to delete playlist ', id);
      } else {
        mox.allByPlaylistId(id, true, function(err, moxes) {
          if (moxes) {
            moxes.forEach(function(m) {
              m.remove();
            });
          }
        });

        PlaylistStarred.find({ 'playlist_id': id }, function(starred) {
          if (starred) {
            starred.forEach(function(s) {
              s.remove();
            });
          }
        });

        p[0].remove();
      }
    });
  };

});
