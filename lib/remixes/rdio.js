'use strict';

// Generate Rdio iframe
var SERVICE_RDIO = /(((rdio\.com)|(rd\.io))\/[A-Z0-9-_]+\/[A-Z0-9-_]+)/gi;

exports.process = function(media, remix) {
  if (media.match(SERVICE_RDIO)) {
    var url = media.split('/');
    var rdioId = url[url.length -1];

    try {
      remix = '<div class="object-wrapper"><iframe class="rdio" width="450" height="80" ' +
        'src="//rd.io/i/' + rdioId + '" frameborder="0"></iframe></div>';
    } catch(err) {
      return remix;
    }
  }
  return remix;
};
