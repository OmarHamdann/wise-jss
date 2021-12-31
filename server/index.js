const express = require('express');
const app = express();
const cors = require('cors');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const csurf = require('csurf');
var flash = require('connect-flash');

// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let secrets, port;
if (process.env.NODE_ENV == 'production') {
  secrets = process.env;
  port = process.env.PORT;
} else {
  secrets = require('./utils/secrets');
  port = 5000;
}

// mongoDB
require('./utils/db');

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.locals.secrets = secrets;
  next();
});

// Cookie Session
const cookieSession = require('cookie-session');
app.use(
  cookieSession({
    secret: secrets.COOKIE_SESSION_SECRET,
    maxAge: 1000 * 60 * 60 * 24 * 14,
    httpOnly: true,
    secure: false,
  })
);

// connect flash middleware
app.use(flash());
// global variables. Creating our own middleware. Custom middleware coming from flash
app.use((req, res, next) => {
  // color code the message type
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

const { json } = require('body-parser');

// CSRF security for Production
if (process.env.NODE_ENV == 'production') {
  app.use(csurf());
  app.use((req, res, next) => {
    res.set('x-frame-options', 'DENY');
    res.cookie('mytoken', req.csrfToken());
    next();
  });
}

// dot env

require('dotenv').config();

// EJS setup

app.set('view engine', 'ejs');
app.use(express.static('public'));
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/author', require('./routes/author'));
app.use('/api/editor', require('./routes/editor'));
app.use('/api/reviewer', require('./routes/reviewer'));
app.use('/api/judge', require('./routes/judge'));
app.use('/withdraw/', require('./routes/nestedRoute'));
app.use('/evaluate/', require('./routes/nestedRoute'));
app.use('/edit-role/', require('./routes/nestedRoute'));
app.use('/', require('./routes/index'));

app.listen(port, () => console.log(`Server listening on port ${port}`));
