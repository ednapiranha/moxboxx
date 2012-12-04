'use strict';

var matchYoutube = require('./remixes/youtube');
var matchVimeo = require('./remixes/vimeo');
var matchSoundCloud = require('./remixes/soundcloud');

var VIDEO_HEIGHT = 295;
var VIDEO_WIDTH = 525;

var checkRemixes = function(media, remix, callback) {
  remix = matchYoutube.process(media, remix, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });
  remix = matchVimeo.process(media, remix, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT });

  return remix;
};

/* Embed media if it matches any of the following:
 * 1. Is a Youtube link
 * 2. Is a Vimeo link
 * 3. Is a Soundcloud link
 */
exports.generate = function(media, callback) {
  var remix;

  matchSoundCloud.process(media, remix, function(errSndCld, remix) {
    if (errSndCld) {
      callback(errSndCld);

    } else {
      callback(null, checkRemixes(media, remix));
    }
  });
};
