'use strict';

var incrMox = function(req, media, client, callback) {
  client.incr('moxboxx:moxlistCount', function(err, id) {
    if (err) {
      callback(err);
    } else {
      var mox = {
        id: id,
        content: media,
        created: new Date().getTime()
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

  if (errors.length > 0) {
    callback(errors);
  } else {
    remix.generate(url, client, function(err, media) {
      incrMox(req, media, client, callback);
    });
  }
};

exports.get = function(req, client, callback) {
  client.hgetall('moxboxx:mox:hash:' + req.params.id, function(err, m) {
    if (err) {
      callback(err);
    } else {
      if (m) {
        var mox = {
          id: m.id,
          content: m.content,
          created: m.created
        };

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
