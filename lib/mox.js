'use strict';

var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var SERVICE_YOUTUBE = /(youtube.com(?:\/#)?\/watch\?)|(youtu\.be\/[A-Z0-9-_]+)/gi;
var SERVICE_VIMEO = /vimeo\.com\/[0-9]+/gi;

var playlist = require('./playlist');
var nconf = require('nconf');
var orm = require('orm');

nconf.argv().env().file({ file: 'local.json' });

orm.connect('mysql://' + nconf.get('db_username') + ':' +
  nconf.get('db_password') + '@127.0.0.1:3306/' + nconf.get('database'), function(success, db) {

  if (!success) {
    throw new Error('Could not connect to the database');
  }

  var Mox = db.define('mox', {
    'url': { 'type': 'string' },
    'content': { 'type': 'string' },
    'pos': { 'type': 'integer' },
    'created': { 'type': 'string' }
  }, {
    'validations': {
      'url': function(url, next) {
        url = url.trim();
        if (url.length < 1) {
          return next('Url cannot be empty');
        } else if (!url.match(SERVICE_SOUNDCLOUD) &&
          !url.match(SERVICE_VIMEO) &&
          !url.match(SERVICE_YOUTUBE)) {
          return next('Invalid url');
        } else {
          return next();
        }
      }
    }
  });

  Mox.hasOne('playlist', playlist.Playlist);
  //Mox.sync();

  exports.add = function(req, callback) {
    var remix = require('./web-remix');
    var url = req.body.url.trim();

    remix.generate(url, function(err, media) {
      var newMox = new Mox({
        url: url,
        content: media,
        created: new Date().getTime(),
        playlist_id: req.body.playlist_id
      });

      newMox.save(function(err, m) {
        if (err) {
          callback(err.msg);
        } else {
          callback(null, newMox);
        }
      });
    });
  };

  exports.get = function(req, callback) {
    var id = parseInt(req.params.id, 10);

    Mox.get(id, function(mox) {
      if (!mox) {
        callback(new Error('mox not found'));
      } else {
        callback(null, mox);
      }
    });
  };

  exports.allByPlaylistId = function(id, isDeletable, callback) {
    var moxes = [];

    Mox.find({ 'playlist_id': id }, 'created DESC', function(moxCollection) {
      if (moxCollection) {
        moxCollection.forEach(function(m) {
          m.isDeletable = isDeletable;
          moxes.push(m);

          if (moxes.length === moxCollection.length) {
            callback(null, moxes);
          }
        });
      } else {
        callback(null, moxes);
      }
    });
  };
});

exports.delete = function(req) {
  req.params.id = req.body.id;

  this.get(req, function(err, m) {
    req.params.id = m.playlist_id;
    playlist.get(req, function(err, p) {
      if (parseInt(req.session.userId, 10) === parseInt(p.user_id, 10)) {
        m.remove();
      }
    });
  });
};
