'use strict';

var request = require('request');

/* Persona authentication
 * Requires: web request, settings
 * Returns: A Persona email if successful
 */
exports.verify = function(req, nconf, callback) {
  var authUrl = nconf.get('authUrl') + '/verify';
  var siteUrl = nconf.get('domain') + ':' + nconf.get('authPort');

  if (!req.body.bid_assertion) {
    return callback(new Error('Invalid assertion'));
  }

  var qs = {
    assertion: req.body.bid_assertion,
    audience: siteUrl
  };

  var params = {
    url: authUrl,
    form: qs
  };

  request.post(params, function(err, resp, body) {
    if (err) {
      return callback(error);
    }

    try {
      var jsonResp = JSON.parse(body);

      if (jsonResp.status === 'okay') {
        var email = jsonResp.email;

        return callback(null, email);
      } else {
        return callback(jsonResp);
      }
    } catch (error) {
      return callback(error);
    }
  });
};
