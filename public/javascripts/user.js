'use strict';

define(['jquery'],
  function($) {

  var flash = $('#flash');

  var self = {
    login: function() {
      navigator.id.get(function(assertion) {
        if (!assertion) {
          return;
        }

        $.ajax({
          url: '/persona/verify',
          type: 'POST',
          data: { assertion: assertion },
          dataType: 'json',
          cache: false
        }).done(function(data) {
          if (data.status === 'okay') {
            document.location.href = '/profile';
          } else {
            console.log('Login failed because ' + data.reason);
          }
        });
      });
    },

    logout: function() {
      $.ajax({
        url: '/persona/logout',
        type: 'POST',
        dataType: 'json',
        cache: false
      }).done(function(data) {
        if (data.status === 'okay') {
          document.location.href = '/';
        } else {
          console.log('Logout failed because ' + data.reason);
        }
      });
    },

    saveProfile: function(self) {
      $.ajax({
        url: self.attr('action'),
        data: self.serialize(),
        type: self.attr('method'),
        dataType: 'json',
        cache: false
      }).done(function(data) {
        if (data.message) {
          flash.text(data.message);
          flash.fadeIn(500, function() {
            flash.fadeOut(4500);
          });
        } else {
          document.location.href = data.url;
        }
      }).error(function(data) {
        flash.text(JSON.parse(data.responseText).message);
        flash.fadeIn(500, function() {
          flash.fadeOut(4500);
        });
      });
    }
  };

  return self;
});
