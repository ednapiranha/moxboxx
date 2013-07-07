'use strict';

define(['jquery'],
  function($) {

  var VideoPlayer = function () {
    this.repeatPlaylist = false;
    this.videoList = [];
  };

  VideoPlayer.prototype.setVideos = function (video) {
    var id = video[0].id;
    var self = this;
    var options;

    if (video.hasClass('youtube')) {
      var player = new YT.Player(id, {
        events: {
          'onStateChange': function(ev) {
            checkYoutubeEnd(self, ev, id);
          }
        }
      });

      options = { 'youtube': player, id: id };
      getMetadata(this, video);

    } else if (video.hasClass('vimeo')) {
      var player = $f(video[0]);

      player.addEvent('ready', function () {
        self.currentPlay = id;

        player.addEvent('finish', function () {
          checkVimeoEnd(self);
        });
        player.addEvent('playProgress', function (data) {
          checkVimeoProgress(self, data, id);
        });
      });

      options = { 'vimeo': player, id: id };
      getMetadata(this, video);

    } else if (video.hasClass('soundcloud')) {
      var player = SC.Widget(id);

      player.bind(SC.Widget.Events.READY, function () {
        player.bind(SC.Widget.Events.FINISH, function() {
          checkSoundCloudEnd(self, id);
        });
      });

      options = { 'soundcloud': player, id: id };
    }

    this.videoList.push(options);
  };

  VideoPlayer.prototype.togglePlay = function () {
    startInitialVideo(this);
  };

  VideoPlayer.prototype.toggleRepeat = function() {
    if (!this.repeatPlaylist) {
      this.repeatPlaylist = true;
    } else {
      this.repeatPlaylist = false;
    }
  };

  var stopVideos = function (self) {
    for (var i = 0; i < self.videoList.length; i ++) {
      if (self.videoList[i]) {
        if (self.videoList[i].youtube) {
          console.log(self.videoList[i].youtube)
          self.videoList[i].youtube.pauseVideo();

        } else if (self.videoList[i].vimeo) {
          self.videoList[i].vimeo.api('pause');

        } else if (self.videoList[i].soundcloud) {
          self.videoList[i].soundcloud.pause();

        }
      }
    }
  };

  var startInitialVideo = function (self) {
    stopVideos(self);
    self.currentPlay = self.videoList[0].id;

    if (self.videoList[0].youtube) {
      self.videoList[0].youtube.playVideo();
    } else if (self.videoList[0].vimeo) {
      self.videoList[0].vimeo.api('play');
    } else if (self.videoList[0].soundcloud) {
      self.videoList[0].soundcloud.play();
    }
  };

  var playNextVideo = function (self) {
    var count = 0;
    var nextVideoIdx;

    if (self.repeatPlaylist &&
      self.videoList[self.videoList.length - 1].id === self.currentPlay) {

      nextVideoIdx = 0;
      stopVideos(self);
      self.currentPlay = self.videoList[0].id;
    } else {
      for (var i = 0; i < self.videoList.length; i ++) {
        if (self.videoList[i].id === self.currentPlay) {
          nextVideoIdx = i + 1;
          break;
        }
      }
    }

    var nextVideo = self.videoList[nextVideoIdx];

    if (nextVideo) {
      if (nextVideo.youtube) {
        nextVideo.youtube.playVideo();
      } else if (nextVideo.vimeo) {
        nextVideo.vimeo.api('play');
      } else if (nextVideo.soundcloud) {
        nextVideo.soundcloud.play();
      }
    } else {
      if (self.repeatPlaylist) {
        self.currentPlay = self.videoList[self.videoList.length - 1].id;
        playNextVideo(self);
      }
    }
  };

  var checkYoutubeEnd = function (self, ev, id) {
    if (ev.data === 0) {
      playNextVideo(self);
    } else if (ev.data > 0) {
      self.currentPlay = id;
    }
  };

  var checkVimeoProgress = function (self, data, id) {
    var percent = parseFloat(data.percent);

    if (percent >= 0 && percent < 1.000) {
      self.currentPlay = id;
    } else {
      checkVimeoEnd(self);
    }
  };

  var checkVimeoEnd = function (self) {
    playNextVideo(self);
  };

  var checkSoundCloudEnd = function (self, id) {
    self.currentPlay = id;
    playNextVideo(self);
  };

  var getMetadata = function (self, video) {
    if (video.hasClass('youtube')) {
      var id = video.attr('src').split('/embed/')[1].split('?wmode')[0];

      $.getJSON('https://gdata.youtube.com/feeds/api/videos?q=' + id + '&v=2&alt=jsonc', function(d) {
        if (d.data) {
          video.closest('li').find('.metadata').append('<span></span>').find('span').text(d.data.items[0].title);
        }
      });
    } else if (video.hasClass('vimeo')) {
      var id = video.attr('src').split('/video/')[1].split('?api')[0];
      $.getJSON('http://vimeo.com/api/v2/video/' + id + '.json?callback=?', function(d) {
        if (d) {
          video.closest('li').find('.metadata').append('<span></span>').find('span').text(d[0].title);
        }
      });
    }
  };

  return VideoPlayer;
});
