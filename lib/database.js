var nconf = require('nconf');
var orm = require('orm');

nconf.argv().env().file({ file: 'local.json' });

/* Set up database */

var userDb = function() {
  orm.connect('mysql://' + nconf.get('db_username') + ':' +
    nconf.get('db_password') + '@127.0.0.1:3306/' + nconf.get('database'), function(success, db) {
      if (!success) {
        throw new Error('Could not connect to the database');
      }

      var User = db.define('user', {
        'username': { 'type': 'string' },
        'email': { 'type': 'string' },
        'location': { 'type': 'string' },
        'website': { 'type': 'string' },
        'background': { 'type': 'string' }
      }, {
        'validations': {
          'username': function(username, next, session) {
            var usernameCheck = username.replace(USERNAME_MATCH, '').trim();

            if (usernameCheck.length < 1 || usernameCheck.length > 20) {
              return next('Username must be between 1-20 characters');
            } else {
              User.find({ 'username': usernameCheck }, function(u) {
                if (u && u[0].id !== session.userId) {
                  return next('Username is already taken');
                } else {
                  return next();
                }
              });
            }
          }
        }
      });
      //User.sync();

      return User;
  });
};

exports.getUser = function() {
  return userDb();
};
