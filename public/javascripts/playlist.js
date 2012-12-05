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

    update: function(self, callback) {
      utils.serverPost(self, function(data) {
        if (data.message) {
          flash.text(data.message);
          flash.fadeIn(500, function() {
            flash.fadeOut(4500);
          });
        }

        if (callback) {
          callback();
        }
      });
    },

    star: function(self, callback) {
      utils.serverPost(self, function(data) {
        if (data.message) {
          flash.text(data.message);
          flash.fadeIn(500, function() {
            flash.fadeOut(4500);
          });
        }

        if (callback) {
          callback();
        }
      });
    },

    delete: function(self, options, refresh) {
      utils.serverDelete(self, options, function() {
        if (refresh) {
          document.location.href = '/dashboard';
        } else {
          views.remove(self);
        }
      });
    },

    addTag: function(self, callback) {
      utils.serverPost(self, function(data) {
        views.addTag(self);
        if (data.message) {
          flash.text(data.message);
          flash.fadeIn(500, function() {
            flash.fadeOut(4500);
          });
        }

        if (callback) {
          callback();
        }
      });
    }
  };

  return self;
});
