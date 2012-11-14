'use strict';

var matchYoutube = require('./remixes/youtube');
var matchVimeo = require('./remixes/vimeo');
var matchSoundCloud = require('./remixes/soundcloud');
var matchMixCloud = require('./remixes/mixcloud');
var matchRdio = require('./remixes/rdio');

var VIDEO_HEIGHT = 295;
var VIDEO_WIDTH = 525;

var checkRemixes = function(media, remix, client, callback) {
  remix = matchYoutube.process(media, remix, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
  remix = matchRdio.process(media, remix);
  remix = matchVimeo.process(media, remix, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });

  callback(remix);
};

/* Embed media if it matches any of the following:
 * 1. Is a Youtube link
 * 2. Is a Vimeo link
 * 3. Is an Rdio link
 * 4. Is a Soundcloud link
 * 5. Is a Mixcloud link
 */
exports.generate = function(media, client, callback) {
  process.nextTick(function() {
    var remix = {
      isMatched: false,
      result: media
    };

    matchSoundCloud.process(media, remix, function(errSndCld, remix) {
      if (errSndCld) {
        callback(errSndCld);

      } else {
        if (!remix.isMatched) {
          matchMixCloud.process(media, remix, function(errMixCld, remix) {
            if (errMixCld) {
              callback(errMixCld);
            } else {
              if (!remix.isMatched) {

                checkRemixes(media, remix, client, function(remix) {
                  callback(null, remix.result);
                });
              } else {
                callback(null, remix.result);
              }
            }
          });

        } else {
          callback(null, remix.result);
        }
      }
    });
  });
};
