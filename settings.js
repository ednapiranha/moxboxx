// Module dependencies.
module.exports = function(app, configurations, express) {
  var nconf = require('nconf');
  var MemoryStore = require('connect').session.MemoryStore;

  nconf.argv().env().file({ file: 'local.json' });

  // Configuration

  app.configure(function(){
    app.use(express.cookieParser());
    app.use(express.session({
      secret: nconf.get('session_secret'),
      store: new MemoryStore({ reapInterval: 60000 * 10 }),
      cookie: { maxAge: 990000000 } // 1 week-ish
    }));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { layout: false });
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);
  });

  app.configure('development, test', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('production', function(){
    app.use(express.errorHandler());
  });

  app.dynamicHelpers({
    session: function (req, res) {
      return req.session;
    }
  });

  return app;
};
