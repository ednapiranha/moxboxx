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
    }
  });
});
