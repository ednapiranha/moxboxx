'use strict';

define(['jquery'],
  function($) {

  var repeatPlaylist = false;

  var stopVideos = function() {
    for (var i = 0; i < videoList.length; i ++) {
      if (videoList[i].youtube) {
        videoList[i].youtube.pauseVideo();

      } else if (videoList[i].vimeo) {
        videoList[i].vimeo.api('pause');

      } else if (videoList[i].soundcloud) {
        videoList[i].soundcloud.pause();

      }
    }
  };

  var startInitialVideo = function() {
    stopVideos();
    currentPlay = videoList[0].id;

    if (videoList[0].youtube) {
      videoList[0].youtube.playVideo();
    } else if (videoList[0].vimeo) {
      videoList[0].vimeo.api('play');
    } else if (videoList[0].soundcloud) {
      videoList[0].soundcloud.play();
    }
  };

  var playNextVideo = function() {
    var count = 0;
    var nextVideoIdx;

    if (repeatPlaylist && videoList[videoList.length - 1].id === currentPlay) {
      nextVideoIdx = 0;
      stopVideos();
      currentPlay = videoList[0].id;
    } else {
      for (var i = 0; i < videoList.length; i ++) {
        if (videoList[i].id === currentPlay) {
          nextVideoIdx = i + 1;
          break;
        }
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
    } else {
      if (repeatPlaylist) {
        playNextVideo();
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
    },

    togglePlay: function() {
      startInitialVideo();
    },

    toggleRepeat: function() {
      if (!repeatPlaylist) {
        repeatPlaylist = true;
      } else {
        repeatPlaylist = false;
      }
    }
  };

  return self;
});
