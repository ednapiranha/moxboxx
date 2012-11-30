'use strict';

define(['jquery', 'utils'],
  function($, utils) {

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
            document.location.href = '/';
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
          document.location.href = '/logout';
        } else {
          console.log('Logout failed because ' + data.reason);
        }
      });
    },

    saveProfile: function(self) {
      utils.serverPost(self);
    }
  };

  return self;
});
