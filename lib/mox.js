'use strict';

var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var SERVICE_YOUTUBE = /(youtube.com(?:\/#)?\/watch\?)|(youtu\.be\/[A-Z0-9-_]+)/gi;
var SERVICE_VIMEO = /vimeo\.com\/[0-9]+/gi;

var playlist = require('./playlist');
var db = require('./database');
var Mox = db.getMox();

exports.add = function(req, callback) {
  var remix = require('./web-remix');
  var url = req.body.url.trim();

  remix.generate(url, function(err, media) {
    if (err) {
      callback(err);
    } else {
      var mox = Mox.build({
        url: url,
        content: media,
        created: new Date().getTime(),
        playlist_id: parseInt(req.body.playlist_id, 10),
        pos: 0
      });

      var errors = mox.validate();

      if (errors) {
        callback(errors.url);
      } else {
        mox.save()
          .success(function() {
            callback(null, mox);
          }).error(function(err) {
            callback(err);
          });
      }
    }
  });
};

exports.get = function(req, callback) {
  var id = parseInt(req.params.id, 10);

  Mox.find(id)
    .success(function(mox) {
      callback(null, mox);
    }).error(function(err) {
      callback(err);
    });
};

exports.updatePositions = function(req) {
  var self = this;

  var sortArr = req.body.sort_arr;
  if (sortArr) {
    playlist.hasEditPermission(sortArr[0].playlist_id, req.session.userId, function(err, resp) {
      if (err) {
        throw new Error(err);
      } else {
        if (resp) {
          sortArr.forEach(function(mox) {
            req.params.id = mox.id;
            self.get(req, function(err, m) {
              if (!err) {
                m.id = parseInt(m.id, 10);
                m.pos = parseInt(mox.pos, 10);

                m.save()
                  .error(function(mx) {
                    throw new Error('Could not save position for mox ', req.body.id, err);
                  });
              }
            });
          });
        }
      }
    });
  }
};

exports.delete = function(req) {
  req.params.id = req.body.id;

  this.get(req, function(err, m) {
    playlist.hasEditPermission(m.playlist_id, req.session.userId, function(err, resp) {
      if (err) {
        throw new Error(err);
      } else {
        if (resp) {
          req.params.id = m.playlist_id;
          playlist.get(req, function(err, p) {
            if (!err && parseInt(req.session.userId, 10) === parseInt(p.user_id, 10)) {
              m.id = parseInt(m.id, 10);
              m.destroy();
            }
          });
        }
      }
    });
  });
};
