'use strict';

define(['jquery'],
  function($) {

  var self = {
    add: function(self) {
      $.ajax({
        url: self.attr('action'),
        data: self.serialize(),
        type: self.attr('method'),
        dataType: 'json',
        cache: false
      }).done(function(data) {
        console.log(data.mox)
      }).error(function(data) {
        flash.text(JSON.parse(data.responseText).message);
        flash.fadeIn(500, function() {
          flash.fadeOut(4500);
        });
      });
    }
  };

  return self;
});
