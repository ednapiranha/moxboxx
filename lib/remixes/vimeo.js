'use strict';

// Generate Vimeo iframe
var SERVICE_VIMEO = /vimeo/i;

exports.process = function(media, remix, options) {
  if (media.match(SERVICE_VIMEO)) {
    var url = media.split('/');
    var vimeoId = parseInt(url[url.length - 1], 10);

    if (!isNaN(vimeoId)) {
      remix = '<div class="object-wrapper"><iframe src="//player.vimeo.com/video/' + vimeoId + '" ' +
        'width="' + options.width + '" height="' + options.height + '" frameborder="0" ' +
        'webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe></div>';

    } else {
      return remix;
    }
  }
  return remix;
};
