'use strict';

exports.incrList = function(name, req, title, callback) {
  client.incr('moxboxx:' + name + 'Count', function(err, id) {
    if (err) {
      callback(err);
    } else {
      var playlist = {
        id: id,
        title: title || 'Untitled',
        owner: req.session.userId,
        created: new Date().getTime()
      };

      client.hmset('moxboxx:playlist:hash:' + id, playlist, function(err, resp) {
        if (err) {
          callback(err);
        } else {
          client.lpush('moxboxx:user:playlists:list:' + req.session.userId, id);
          callback(null, playlist);
        }
      });
    }
  });
};

exports.isOwner = function(userId, playlistId, callback) {
  client.hgetall('moxboxx:playlist:hash:' + playlistId, function(err, playlist) {
    if (err) {
      callback(err);
    } else {
      if (parseInt(playlist.owner, 10) === parseInt(userId, 10)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    }
  });
};
