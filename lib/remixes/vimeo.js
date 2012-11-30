'use strict';

// Generate Vimeo iframe
var SERVICE_VIMEO = /vimeo/i;

exports.process = function(media, remix, options) {
  if (media.match(SERVICE_VIMEO)) {
    var url = media.split('/');
    var vimeoId = parseInt(url[url.length - 1], 10);

    if (!isNaN(vimeoId)) {
      var id = 'video-vimeo-' + vimeoId + new Date().getTime().toString();
      remix = '<div class="object-wrapper">' +
        '<iframe src="//player.vimeo.com/video/' + vimeoId + '?api=1&player_id=' + id + '" ' +
        'class="vimeo" id="' + id + '"' +
        'width="' + options.width + '" height="' + options.height + '" frameborder="0" ' +
        'webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe></div>';

    } else {
      return remix;
    }
  }
  return remix;
};
