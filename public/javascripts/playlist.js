'use strict';

define(['jquery', 'utils'],
  function($, utils) {

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
    }
  };

  return self;
});
