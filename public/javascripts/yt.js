var videoList = [];

// Define YT_ready function.
var YT_ready = (function() {
    var onReady_funcs = [], api_isReady = false;
    /* @param func function     Function to execute on ready
     * @param func Boolean      If true, all qeued functions are executed
     * @param b_before Boolean  If true, the func will added to the first
                                 position in the queue*/
    return function(func, b_before){
        if (func) {
            api_isReady = true;
            for (var i = 0; i < onReady_funcs.length; i ++) {
                // Removes the first func from the array, and execute func
                onReady_funcs.shift()();
            }
        } else if (typeof func === "function") {
            if (api_isReady) {
              func();
            } else {
              onReady_funcs[b_before?"unshift":"push"](func);
            }
        }
    }
})();

// This function will be called when the API is fully loaded
var onYouTubePlayerAPIReady = function() {
  YT_ready(true);
};
