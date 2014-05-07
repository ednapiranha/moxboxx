// Module dependencies.
module.exports = function(app, configurations, express) {
  var RedisStore = require('connect-redis')(express);
  var nconf = require('nconf');
  var requirejs = require('requirejs');
  var maxAge = 24 * 60 * 60 * 1000 * 28;

  nconf.argv().env().file({ file: 'local.json' });

  // Configuration

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { layout: false });
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    if (!process.env.NODE_ENV) {
      app.use(express.logger('dev'));
      app.use(express.static(__dirname + '/public'));
    } else {
      app.use(express.static(__dirname + '/public_build'));
    }
    app.use(express.session({
      secret: nconf.get('session_secret'),
      store: new RedisStore({ db: nconf.get('redis_db'), prefix: 'moxboxx' }),
      cookie: { maxAge: maxAge }
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(function(req, res, next) {
      res.locals.analytics = nconf.get('analytics');
      res.locals.session = req.session;
      next();
    });
    app.use(app.router);
    app.locals.pretty = true;
    app.use(function(req, res, next) {
      res.status(404);
      res.render('404', { url: req.url, layout: false });
      return;
    });
    app.use(function(req, res, next) {
      res.status(403);
      res.render('403', { url: req.url, layout: false });
      return;
    });
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('500', { error: err, layout: false });
    });
  });

  app.configure('development, test', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('prod', function(){
    app.use(express.errorHandler());

    requirejs.optimize({
      appDir: 'public/',
      baseUrl: 'javascripts/',
      enforceDefine: true,
      dir: "public_build",
      modules: [
        {
          name: 'main'
        }
      ]
    }, function() {
      console.log('Successfully optimized javascript');
    });
  });

  return app;
};
