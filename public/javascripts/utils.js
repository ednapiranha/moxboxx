'use strict';

define(['jquery'],
  function($) {

  var flash = $('#flash');

  var displayMessage = function(data) {
    var msg = data.responseText || data;

    if (typeof msg !== 'object') {
      msg = JSON.parse(msg);
    }

    flash.text(msg.message);
    flash.fadeIn(500, function() {
      flash.fadeOut(4500);
    });
  };

  var self = {
    serverPost: function(self, callback) {
      $.ajax({
        url: self.attr('action'),
        data: self.serialize(),
        type: 'POST',
        dataType: 'json',
        cache: false
      }).done(function(data) {
        if (data.message) {
          displayMessage(data);
        } else if (data.url) {
          document.location.href = data.url;
        }

        if (callback) {
          callback(data);
        }
      }).error(function(data) {
        displayMessage(data);
      });
    },

    serverDelete: function(self, options, callback) {
      console.log(self.data('action'), options)
      $.ajax({
        url: self.data('action'),
        data: options,
        type: 'DELETE',
        dataType: 'json',
        cache: false
      }).done(function(data) {
        if (callback) {
          callback(data);
        }
      }).error(function(data) {
        displayMessage(data);
      });
    },

    serverGet: function(self, callback) {
      $.ajax({
        url: self.attr('action'),
        type: 'GET',
        dataType: 'json'
      }).done(function(data) {
        if (callback) {
          callback(data);
        }
      }).error(function(data) {
        displayMessage(data);
      });
    },
  };

  return self;
});
