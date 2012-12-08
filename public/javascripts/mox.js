'use strict';

define(['jquery', 'utils', 'views', 'video'],
  function($, utils, views, video) {

  var self = {
    add: function(self) {
      utils.serverPost(self, function(data) {
        views.moxItem({
          content: data.mox.content,
          isDeletable: true,
          playlistId: data.mox.playlist_id,
          id: data.mox.id
        });
      });
    },

    delete: function(self, options) {
      utils.serverDelete(self, options);
      views.remove(self);
    },

    updatePosition: function(sortedList) {
      $.ajax({
        url: '/mox/position',
        data: sortedList,
        type: 'POST',
        dataType: 'json',
        cache: false
      });
    }
  };

  return self;
});
