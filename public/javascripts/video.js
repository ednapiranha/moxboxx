'use strict';

define(['jquery'],
  function($) {

  var playNextVideo = function() {
    var count = 0;
    var nextVideoIdx;

    for (var i = 0; i < videoList.length; i ++) {
      if (videoList[i].id === currentPlay) {
        nextVideoIdx = i + 1;
        break;
      }
    }

    var nextVideo = videoList[nextVideoIdx];

    if (nextVideo) {
      if (nextVideo.youtube) {
        nextVideo.youtube.playVideo();
      } else if (nextVideo.vimeo) {
        nextVideo.vimeo.api('play');
      } else if (nextVideo.soundcloud) {
        nextVideo.soundcloud.play();
      }
    }
  };

  var checkYoutubeEnd = function(ev, id) {
    if (ev.data === 0) {
      playNextVideo();
    } else if (ev.data > 0) {
      currentPlay = id;
    }
  };

  var checkVimeoProgress = function(data, id) {
    var percent = parseFloat(data.percent);

    if (percent > 0.001 && percent < 1.000) {
      currentPlay = id;
    } else {
      checkVimeoEnd();
    }
  };

  var checkVimeoEnd = function() {
    playNextVideo();
  };

  var checkSoundCloudEnd = function(id) {
    currentPlay = id;
    playNextVideo();
  };

  var self = {
    setVideos: function(video) {
      var id = video[0].id;
      var options;

      if (video.hasClass('youtube')) {
        var player = new YT.Player(id, {
          events: {
            'onStateChange': function(ev) {
              checkYoutubeEnd(ev, id);
            }
          }
        });
        options = { 'youtube': player, id: id };

      } else if (video.hasClass('vimeo')) {
        var player = $f(video[0]);
        player.addEvent('ready', function() {
          currentPlay = id;
          player.addEvent('finish', checkVimeoEnd);
          player.addEvent('playProgress', checkVimeoProgress);
        });
        options = { 'vimeo': player, id: id };

      } else if (video.hasClass('soundcloud')) {
        var player = SC.Widget(id);
        player.bind(SC.Widget.Events.READY, function() {
          player.bind(SC.Widget.Events.FINISH, function() {
            checkSoundCloudEnd(id);
          });
        });
        options = { 'soundcloud': player, id: id };
      }

      videoList.push(options);
    }
  };

  return self;
});
