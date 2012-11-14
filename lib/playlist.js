'use strict';

exports.add = function(req, client, callback) {
  var title = req.body.title.trim();
  var errors = [];

  if (title.length < 1) {
    errors.push(new Error('Title cannot be empty'));
  }

  if (errors.length > 0) {
    callback(errors);
  } else {
    client.incr('moxboxx:playlistCount', function(err, id) {
      if (err) {
        callback(err);
      } else {
        var playlist = {
          id: id,
          title: title || 'Untitled',
          owner: req.session.userId,
          created: new Date().getTime()
        };

        client.hmset('moxboxx:playlist:' + id, playlist, function(err, resp) {
          if (err) {
            callback(err);
          } else {
            callback(null, playlist);
          }
        });
      }
    });
  }
};
