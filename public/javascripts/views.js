'use strict';

define(['jquery'],
  function($) {

  var moxlist = $('#moxlist');
  var form = $('form');

  var self = {
    moxItem: function(options) {
      var moxItem = $('<li class="item" data-action="/mox/" data-id="" data-playlistid=""></li>');

      var actions = $('<div class="item-actions"></div>');
      moxItem.attr('data-id', options.id);
      moxItem.attr('data-playlistid', options.playlistId);
      if (options.isDeletable) {
        actions.html('<a href="javascript:;" class="mox-delete" data-context="mox-delete">delete</a>');
      }
      moxItem.html(options.content).append(actions);

      moxlist.prepend(moxItem);
      form.find('input[type="text"]').val('');
    },

    remove: function(self) {
      self.remove();
    }
  };

  return self;
});
