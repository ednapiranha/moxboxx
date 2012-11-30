'use strict';

// Generate Youtube iframe
var SERVICE_YOUTUBE = /(youtube.com(?:\/#)?\/watch\?)|(youtu\.be\/[A-Z0-9-_]+)/i;

exports.process = function(media, remix, options) {
  if (media.match(SERVICE_YOUTUBE)) {
    var youtubeId = '';
    var url = media.split('/');

    try {
      if (media.indexOf('youtu.be') > -1) {
        youtubeId = url[url.length - 1];
      } else {
        youtubeId = url[url.length - 1].split('v=')[1].split('&')[0];
      }
      remix = '<div class="object-wrapper">' +
        '<iframe width="' + options.width + '" class="youtube" id="video-youtube-' + youtubeId + '" height="' +
        options.height + '" src="//www.youtube.com/embed/' + youtubeId +
        '?wmode=transparent&version=3&enablejsapi=1 " frameborder="0" allowfullscreen></iframe></div>';

    } catch(err) {
      return remix;
    }
  }

  return remix;
};
