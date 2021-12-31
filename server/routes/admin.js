const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = express();
const { Papers } = require('../utils/models/papers');
const { User } = require('../utils/models/user');

// #route:  post api/admin/changeRole
// #desc:   change role of users
// #access: private to admin

router.post('/changeRole/:userId', async (req, res) => {
  let errors = [];
  const userId = req.params.userId;
  const { newRole, reviewerFor, judgeFor } = req.body;
  const admin_id = jwt.decode(req.session.token).userId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    req.flash('error', 'userId is not a valid objectID');
    return res.redirect(302, '/dashboard');
  }

  try {
    const admin = await User.findById(admin_id);
    const user = await User.findById(userId);
    if (admin.length === 0 || admin.role !== 'admin') {
      req.flash('error', 'unauthorized');
      return res.redirect(302, '/dashboard');
    } else if (user.length === 0) {
      req.flash('error', 'No such user');
      return res.redirect(302, '/dashboard');
    } else if (reviewerFor) {
      await User.updateOne(
        { _id: userId },
        {
          role: newRole,
          reviewerFor: reviewerFor,
        }
      );
      req.flash('success_msg', 'success');
      return res.redirect(302, '/dashboard');
    } else if (judgeFor) {
      await User.updateOne(
        { _id: userId },
        {
          role: newRole,
          judgeFor: judgeFor,
        }
      );
      req.flash('success_msg', 'success');
      return res.redirect(302, '/dashboard');
    } else {
      await User.updateOne(
        { _id: userId },
        {
          role: newRole,
        }
      );
      req.flash('success_msg', 'success');
      return res.redirect(302, '/dashboard');
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/admin/changeRole: ', err);
    errors.push({
      msg: 'Oh, something went wrong. Please try again!',
    });
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

// #route:  post api/admin/ban
// #desc:   ban users by removing there role
// #access: private to admin

router.post('/ban/:userId', async (req, res) => {
  let errors = [];
  const userId = req.params.userId;
  const admin_id = jwt.decode(req.session.token).userId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    req.flash('error', 'userId is not a valid objectID');
    return res.redirect(302, '/dashboard');
  }

  try {
    const admin = await User.findById(admin_id);
    const user = await User.findById(userId);
    if (admin.length === 0 || admin.role !== 'admin') {
      req.flash('error', 'unauthorized');
      return res.redirect(302, '/dashboard');
    } else if (user.length === 0) {
      req.flash('error', 'No such user');
      return res.redirect(302, '/dashboard');
    } else {
      await User.updateOne(
        { _id: userId },
        {
          role: 'banned',
        }
      );
      req.flash('success_msg', 'success');
      return res.redirect(302, '/dashboard');
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/admin/ban: ', err);
    errors.push({
      msg: 'Oh, something went wrong. Please try again!',
    });
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

// #route:  post api/admin/delete
// #desc:   delete withdrawn papers after making sure that any penalty fee is paid
// #access: private to admin

router.post('/delete/:paperId', async (req, res) => {
  let errors = [];
  const paperId = req.params.paperId;
  const admin_id = jwt.decode(req.session.token).userId;
  if (!mongoose.Types.ObjectId.isValid(paperId)) {
    req.flash('error', 'paperId is not a valid objectID');
    return res.redirect(302, '/dashboard');
  }

  try {
    const admin = await User.findById(admin_id);
    const paper = await Papers.findById(paperId);

    if (admin.length === 0 || admin.role !== 'admin') {
      req.flash('error', 'unauthorized');
      return res.redirect(302, '/dashboard');
    } else if (paper.length === 0) {
      req.flash('error', 'No such submission');
      return res.redirect(302, '/dashboard');
    } else {
      await Papers.deleteOne({ _id: paperId });
      req.flash('success_msg', 'success');
      return res.redirect(302, '/dashboard');
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/admin/ban: ', err);
    errors.push({
      msg: 'Oh, something went wrong. Please try again!',
    });
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

module.exports = router;
