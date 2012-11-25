'use strict';

define(['jquery', 'utils', 'views'],
  function($, utils, views) {

  var self = {
    add: function(self) {
      utils.serverPost(self, function(data) {
        views.moxItem({
          content: data.mox.content
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
