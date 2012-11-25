'use strict';

exports.incrList = function(name, req, title, client, callback) {
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
