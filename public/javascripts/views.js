'use strict';

define(['jquery'],
  function($) {

  var moxlist = $('#moxlist');
  var form = $('form');

  var self = {
    moxItem: function(options) {
      var moxItem = $('<li data-id="" data-playlistid=""></li>');

      moxItem.attr('data-id', options.id);
      moxItem.attr('data-playlistid', options.playlistId);
      moxItem.html(options.content);

      moxlist.prepend(moxItem);
      form.find('input[type="text"]').val('');
    },

    remove: function(self) {
      self.remove();
    }
  };

  return self;
});
