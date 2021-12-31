const express = require('express');
const app = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { Papers } = require('../utils/models/papers');
const { User } = require('../utils/models/user');

// checking if the user is logged in or logged out depending on route

const checkLogin = require('../utils/middleware/checkLogin');
const checkLogout = require('../utils/middleware/checkLogout');

// Serve the build in production

app.get('/', checkLogout, function (req, res) {
  res.render('index', {});
});
app.get('/about', function (req, res) {
  res.render('about-us', {});
});
app.get('/contact-us', function (req, res) {
  res.render('contact-us', {});
});
app.get('/register', checkLogout, function (req, res) {
  res.render('register', {});
});
app.get('/forgot', checkLogout, function (req, res) {
  res.render('forgot', {});
});

app.get('/verification-email', function (req, res) {
  res.render('verification-email', {});
});

app.get('/account-verified', function (req, res) {
  res.render('account-verified', {});
});

app.get('/dashboard', checkLogin, async (req, res) => {
  var redirectPath;
  var paper,
    users,
    reviewers,
    submissions,
    judges,
    accepted,
    rejected,
    withdrawn = [];
  switch (jwt.decode(req.session.user).userRole) {
    case 'author':
      try {
        const author_id = jwt.decode(req.session.token).userId;
        // $ne: hides the withdrawn papers
        paper = await Papers.find({
          authors_id: String(author_id),
          status: {
            $ne: 'withdrawn',
          },
        });
        // console.log(paper);
      } catch (err) {
        console.log('Error on /api/author/table ', err);
        res.sendStatus(500);
      }
      redirectPath = 'author-dashboard';
      break;
    case 'editor':
      try {
        paper = await Papers.find({
          status: {
            $ne: 'rejected',
          },
        });
        reviewers = await User.find({
          role: 'reviewer',
        });
        judges = await User.find({
          role: 'judge',
        });
        accepted = await Papers.find({
          status: {
            $eq: 'accepted',
          },
        });
        rejected = await Papers.find({
          status: {
            $eq: 'rejected',
          },
        });
        withdrawn = await Papers.find({
          status: {
            $eq: 'withdrawn',
          },
          hiddenStatus: {
            $eq: 'withdrawn',
          },
        });
      } catch (err) {
        console.log('Error on /api/editor/table ', err);
        res.sendStatus(500);
      }
      redirectPath = 'editor-dashboard';
      break;
    case 'reviewer':
      try {
        const reviewer_id = jwt.decode(req.session.token).userId;
        paper = await Papers.find();
        paper = paper.filter(
          (obj) =>
            obj.reviewers_id.includes(reviewer_id) &&
            obj.reviewResult.length !== 3 &&
            obj.hiddenStatus === 'review'
        );
        submissions = await Papers.find({
          authors_id: String(reviewer_id),
          status: {
            $ne: 'withdrawn',
          },
        });
      } catch (err) {
        console.log('Error on /api/dashboard/reviewer ', err);
        res.sendStatus(500);
      }

      redirectPath = 'reviewer-dashboard';
      break;
    case 'judge':
      try {
        const judge_id = jwt.decode(req.session.token).userId;
        paper = await Papers.find();
        paper = paper.filter(
          (obj) =>
            obj.judges_id.includes(judge_id) &&
            obj.reviewResult.length === 3 &&
            obj.hiddenStatus === 'evaluate'
        );
      } catch (err) {
        console.log('Error on /api/dashboard/judge ', err);
        res.sendStatus(500);
      }

      redirectPath = 'judge-dashboard';
      break;
    case 'admin':
      try {
        paper = await Papers.find({
          status: {
            $eq: 'withdrawn',
          },
        });
        users = await User.find();
      } catch (err) {
        console.log('Error on /api/admin/table ', err);
        res.sendStatus(500);
      }
      redirectPath = 'admin-dashboard';
      break;
    default:
      redirectPath = 'noRole';
  }

  res.render(redirectPath, {
    paper: paper,
    users: users,
    reviewers: reviewers,
    judges: judges,
    submissions: submissions,
    accepted: accepted,
    rejected: rejected,
    withdrawn: withdrawn,
  });
});

app.get('/forgot-password-code', checkLogout, function (req, res) {
  res.render('forgot-password-code', {});
});

app.get('/edit/:paperId', checkLogin, function (req, res) {
  res.render('edit', {
    paperId: req.params.paperId,
  });
});

app.get('/edit-role/:userId', checkLogin, async (req, res) => {
  const userId = req.params.userId;
  const adminId = jwt.decode(req.session.token).userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    req.flash('error', 'userId is not a valid objectID');
    return res.redirect(302, '/dashboard');
  }
  try {
    const admin = await User.find({
      _id: adminId,
      role: 'admin',
    });

    const user = await User.findOne({
      _id: userId,
    });
    if (admin.length === 0) {
      req.flash('error', 'unauthorized');
      res.redirect('/dashboard');
    } else if (user.length === 0) {
      req.flash('error', 'No such user');
      res.redirect('/dashboard');
    } else {
      res.render('edit-role', {
        user: user,
      });
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/admin/edit-role: ', err);
    errors.push({
      msg: 'Oh, something went wrong. Please try again!',
    });
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

app.get('/submit', checkLogin, function (req, res) {
  res.render('submit_page');
});

app.get('/evaluate/:paperId', checkLogin, async (req, res) => {
  const paperId = req.params.paperId;
  const judgeId = jwt.decode(req.session.token).userId;

  try {
    const judge = await User.findOne({
      _id: judgeId,
      role: 'judge',
    });

    const paper = await Papers.findOne({
      _id: paperId,
    });
    if (!judge || !paper.judges_id.includes(judgeId)) {
      req.flash('error', 'unauthorized');
      res.redirect('/dashboard');
    } else if (paper.length === 0) {
      req.flash('error', 'No such submission');
      res.redirect('/dashboard');
    } else {
      res.render('rate', {
        paper: paper,
      });
    }
  } catch (err) {
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

app.get('*', function (req, res) {
  res.render('404', {});
});
module.exports = app;
