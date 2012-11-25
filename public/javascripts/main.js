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

    switch (true) {
      // persona login
      case self.is('#login'):
        ev.preventDefault();
        user.login();
        break;

      // persona logout
      case self.is('#logout'):
        ev.preventDefault();
        user.logout();
        break;

      // playlist delete
      case self.hasClass('.playlist-delete'):
        playlist.delete(self);
        break;
    }
  });

  form.submit(function(ev) {
    ev.preventDefault();

    var self = $(this);

    switch (true) {
      // profile editing
      case self.is('#profile-edit'):
        user.saveProfile(self);
        break;

      // add playlist
      case self.is('#new-playlist'):
        playlist.add(self);
        break;

      // add mox
      case self.is('#new-mox'):
        mox.add(self);
        break;
    }
  });
});
