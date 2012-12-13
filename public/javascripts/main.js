'use strict';

requirejs.config({
  baseUrl: '/javascripts',
  enforceDefine: true,
  paths: {
    jquery: '/javascripts/jquery'
  }
});

define(['jquery', 'user', 'playlist', 'mox', 'video'],
  function($, user, playlist, mox, videoActions) {

  var body = $('body');
  var form = $('form');
  var title = $('title');
  var wrapper = $('.wrapper');
  var editTitle = $('#edit-title');
  var editDescription = $('#edit-description');
  var playlistTitle = $('h1#playlist-title > span.title');
  var playlistDescription = $('h1#playlist-title > span.description');
  var playlistEdit = $('.playlist-edit');
  var playlistEditCancel = $('.playlist-edit-cancel');
  var playlistEditSave = $('.playlist-edit-save');
  var tagList = $('#playlist-tags');
  var sortMox = $('#moxlist.sortable');
  var flash = $('#flash');
  var footer = $('#footer');

  if (document.location.href.indexOf('error=1') > -1) {
    flash
      .addClass('error')
      .text(unescape(document.location.href.split('msg=')[1]));
    flash.fadeIn(500, function() {
      flash.fadeOut(4500);
    });
  }

  var loadVideos = function() {
    $('#moxlist .object-wrapper iframe').each(function(idx, video) {
      videoActions.setVideos($(video));
    });
  };

  var loadMetaAndVideos = function(url) {
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json',
      cache: false
    }).done(function(data) {
      body.css('background-image', 'url(' + data.background + ')');
      body.addClass('page-' + data.pageType);
      title.text(data.title);

      if (data.pageType === 'playlist') {
        $('#meta-title').attr('content', data.playlist.title);
        $('#meta-url').attr('content', 'http://' + document.location.host + '/playlist/' + data.playlist.id);
        $('#meta-description').attr('content', data.playlist.description);
        loadVideos();
      }
    });
  };

  // Routing for pages
  var checkUrl = function() {
    var url = document.location.hash;
    if (url.match(/^#\//)) {
      url = url.split('#')[1];
      body.removeClass();
      $.get(url, function(data) {
        wrapper.html(data)
          .promise()
          .done(function() {
            loadMetaAndVideos(url);
          });
      });
    } else if (wrapper.html().length === 0) {
      document.location.href = '/#/dashboard';
    }
  };

  checkUrl();

  $(window).bind('hashchange', function() {
    checkUrl();
  });

  var resetEditActions = function(titleEl, descriptionEl) {
    editTitle.addClass('off');
    editDescription.addClass('off');
    playlistTitle.text(titleEl.val()).removeClass('off');
    playlistDescription.text(descriptionEl.val()).removeClass('off');
    playlistEdit.removeClass('off');
    playlistEditCancel.addClass('off');
    playlistEditSave.addClass('off');
  };

  sortMox.sortable({
    update: function() {
      var sortArr = [];
      var moxItems = sortMox.find('.item');

      for (var i = 0; i < moxItems.length; i ++) {
        var m = $(moxItems[i]);
        sortArr.push({
          id: m.data('id'),
          playlist_id: m.data('playlistid'),
          pos: i
        });
      }

      mox.updatePosition({ sort_arr: sortArr });
    }
  });
  sortMox.disableSelection();

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

      // start playlist
      case 'play-playlist':
        ev.preventDefault();
        videoActions.togglePlay();
        break;

      // repeat playlist
      case 'repeat-playlist':
        ev.preventDefault();
        if (self.hasClass('on')) {
          self.removeClass('on');
        } else {
          self.addClass('on');
        }
        videoActions.toggleRepeat();
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
        sortMox.sortable('refresh');
        break;

      // playlist delete
      case 'playlist-delete':
        var item = self.closest('.item');
        playlist.delete(item, {
          id: item.data('id')
        });
        break;

      // playlist delete
      case 'playlist-delete-detail':
        playlist.delete(self, {
          id: self.data('id')
        }, true);
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
        playlistDescription.addClass('off');
        playlistEditSave.removeClass('off');
        editTitle.focus();
        editTitle.val(playlistTitle.text());
        editTitle.removeClass('off');
        editDescription.val(playlistDescription.text());
        editDescription.removeClass('off');
        break;

      // cancel playlist edit
      case 'playlist-edit-cancel':
        self.addClass('off');
        playlistEdit.removeClass('off');
        playlistTitle.removeClass('off');
        playlistDescription.removeClass('off');
        editTitle.addClass('off');
        editDescription.addClass('off');
        playlistEditSave.addClass('off');
        break;

      // save playlist
      case 'playlist-edit-save':
        self.closest('form').submit();

      // delete tag
      case 'delete-tag':
        ev.preventDefault();
        playlist.delete(self.parent(), { tag: self.parent().data('tag') });
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
        sortMox.sortable('refresh');
        break;

      // add tag
      case 'new-tag':
        ev.preventDefault();
        playlist.addTag(self, function() {
          self.find('input[name="tag"]').val('');
        });
        break;

      case 'edit-playlist-title':
        ev.preventDefault();

        playlist.update(self, function() {
          resetEditActions(editTitle, editDescription);
        });
        break;
    }
  });
});
