'use strict';

requirejs.config({
  baseUrl: '/javascripts',
  enforceDefine: true,
  paths: {
    jquery: '/javascripts/jquery'
  }
});

define(['jquery', 'user', 'playlist', 'mox'],
  function($, user, playlist, mox) {

  var body = $('body');
  var form = $('form');
  var editTitle = $('#edit-title');
  var playlistTitle = $('h1#playlist-title > span');
  var playlistEdit = $('.playlist-edit');
  var playlistEditCancel = $('.playlist-edit-cancel');
  var playlistEditSave = $('.playlist-edit-save');

  var resetEditActions = function(titleEl) {
    editTitle.addClass('off');
    playlistTitle.text(titleEl.val()).removeClass('off');
    playlistEdit.removeClass('off');
    playlistEditCancel.addClass('off');
    playlistEditSave.addClass('off');
  };

  body.on('click', function(ev) {
    var self = $(ev.target);

    switch (self[0].id) {
      // persona login
      case 'login':
        ev.preventDefault();
        user.login();
        break;

      // persona logout
      case 'logout':
        ev.preventDefault();
        user.logout();
        break;
    }

    switch (self.data('context')) {
      // mox delete
      case 'mox-delete':
        var item = self.closest('.item');
        mox.delete(item, {
          playlist_id: item.data('playlistid'),
          id: item.data('id')
        });
        break;

      // playlist delete
      case 'playlist-delete':
        var item = self.closest('.item');
        playlist.delete(item, {
          id: item.data('id')
        });
        break;

      // playlist star/unstar
      case 'playlist-star':
        playlist.star(self);
        if (self.hasClass('on')) {
          self.removeClass('on').text('star');
        } else {
          self.addClass('on').text('unstar');
        }
        break;

      // playlist edit
      case 'playlist-edit':
        playlistEditCancel.removeClass('off');
        playlistEdit.addClass('off');
        playlistTitle.addClass('off');
        playlistEditSave.removeClass('off');
        editTitle
          .focus()
          .removeClass('off');
        break;

      // cancel playlist edit
      case 'playlist-edit-cancel':
        self.addClass('off');
        playlistEdit.removeClass('off');
        playlistTitle.removeClass('off');
        editTitle.addClass('off');
        playlistEditSave.addClass('off');
        break;

      // save playlist
      case 'playlist-edit-save':
        self.closest('form').submit();
    }
  });

  form.submit(function(ev) {
    var self = $(this);

    switch (self[0].id) {
      // profile editing
      case 'profile-edit':
        ev.preventDefault();
        user.saveProfile(self);
        break;

      // add playlist
      case 'new-playlist':
        ev.preventDefault();
        playlist.add(self);
        break;

      // add mox
      case 'new-mox':
        ev.preventDefault();
        mox.add(self);
        break;

      case 'edit-playlist-title':
        ev.preventDefault();

        var titleEl = editTitle;

        playlist.update(self, function() {
          resetEditActions(titleEl);
        });
        break;
    }
  });
});
