'use strict';

var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var SERVICE_YOUTUBE = /(youtube.com(?:\/#)?\/watch\?)|(youtu\.be\/[A-Z0-9-_]+)/gi;
var SERVICE_VIMEO = /vimeo\.com\/[0-9]+/gi;

var playlist = require('./playlist');
var nconf = require('nconf');
var Sequelize = require('sequelize');

nconf.argv().env().file({ file: 'local.json' });

var sequelize = new Sequelize(
  nconf.get('database'),
  nconf.get('db_username'),
  nconf.get('db_password')
);

exports.modelize = function() {
  var Mox = sequelize.define('mox', {
    'url': {
      type: Sequelize.STRING,
      validate: {
        isValidUrl: function(url) {
          url = url.trim();
          if (url.length < 1) {
            throw new Error('Url cannot be empty');
          } else if (!url.match(SERVICE_SOUNDCLOUD) &&
            !url.match(SERVICE_VIMEO) &&
            !url.match(SERVICE_YOUTUBE)) {
            throw new Error('Invalid url');
          }
        }
      }
    },
    'content': Sequelize.TEXT,
    'pos': Sequelize.INTEGER,
    'created': Sequelize.STRING
  }, {
    timestamps: false,
    underscored: true,
  });

  if (playlist.modelize) {
    Mox.belongsTo(playlist.modelize(sequelize));
    Mox.sync();
  }

  return Mox;
};

var Mox = exports.modelize();

exports.add = function(req, callback) {
  var remix = require('./web-remix');
  var url = req.body.url.trim();
  console.log('got here')
  remix.generate(url, function(err, media) {
    Mox.create({
      url: url,
      content: media,
      created: new Date().getTime(),
      playlist_id: req.body.playlist_id
    }).success(function(m) {
      callback(null, m);
    }).error(function(err) {
      callback(err.msg);
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

  Mox.findAll({ 'order': 'id DESC' })
    .success(function(moxCollection) {
      if (moxCollection.length > 0) {
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

exports.delete = function(req) {
  req.params.id = req.body.id;

  this.get(req, function(err, m) {
    req.params.id = m.playlist_id;
    playlist.get(req, function(err, p) {
      if (parseInt(req.session.userId, 10) === parseInt(p.user_id, 10)) {
        m.destroy();
      }
    });
  });
};
