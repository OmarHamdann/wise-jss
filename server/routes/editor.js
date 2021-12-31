const express = require('express');
const router = express.Router();
const { Papers } = require('../utils/models/papers');
const { User } = require('../utils/models/user');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const { SENDGRID_API } = require('../utils/secrets.json');

sgMail.setApiKey(SENDGRID_API);
router.post('/reject/:paperId', async (req, res) => {
  const { message } = req.body;
  const paperId = req.params.paperId;
  const editorId = jwt.decode(req.session.token).userId;
  const userRole = jwt.decode(req.session.token).userRole;
  try {
    const paper = await Papers.findById(paperId);
    const editor = await User.findById(editorId);
    if (editor.length === 0 || userRole !== 'editor') {
      req.flash('error', 'unauthorized');
      return res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      return res.redirect('/dashboard');
    } else {
      if (paper.rejectCount < 2) {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            hiddenStatus: 'newSubmission',
            status: 'rejected',
            editable: true,
            rejectCount: paper.rejectCount++,
            dateRejected: Date.now(),
          }
        );
      } else {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            hiddenStatus: 'newSubmission',
            status: 'rejected',
            editable: false,
            rejectCount: paper.rejectCount++,
          }
        );
      }

      paper.authors_id.forEach(async (element) => {
        const author = await User.findById(element);
        if (author === null) {
          return;
        }
        const authorEmail = author.email;
        const data = {
          from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
          to: `<${authorEmail}>`,
          subject: 'Your submission has been rejected',
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
    console.log('Error on /api/editor/reject: ', err);
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});
router.post('/accept/:paperId', async (req, res) => {
  const { message } = req.body;
  const paperId = req.params.paperId;
  const editorId = jwt.decode(req.session.token).userId;
  const userRole = jwt.decode(req.session.token).userRole;
  try {
    const paper = await Papers.findById(paperId);
    const editor = await User.findById(editorId);
    if (editor.length === 0 || userRole !== 'editor') {
      req.flash('error', 'unauthorized');
      return res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      return res.redirect('/dashboard');
    } else {
      if (paper.hiddenStatus !== 'afterEvaluation') {
        req.flash('error', 'submission is still in evaluation');
        return res.redirect('/dashboard');
      } else {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            hiddenStatus: 'accepted',
            status: 'accepted',
            editable: false,
            dateAccepted: Date.now(),
          }
        );
      }

      paper.authors_id.forEach(async (element) => {
        const author = await User.findById(element);
        if (author === null) {
          return;
        }
        const authorEmail = author.email;
        const data = {
          from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
          to: `<${authorEmail}>`,
          subject: 'Your submission has been accepted',
          text: `

          Your submission <${paper.title} > is accepted with these grades

          Grade 1:
          ${paper.evaluationResult[0].result}

          Grade 2:
          ${paper.evaluationResult[1].result}
  `,
          html: `
          <p>Your submission <${paper.title} > is accepted with these grades</p>
          <br>
          <p>Grade 1:</p>
          <p>${paper.evaluationResult[0].result}</p>
          <p>Grade 2:</p>
          <p>${paper.evaluationResult[1].result}</p>
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
    console.log('Error on /api/editor/accept: ', err);
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});
router.post('/toReviewer/:paperId', async (req, res) => {
  const { reviewers } = req.body;
  if (!Array.isArray(reviewers)) {
    req.flash('error', 'You must assign submission to three reviewers');
    return res.redirect('/dashboard');
  }
  const reviewerId = reviewers[0];
  const reviewerId2 = reviewers[1];
  const reviewerId3 = reviewers[2];
  if (reviewers.length < 3 || reviewers.includes(null)) {
    req.flash('error', 'You must assign submission to three reviewers');
    return res.redirect('/dashboard');
  }
  function hasDuplicates(arr) {
    return arr.some(function (item) {
      return arr.indexOf(item) !== arr.lastIndexOf(item);
    });
  }
  const paperId = req.params.paperId;
  const editorId = jwt.decode(req.session.token).userId;
  const userRole = jwt.decode(req.session.token).userRole;
  const reviewersList = [reviewerId, reviewerId2, reviewerId3];
  if (hasDuplicates(reviewersList)) {
    req.flash('error', 'You cant select the same reviewer more than one time ');
    return res.redirect('/dashboard');
  }
  try {
    const paper = await Papers.findById(paperId);
    const editor = await User.findById(editorId);
    if (editor.length === 0 || userRole !== 'editor') {
      req.flash('error', 'unauthorized');
      return res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      return res.redirect('/dashboard');
    } else {
      if (
        paper.authors_id.includes(reviewerId) ||
        paper.authors_id.includes(reviewerId2) ||
        paper.authors_id.includes(reviewerId3)
      ) {
        req.flash(
          'error',
          'You cant select reviewer to review his own submission'
        );
        return res.redirect('/dashboard');
      } else {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            reviewers_id: reviewersList,
            hiddenStatus: 'review',
            status: 'In Review',
          }
        );
        res.redirect('/dashboard');
        paper.authors_id.forEach(async (element) => {
          const author = await User.findById(element);
          if (author === null) {
            return;
          }
          const authorEmail = author.email;
          const data = {
            from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
            to: `<${authorEmail}>`,
            subject: `submission (<${paper.title}>) status update`,
            text: `

            Your submission (<${paper.title}>) is now in review 
        
    `,
            html: `
        <p> Your submission (<${paper.title}>) is now in review</p>
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
      }
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/editor/toReviewer: ', err);
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

router.post('/toJudge/:paperId', async (req, res) => {
  const { judges } = req.body;

  if (!Array.isArray(judges)) {
    req.flash('error', 'You must assign submission to two judges');
    return res.redirect('/dashboard');
  }
  const judgeId = judges[0];
  const judgeId2 = judges[1];
  if (judges.length < 2 || judges.includes(null)) {
    req.flash('error', 'You must assign submission to two judges');
    return res.redirect('/dashboard');
  }
  function hasDuplicates(arr) {
    return arr.some(function (item) {
      return arr.indexOf(item) !== arr.lastIndexOf(item);
    });
  }
  const paperId = req.params.paperId;
  const editorId = jwt.decode(req.session.token).userId;
  const userRole = jwt.decode(req.session.token).userRole;
  const judgesList = [judgeId, judgeId2];

  if (hasDuplicates(judgesList)) {
    req.flash('error', 'You cant select the same judge more than one time ');
    return res.redirect('/dashboard');
  }
  try {
    const paper = await Papers.findById(paperId);
    const editor = await User.findById(editorId);
    if (editor.length === 0 || userRole !== 'editor') {
      req.flash('error', 'unauthorized');
      return res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      return res.redirect('/dashboard');
    } else if (paper.hiddenStatus !== 'afterReview') {
      req.flash('error', 'submission is still in review');
      return res.redirect('/dashboard');
    } else {
      if (
        paper.authors_id.includes(judgeId) ||
        paper.authors_id.includes(judgeId2)
      ) {
        req.flash(
          'error',
          'You cant select judge to review his own submission'
        );
        return res.redirect('/dashboard');
      } else {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            judges_id: judgesList,
            hiddenStatus: 'evaluate',
            status: 'evaluation',
          }
        );
        res.redirect('/dashboard');
        paper.authors_id.forEach(async (element) => {
          const author = await User.findById(element);
          if (author === null) {
            return;
          }
          const authorEmail = author.email;
          const data = {
            from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
            to: `<${authorEmail}>`,
            subject: `submission (<${paper.title}>) status update`,
            text: `

            Your submission (<${paper.title}>) is now in Evaluation 
        
    `,
            html: `
        <p> Your submission (<${paper.title}>) is now in Evaluation</p>
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
      }
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/editor/toJudge: ', err);
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

router.get('/download/:paperId', async (req, res) => {
  try {
    const paper = await Papers.findById(req.params.paperId);
    if (jwt.decode(req.session.token).userRole !== 'editor') {
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
    console.log('Error on /api/editor/download ', err);

    req.flash('error', 'something went wrong please try again later');

    res.redirect('/dashboard');
  }
});

// NOTE: for future reference
// www.wise-jss.edu.jo/form/5631436138261452/26371251673
//                          ^ paperid        ^ secret code
//  and i need to have a pin in the email that is sent to the judge which he have to enter in the form for the form to be accepted
module.exports = router;
