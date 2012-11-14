'use strict';

requirejs.config({
  baseUrl: '/javascripts',
  enforceDefine: true,
  paths: {
    jquery: '/javascripts/jquery'
  }
});

define(['jquery', 'persona'],
  function($, persona, roller) {

  var body = $('body');
  var form = $('form');
  var flash = $('#flash');

  body.on('click', function(ev) {
    var self = $(ev.target);

    switch (true) {
      // persona login
      case self.is('#login'):
        ev.preventDefault();
        persona.login();
        break;

      // persona logout
      case self.is('#logout'):
        ev.preventDefault();
        persona.logout();
        break;
    }
  });

  form.submit(function(ev) {
    ev.preventDefault();

    var self = $(this);

    $.ajax({
      url: self.attr('action'),
      data: self.serialize(),
      type: self.attr('method'),
      dataType: 'json',
      cache: false
    }).done(function(data) {
      flash.text('updated!');
    }).error(function(data) {
      flash.text(JSON.parse(data.responseText).message);
      flash.fadeIn(2500, function() {
        flash.fadeOut(3500);
      });
    });
  });
});
