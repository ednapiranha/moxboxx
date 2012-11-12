'use strict';

$(function() {
  var loginForm = $('form#login-form');

  loginForm.on('click', '#login', function(ev) {
    ev.preventDefault();
    navigator.id.request();
  });

  navigator.id.watch({
    onlogin: function(assertion) {
      loginForm.find('input[name="bid_assertion"]').val(assertion);
      loginForm.submit();
    },
    onlogout: function() { }
  });
});
