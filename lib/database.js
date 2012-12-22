'use strict';

var nconf = require('nconf');
var Sequelize = require('sequelize');

var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9\-_]+\/[A-Z0-9\-_]+/gi;
var SERVICE_VIMEO = /vimeo/i;
var SERVICE_YOUTUBE = /(youtube.com(?:\/#)?\/watch\?)|(youtu\.be\/[A-Z0-9\-_]+)/i;
var USERNAME_MATCH = /[^A-Z0-9_]/gi;

if (process.env.NODE_ENV && process.env.NODE_ENV === 'test') {
  nconf.argv().env().file({ file: 'local-test.json' });
} else {
  nconf.argv().env().file({ file: 'local.json' });
}

var sequelize = new Sequelize(
  nconf.get('database'),
  nconf.get('db_username'),
  nconf.get('db_password'), {
    define: {
      underscored: true,
      charset: 'utf8',
      timestamps: false,
    },
    sync: { force: true },
    syncOnAssociation: true,
    charset: 'utf8',
    collate: 'utf8_general_ci',
    pool: {
      maxConnections: 5,
      maxIdleTime: 30
    }
  }
);

/* Set up database */

var User = sequelize.define('user', {
  'username': {
    allowNull: false,
    unique: true,
    type: Sequelize.STRING,
    validate: {
      is: ['[A-Z0-9_]','gi'],
      len: [1, 20]
    }
  },
  'email': Sequelize.STRING,
  'location': Sequelize.STRING,
  'website': Sequelize.STRING,
  'background': Sequelize.STRING,
  'email_starred': Sequelize.BOOLEAN
}, {
  freezeTableName: true
});

var Playlist = sequelize.define('playlist', {
  'description': {
    type: Sequelize.STRING,
    validate: {
      len: [0, 350]
    }
  },
  'title': {
    allowNull: false,
    type: Sequelize.STRING,
    validate: {
      len: [1, 100]
    }
  },
  'background': Sequelize.STRING,
  'created': Sequelize.STRING,
  'views': Sequelize.INTEGER
}, {
  freezeTableName: true
});

var Mox = sequelize.define('mox', {
  'url': {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      isValidUrl: function(url) {
        url = url.trim();
        if (!url.match(SERVICE_SOUNDCLOUD) &&
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
  freezeTableName: true
});

var PlaylistStarred = sequelize.define('playlist_starred', {
  'owner_id': {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  'playlist_id': {
    type: Sequelize.INTEGER,
    allowNull: false
  }
}, {
  freezeTableName: true
});

var Tag = sequelize.define('tagged', {
  'name': {
    type: Sequelize.STRING,
    unique: true,
    validate: {
      len: [1, 20]
    }
  }
}, {
  freezeTableName: true
});

Playlist.hasMany(Tag, {
  joinTableName: 'playlist_tags',
  as: 'Tags'
});

Tag.hasMany(Playlist, {
  joinTableName: 'playlist_tags',
  foreignKey: 'tags_id',
  as: 'Playlists'
});

Playlist.hasMany(Mox, {
  joinTableName: 'mox',
  as: 'Moxes'
});

Playlist.belongsTo(User);
Mox.belongsTo(Playlist);
Mox.sync();
PlaylistStarred.sync();
User.sync();
Tag.sync();
Playlist.sync();

exports.getUser = function() {
  return User;
};

exports.getPlaylist = function() {
  return Playlist;
};

exports.getMox = function() {
  return Mox;
};

exports.getPlaylistStarred = function() {
  return PlaylistStarred;
};

exports.getTag = function() {
  return Tag;
};
