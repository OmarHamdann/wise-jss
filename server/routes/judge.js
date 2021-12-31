const express = require('express');
const router = express.Router();
const { Papers } = require('../utils/models/papers');
const { User } = require('../utils/models/user');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const { SENDGRID_API } = require('../utils/secrets.json');

sgMail.setApiKey(SENDGRID_API);

router.get('/download/:paperId', async (req, res) => {
  try {
    const paper = await Papers.findById(req.params.paperId);
    if (jwt.decode(req.session.token).userRole !== 'judge') {
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
    console.log('Error on /api/judge/download ', err);

    req.flash('error', 'something went wrong please try again later');

    res.redirect('/dashboard');
  }
});

router.post('/evaluate/:paperId', async (req, res) => {
  const {
    message,
    questionRadio1,
    questionRadio2,
    questionRadio3,
    questionRadio4,
    questionRadio5,
  } = req.body;
  const paperId = req.params.paperId;
  const judgeId = jwt.decode(req.session.token).userId;
  const userRole = jwt.decode(req.session.token).userRole;
  try {
    const paper = await Papers.findById(paperId);
    const judge = await User.findById(judgeId);
    const evaluationResult = paper.evaluationResult;
    const judgeName = judge.firstName + ' ' + judge.lastName;

    if (
      judge.length === 0 ||
      userRole !== 'judge' ||
      paper.hiddenStatus !== 'evaluate'
    ) {
      req.flash('error', 'unauthorized');
      return res.redirect('/dashboard');
    } else if (!paper) {
      req.flash('error', 'something went wrong please try again later');
      return res.redirect('/dashboard');
    } else {
      for (var index in evaluationResult) {
        if (evaluationResult[index].judgeName === judgeName) {
          req.flash('error', 'You already evaluated this submission');
          return res.redirect('/dashboard');
        }
      }
      const result =
        parseInt(questionRadio1) +
        parseInt(questionRadio2) +
        parseInt(questionRadio3) +
        parseInt(questionRadio4) +
        parseInt(questionRadio5) +
        30;
      evaluationResult.push({ judgeName: judgeName, result: result });
      if (evaluationResult.length === 2) {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            hiddenStatus: 'afterEvaluation',
            evaluationResult: evaluationResult,
          }
        );
      } else {
        await Papers.updateOne(
          {
            _id: paperId,
          },
          {
            evaluationResult: evaluationResult,
          }
        );
      }
      const editors = await User.find({ role: 'editor' });
      editors.forEach((element) => {
        const editorEmail = element.email;
        const data = {
          from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
          to: `<${editorEmail}>`,
          subject: `${paper.title} has been evaluated by ${judgeName}  `,
          text: `
          ${paper.title} has been evaluated by ${judgeName}
          Additional notes:
          ${message}
      `,
          html: `
          <p> ${paper.title} has been evaluated by ${judgeName}</p>
          <p> Additional notes: </p>
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
      req.flash('success_msg', 'success');
      res.redirect('/dashboard');
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/judge/evaluate: ', err);
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/dashboard');
  }
});

module.exports = router;
