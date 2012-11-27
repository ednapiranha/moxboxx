'use strict';

var utils = require('./utils');

var SERVICE_MIXCLOUD = /mixcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var SERVICE_RDIO = /(((rdio\.com)|(rd\.io))\/[A-Z0-9-_]+\/[A-Z0-9-_]+)/gi;
var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var SERVICE_YOUTUBE = /(youtube.com(?:\/#)?\/watch\?)|(youtu\.be\/[A-Z0-9-_]+)/i;
var SERVICE_VIMEO = /vimeo/i;

var incrMox = function(req, media, client, callback) {
  client.incr('moxboxx:moxlistCount', function(err, id) {
    if (err) {
      callback(err);
    } else {
      var mox = {
        id: id,
        content: media,
        created: new Date().getTime(),
        playlistId: req.body.playlist_id,
        isDeletable: true
      };

      client.rpush('moxboxx:playlist:moxes:list:' + req.body.playlist_id, id, function(err, moxIds) {
        if (err) {
          callback(err);
        } else {
          client.hmset('moxboxx:mox:hash:' + id, mox, function(err, resp) {
            if (err) {
              callback(err);
            } else {
              callback(null, mox);
            }
          });
        }
      });
    }
  });
};

exports.add = function(req, client, callback) {
  var remix = require('./web-remix');
  var url = req.body.url.trim();
  var errors = [];

  if (url.length < 1) {
    errors.push(new Error('Url cannot be empty'));
  }

  if (!url.match(SERVICE_MIXCLOUD) &&
    !url.match(SERVICE_RDIO) &&
    !url.match(SERVICE_SOUNDCLOUD) &&
    !url.match(SERVICE_VIMEO) &&
    !url.match(SERVICE_YOUTUBE)) {
    errors.push(new Error('Invalid url'));
  }

  if (errors.length > 0) {
    callback(errors);
  } else {
    remix.generate(url, client, function(err, media) {
      incrMox(req, media, client, callback);
    });
  }
};

exports.get = function(req, client, callback) {
  client.hgetall('moxboxx:mox:hash:' + req.params.id, function(err, mox) {
    if (err) {
      callback(err);
    } else {
      if (mox) {
        callback(null, mox);
      } else {
        callback(null, true);
      }
    }
  });
};

exports.allByPlaylistId = function(req, client, callback) {
  var self = this;

  client.lrange('moxboxx:playlist:moxes:list:' + req.params.id, 0, -1, function(err, moxIds) {
    if (err) {
      callback(err);
    } else {
      var moxList = [];

      if (moxIds.length > 0) {
        moxIds.forEach(function(moxId) {
          req.params.id = moxId;

          self.get(req, client, function(err, m) {
            moxList.push(m);

            if (moxList.length === moxIds.length) {
              callback(null, moxList);
            }
          });
        });
      } else {
        callback(null, moxList);
      }
    }
  });
};

exports.delete = function(req, client) {
  var id = parseInt(req.body.id, 10);

  utils.isOwner(req.session.userId, req.body.playlist_id, client, function(err, resp) {
    if (!err) {
      if (resp) {
        client.lrem('moxboxx:playlist:moxes:list:' + req.body.playlist_id, 0, id, function(err, resp) {
          if (err) {
            throw new Error('Could not delete mox list item ', id);
          } else {
            client.del('moxboxx:mox:hash:' + id, function(err, resp) {
              if (err) {
                throw new Error('Could not delete mox hash item ', id);
              }
            });
          }
        });
      }
    }
  });
};
