'use strict';

define(['jquery', 'video'],
  function($, videoActions) {

  var moxlist = $('#moxlist');
  var form = $('form');
  var tagList = $('#playlist-tags');

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

      moxlist.append(moxItem);
      var video = moxItem.find('iframe');

      videoActions.setVideos(video);
      form.find('input[type="text"]').val('');
    },

    remove: function(self) {
      self.fadeOut(function() {
        self.remove();
      });
    },

    addTag: function(self) {
      var playlistId = parseInt(self.find('input[name="playlist_id"]').val(), 10);

      var tagName = self.find('input[name="tag"]').val().trim().toLowerCase();
      var tagItem = $('<li data-tag="" data-action="/tag/' + playlistId + '"></li>');
      var tagLink = $('<a href=""></a>');
      tagLink.attr('href', '/#/tag/' + tagName);
      tagLink.text(tagName);

      tagItem.append(tagLink);
      var tagDelete = $('<a href="javascript:;" class="delete tag" data-context="delete-tag">X</a>');
      tagItem.append(tagDelete);
      tagList.append(tagItem);
    }
  };

  return self;
});
