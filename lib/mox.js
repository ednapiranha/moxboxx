'use strict';

var utils = require('./utils');

var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var SERVICE_YOUTUBE = /(youtube.com(?:\/#)?\/watch\?)|(youtu\.be\/[A-Z0-9-_]+)/gi;
var SERVICE_VIMEO = /vimeo\.com\/[0-9]+/gi;

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

  if (!url.match(SERVICE_SOUNDCLOUD) &&
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
             // fix up old mixes
            var c;
            var i;
            var mox = m
            console.log('got here')
            if (mox.content.indexOf('youtube') > -1 && mox.content.indexOf('id=\"video-') < 0) {
              i = mox.content.split('embed/')[1].split('?')[0];
              c = mox.content.replace('wmode=transparent', 'wmode=transparent&version=3&enablejsapi=1')
                .replace(/frameborder/, 'class="youtube" id="video-youtube-' + i + '" frameborder');
              client.hset('moxboxx:mox:hash:' + req.params.id, 'content', c);
            } else if (mox.content.indexOf('vimeo') > -1 && mox.content.indexOf('id=\"video-') < 0) {
              i = mox.content.split('\" width=')[0].split('video/')[1];
              c = mox.content.replace('\" width', '?api=1&player_id=' + i + '\" class="vimeo" ' +
                'id="video-vimeo-' + i + '" width');
              client.hset('moxboxx:mox:hash:' + req.params.id, 'content', c);
            } else if (mox.content.indexOf('soundcloud') > -1 && mox.content.indexOf('id=\"video-') < 0) {
              i = mox.content.split('%2Ftracks%2F')[1].split('&')[0];
              c = mox.content.replace('<iframe', '<iframe class="soundcloud" ' +
                'id="video-soundcloud-' + i + '"');
              client.hset('moxboxx:mox:hash:' + req.params.id, 'content', c);
            }
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
