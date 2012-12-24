'use strict';

// Generate Soundcloud iframe
var SERVICE_SOUNDCLOUD = /soundcloud\.com\/[A-Z0-9-_]+\/[A-Z0-9-_]+/gi;
var request = require('request');
var qs = require('querystring');

exports.process = function(media, remix, callback) {
  if (media.match(SERVICE_SOUNDCLOUD)) {
    var params = {
      format: 'json',
      url: media,
      enable_api: true
    };

    request.get('http://soundcloud.com/oembed?' + qs.stringify(params), function(error, resp, body) {
      if (error) {
        callback(new Error('Invalid Soundcloud url'));

      } else {
        try {
          var jsonResp = JSON.parse(body);
          if (jsonResp.html) {
            var id = jsonResp.html.split('%2Ftracks%2F')[1].split('&')[0] + new Date().getTime().toString();
            jsonResp.html = jsonResp.html.replace(/<iframe/, '<iframe class="soundcloud" ' +
              'id="video-soundcloud-' + id + '"').replace(/src="http:/, 'src="');
            remix = '<div class="object-wrapper">' +
            jsonResp.html + '</div>';
            callback(null, remix);
          } else {
            callback(null, remix);
          }
        } catch(error) {
          callback(new Error('This Soundcloud has disabled embedding'));
        }
      }
    });

  } else {
    callback(null, remix);
  }
};
