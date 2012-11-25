'use strict';

define(['jquery'],
  function($) {

  var moxlist = $('#moxlist');

  var self = {
    moxItem: function(options) {
      var moxItem = $('<li>' + options.content + '</li>');
      moxlist.prepend(moxItem);
    }
  };

  return self;
});
