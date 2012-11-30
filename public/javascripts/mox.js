'use strict';

define(['jquery', 'utils', 'views', 'video'],
  function($, utils, views, video) {

  var self = {
    add: function(self) {
      utils.serverPost(self, function(data) {
        views.moxItem({
          content: data.mox.content,
          isDeletable: data.mox.isDeletable,
          playlistId: data.mox.playlistId,
          id: data.mox.id
        });
      });
    },

    delete: function(self, options) {
      utils.serverDelete(self, options);
      views.remove(self);
    }
  };

  return self;
});
