'use strict';

define(['jquery'],
  function($) {

  var playNextVideo = function(target) {
    target.closest('.item').next().find('iframe').click();
  };

  var checkYoutubeEnd = function(ev) {
    var target = $(ev.target);

    if (ev.data === 0) {
      console.log('finished youtube')
      playNextVideo(target);
    }
    console.log("onStateChange:" + ev.data);
  };

  var checkVimeoEnd = function() {
    console.log('finished vimeo')
    //playNextVideo(target);
  };

  var checkSoundCloudEnd = function() {
    console.log('finished soundcloud')
  };

  var self = {
    setVideos: function(video, prepend) {
      var options;
      if (video.hasClass('youtube')) {
        var player = new YT.Player(video[0].id, {
          events: {
            'onStateChange': checkYoutubeEnd
          }
        });
        options = { 'youtube': player };

      } else if (video.hasClass('vimeo')) {
        var player = $f(video[0]);

        player.addEvent('ready', function() {
          player.addEvent('finish', checkVimeoEnd);
        });
        options = { 'vimeo': player };

      } else if (video.hasClass('soundcloud')) {
        // Todo
      }

      if (prepend) {
        videoList.unshift(options);

      } else {
        videoList.push(options);
      }
    },

    playYoutube: function(id) {
      player = new YT.Player(videoId, {
        events: {
          'onStateChange': checkYoutubeEnd
        }
      }).playVideo();
    },

    listenSoundcloud: function(id) {
      SC.stream(id, function(sound) {
        console.log(sound)
      });
    },

    playSoundcloud: function(id) {
    },

    playVimeo: function(id) {
      player = $f($(id)[0]);

      player.addEvent('ready', function() {
        player.addEvent('play');
      });
    }

  };

  return self;
});
