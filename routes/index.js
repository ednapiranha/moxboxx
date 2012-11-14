module.exports = function(app, client, isLoggedIn, hasUsername) {
  var user = require('../lib/user');

  app.get('/', function (req, res) {
    if (req.session.email) {
      if (req.session.username) {
        res.redirect('/dashboard');
      } else {
        res.redirect('/profile');
      }
    } else {
      res.render('index', {
        pageType: 'index',
        session: req.session
      });
    }
  });

  app.get('/profile', isLoggedIn, function (req, res) {
    user.loadProfile(req, client, function(err, user) {
      if (!err) {
        req.session.username = user.username;
      }
    });

    res.render('profile', {
      pageType: 'profile',
      session: req.session
    });
  });

  app.post('/profile', isLoggedIn, function(req, res) {
    user.saveProfile(req, client, function(err, user) {
      if (err) {
        res.status(500);
        res.json({ message: err.toString() });
      } else {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ message: 'Profile has been updated!' });
      }
    });
  });

  app.get('/dashboard', isLoggedIn, hasUsername, function (req, res) {
    res.render('dashboard', {
      pageType: 'dashboard',
      session: req.session
    });
  });

  app.get('/playlist/new', isLoggedIn, hasUsername, function (req, res) {
    res.render('new', {
      pageType: 'new',
      session: req.session
    });
  });
};