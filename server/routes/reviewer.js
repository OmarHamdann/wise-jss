const fs = require('fs');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Papers } = require('../utils/models/papers');
const { User } = require('../utils/models/user');
const sgMail = require('@sendgrid/mail');
const { SENDGRID_API } = require('../utils/secrets.json');

sgMail.setApiKey(SENDGRID_API);
// #route:  get /reviewer/download/paperId
// #desc:   download a paper the reviewer was assigned to review
// #access: private to  reviewer

router.get('/download/:paperId', async (req, res) => {
  try {
    const paper = await Papers.findById(req.params.paperId);
    const reviewer_id = jwt.decode(req.session.token).userId;
    if (
      jwt.decode(req.session.token).userRole !== 'reviewer' ||
      paper.reviewers_id.includes(reviewer_id) != true
    ) {
      req.flash('error', 'unauthorized');
      res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');

      res.redirect('/dashboard');
    } else {
      const file_path = paper.file_path;
      const file = `${process.cwd()}/${file_path}`;
      res.download(file, `${paper.file_originalname}`);
    }
  } catch (err) {
    console.log('Error on /api/reviewer/download ', err);

    req.flash('error', 'something went wrong please try again later');

    res.redirect('/dashboard');
  }
});

router.get('/download/submission/:paperId', async (req, res) => {
  try {
    const paper = await Papers.findById(req.params.paperId);
    const author_id = jwt.decode(req.session.token).userId;
    if (
      jwt.decode(req.session.token).userRole !== 'reviewer' ||
      paper.authors_id.includes(author_id) !== true
    ) {
      req.flash('error', 'unauthorized');
      res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      res.redirect('/dashboard');
    } else {
      const file_path = paper.file_path;
      const file = `${process.cwd()}/${file_path}`;
      res.download(file, `${paper.file_originalname}`);
    }
  } catch (err) {
    console.log('Error on /api/author/download ', err);

    req.flash('error', 'something went wrong please try again later');

    res.redirect('/dashboard');
  }
});

router.post('/reject/:paperId', async (req, res) => {
  const { message } = req.body;
  const paperId = req.params.paperId;
  const reviewerId = jwt.decode(req.session.token).userId;
  const userRole = jwt.decode(req.session.token).userRole;
  try {
    const paper = await Papers.findById(paperId);
    const reviewer = await User.findById(reviewerId);
    const reviewResult = paper.reviewResult;
    const reviewerName = reviewer.firstName + ' ' + reviewer.lastName;

    if (
      reviewer.length === 0 ||
      userRole !== 'reviewer' ||
      paper.hiddenStatus !== 'review'
    ) {
      req.flash('error', 'unauthorized');
      return res.redirect('/dashboard');
    } else if (!message) {
      req.flash(
        'error',
        'you need to add reject reason in the message section'
      );
      return res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      return res.redirect('/dashboard');
    } else {
      for (var index in reviewResult) {
        if (reviewResult[index].reviewerName === reviewerName) {
          req.flash('error', 'You already reviewed this submission');
          return res.redirect('/dashboard');
        }
      }
      reviewResult.push({ reviewerName: reviewerName, result: true });
      if (reviewResult.length === 3) {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            hiddenStatus: 'afterReview',
            reviewResult: reviewResult,
          }
        );
      } else {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            reviewResult: reviewResult,
          }
        );
      }
      const editors = await User.find({ role: 'editor' });
      editors.forEach((element) => {
        const editorEmail = element.email;
        const data = {
          from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
          to: `<${editorEmail}>`,
          subject: `${paper.title} has been rejected by ${reviewerName}  `,
          text: `
        ${message}
    `,
          html: `
        <p>${message}</p>
    `,
        };

        (async () => {
          try {
            await sgMail.send(data);
          } catch (error) {
            console.error(error);

            if (error.response) {
              console.error(error.response.body);
            }
          }
        })();
      });

      res.redirect('/dashboard');
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/reviewer/reject: ', err);
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

router.post('/accept/:paperId', async (req, res) => {
  const paperId = req.params.paperId;
  const reviewerId = jwt.decode(req.session.token).userId;
  const userRole = jwt.decode(req.session.token).userRole;
  try {
    const paper = await Papers.findById(paperId);
    const reviewer = await User.findById(reviewerId);
    const reviewResult = paper.reviewResult;
    const reviewerName = reviewer.firstName + ' ' + reviewer.lastName;

    if (
      reviewer.length === 0 ||
      userRole !== 'reviewer' ||
      paper.hiddenStatus !== 'review'
    ) {
      req.flash('error', 'unauthorized');
      return res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      return res.redirect('/dashboard');
    } else {
      for (var index in reviewResult) {
        if (reviewResult[index].reviewerName === reviewerName) {
          req.flash('error', 'You already reviewed this submission');
          return res.redirect('/dashboard');
        }
      }
      reviewResult.push({ reviewerName: reviewerName, result: true });
      if (reviewResult.length === 3) {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            hiddenStatus: 'afterReview',
            reviewResult: reviewResult,
          }
        );
      } else {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            reviewResult: reviewResult,
          }
        );
      }
      const editors = await User.find({ role: 'editor' });
      editors.forEach((element) => {
        const editorEmail = element.email;
        const data = {
          from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
          to: `<${editorEmail}>`,
          subject: `${paper.title} has been accepted by ${reviewerName}  `,
          text: `
          ${paper.title} has been accepted by ${reviewerName}
      `,
          html: `
          <p> ${paper.title} has been accepted by ${reviewerName}</p>
      `,
        };

        (async () => {
          try {
            await sgMail.send(data);
          } catch (error) {
            console.error(error);

            if (error.response) {
              console.error(error.response.body);
            }
          }
        })();
      });

      res.redirect('/dashboard');
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/reviewer/accept: ', err);
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});
module.exports = router;
