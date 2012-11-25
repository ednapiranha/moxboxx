'use strict';

define(['jquery', 'utils', 'views'],
  function($, utils, views) {

  var flash = $('#flash');

  var self = {
    add: function(self) {
      utils.serverPost(self, function(data) {
        if (data.message) {
          flash.text(data.message);
          flash.fadeIn(500, function() {
            flash.fadeOut(4500);
          });
        } else {
          document.location.href = data.url;
        }
      });
    },

    delete: function(self, options) {
      utils.serverDelete(self, options);
      views.remove(self);
    }
  };

  return self;
});
