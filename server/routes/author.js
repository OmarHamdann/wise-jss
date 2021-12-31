const fs = require('fs');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Papers } = require('../utils/models/papers');
const { User } = require('../utils/models/user');
const checkLogin = require('../utils/middleware/checkLogin');
var multer = require('multer');
const crypto = require('crypto');
const { MulterError } = require('multer');
const { includes } = require('lodash');
const app = express();

app.use(multer().any());
// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  // filename: (req, file, cb) => {
  //     cb(null, new Date().toISOString() +
  //         + file.mimetype)
  // },
  // filename: (req, file, cb) => {
  //     let customFileName = crypto.randomBytes(18).toString('hex'),
  //         fileExtension = file.originalname.split('.')[1] // get file extension from original file name
  //     cb(null, customFileName + '.' + fileExtension)
  // },
  filename(req, file = {}, cb) {
    const { originalname } = file;
    const fileExtension = (originalname.match(/\.+[\S]+$/) || [])[0];
    cb(null, `${file.fieldname}__${Date.now()}${fileExtension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    cb(null, true);
  }
  cb(null, false);
};
// 30 MB size limit
const maxSize = 31457280;

var upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: maxSize },
}).single('paper');
// #route:  POST api/author/submit
// #desc:   submit a new research paper
// #access: private (author only)
router.post('/submit', async (req, res) => {
  //  uploading files using multer and handling errors
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error_msg', 'file size is limited at 30MB ');
      } else {
        req.flash('error_msg', 'Please select a file of type(word/pdf)');
      }

      return res.redirect(302, '/submit');
    } else if (err) {
      // An unknown error occurred when uploading.
    }
    const { journal_id, title, abstract, authors } = req.body;

    let errors = [];
    const acceptance = 'accepted';
    const authors_id = [jwt.decode(req.session.token).userId];
    const authors_names = [];

    const file = req.file;
    if (req.file === undefined) {
      errors.push({
        msg: 'Please select a file of type(word/pdf) and size is limited to 30MB',
      });
      req.flash(
        'error_msg',
        'Please select a file of type(word/pdf) and size is limited to 30MB'
      );
    }

    // Check if data is correctly provided
    if (!journal_id || !title || !abstract || !authors_id) {
      errors.push({ msg: 'Please fill in all fields!' });
      req.flash('error_msg', 'Please fill in all fields!');
      // res.json({ success: false, errors }, {
      //     data: authors_id
      // });
    }

    if (acceptance != 'accepted') {
      errors.push({ msg: 'You need to accept the terms of use.' });
      req.flash('error', 'You need to accept the terms of use.');
      // res.redirect("/dashboard")
      // res.json({ success: false, errors });
    }

    // if (!file) {
    //     errors.push({ msg: "You need to upload a file. (pdf/word)" });
    //     req.flash('error', 'You need to upload a file. (pdf/word)');
    //     // res.redirect("/dashboard")
    // }

    if (errors.length > 0) {
      return res.redirect(302, '/submit');
      // res.json({ success: false, errors });
    } else {
      const file_path = file.path;
      const file_type = file.mimetype;
      const file_originalname = file.originalname;

      try {
        var emailArr = authors.split(',');
        emailArr = emailArr.filter((item) => item);

        const promise = new Promise(async (resolve, reject) => {
          const existingPaper = await Papers.findOne({ title: title });
          const mainAuthor = await User.findOne({
            _id: jwt.decode(req.session.token).userId,
          });
          authors_names.push(mainAuthor.firstName + ' ' + mainAuthor.lastName);

          if (existingPaper) {
            reject('The provided title is already submitted.');
          } else if (authors === '') {
            resolve(authors_id);
          }
          var done = 0;
          emailArr.forEach(async (email) => {
            const user = await User.findOne({ email: email });
            if (user) {
              authors_id.push(String(user._id));
              authors_names.push(user.firstName + ' ' + user.lastName);
              done++;
              if (done === emailArr.length) resolve(authors_id);
            } else {
              reject('one or more co-authors are not registered');
            }
          });
        });

        promise
          .then((authors_id) => {
            const newPaper = new Papers({
              title,
              abstract,
              authors_id,
              authors_names,
              journal_id,
              file_path,
              file_type,
              file_originalname,
              accepted: true,
            });

            console.log('promise resolved');
            newPaper.save();
            res.redirect('/');
          })
          .catch((reason) => {
            req.flash('error', reason);
            console.log(reason);
            res.redirect('/submit');
          });

        // res.json("success")
      } catch (err) {
        console.log('Error on /api/author/submit: ', err);
        errors.push({
          msg: 'Oh, something went wrong. Please try again!',
        });
        req.flash('error', 'something went wrong please try again later');

        res.redirect('/submit');
        // res.json({ success: false, errors });
      }
    }
  });
});

// #route:  post api/author/withdraw
// #desc:   withdraw a paper submitted by the author
// #access: private to paper owners
router.post('/withdraw/:paperId', async (req, res) => {
  // let errors = [];
  try {
    const paper = await Papers.findById(req.params.paperId);
    const author_id = jwt.decode(req.session.token).userId;

    if (!paper) {
      res.sendStatus(401);
    } else if (
      !paper.authors_id.includes(author_id) ||
      paper.authors_id[0] != author_id
    ) {
      // errors.push({
      //     msg: "unauthorized",
      // });
      req.flash('error', 'unauthorized');
      res.redirect('/dashboard');
      // res.json({ success: false, errors });
    } else {
      await Papers.updateOne(
        { _id: req.params.paperId },
        {
          status: 'withdrawn',
          hiddenStatus: 'withdrawn',
          dateWithdrawn: Date.now(),
        }
      );

      let redirectPath;

      // TODO: use secret for host instead

      if (process.env.NODE_ENV == 'production') {
        redirectPath = `${req.protocol}://${req.get('host')}/dashboard`;
      } else {
        redirectPath = `http://localhost:5000/dashboard`;
      }

      // res.json({ success: true });
      req.flash('success_msg', 'success');
      // res.redirect("/dashboard")
      res.redirect(redirectPath);
    }
  } catch (err) {
    console.log('Error on /api/author/withdraw: ', err);
    res.sendStatus(500);
  }
});

// #route:  post api/author/edit
// #desc:   edit a paper submitted by the author when required
// #access: private to corresponding author
router.post('/edit/:paperId', async (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error_msg', 'file size is limited at 30MB ');
      } else {
        req.flash('error_msg', 'Please select a file of type(word/pdf)');
      }

      return res.redirect(302, `/edit/${req.params.paperId}`);
    } else if (err) {
      // An unknown error occurred when uploading.
      console.log(err);
    }
    const { title, abstract } = req.body;

    const file = req.file;
    const file_path = file.path;
    const file_type = file.mimetype;
    const file_originalname = file.originalname;

    const promise = new Promise(async (resolve, reject) => {
      const paper = await Papers.findById(req.params.paperId);
      const author_id = jwt.decode(req.session.token).userId;

      if (!paper) {
        reject("Paper doesn't exist");
      } else if (
        paper.authors_id.includes(author_id) != true ||
        paper.authors_id[0] != author_id
      ) {
        // paper.status == "edit required" to be added later

        reject('unauthorized');
      } else if (paper.editable !== true) {
        reject('this submission is not editable at the moment ');
      } else {
        const oldFile = paper.file_path;

        resolve(oldFile);
      }
    });

    promise
      .then(async (oldFile) => {
        if (title === '' && abstract === '') {
          await Papers.updateOne(
            { _id: req.params.paperId },
            {
              file_path: file_path,
              file_type: file_type,
              file_originalname: file_originalname,
              hiddenStatus: 'newSubmission',
              status: 'pending',
            }
          );
        } else if (title !== '' && abstract === '') {
          await Papers.updateOne(
            { _id: req.params.paperId },
            {
              title: title,
              file_path: file_path,
              file_type: file_type,
              file_originalname: file_originalname,
              hiddenStatus: 'newSubmission',
              status: 'pending',
            }
          );
        } else if (title === '' && abstract !== '') {
          await Papers.updateOne(
            { _id: req.params.paperId },
            {
              abstract: abstract,
              file_path: file_path,
              file_type: file_type,
              file_originalname: file_originalname,
              hiddenStatus: 'newSubmission',
              status: 'pending',
            }
          );
        } else if (title !== '' && abstract !== '') {
          await Papers.updateOne(
            { _id: req.params.paperId },
            {
              title: title,
              abstract: abstract,
              file_path: file_path,
              file_type: file_type,
              file_originalname: file_originalname,
              hiddenStatus: 'newSubmission',
              status: 'pending',
            }
          );
        }

        fs.unlink(oldFile, (err) => {
          if (err) {
            console.error(err);
            return;
          }

          console.error('old file removed successfully');
        });
        console.log('promise resolved');
        res.redirect('/dashboard');
      })
      .catch((reason) => {
        req.flash('error', reason);
        console.log(reason);
        res.redirect(`/edit/${req.params.paperId}`);
      });
  });
});

// #route:  get /author/download
// #desc:   download a paper submitted by the author when required
// #access: private to  authors

router.get('/download/:paperId', async (req, res) => {
  try {
    const paper = await Papers.findById(req.params.paperId);
    const author_id = jwt.decode(req.session.token).userId;
    if (
      jwt.decode(req.session.token).userRole !== 'author' ||
      paper.authors_id.includes(author_id) != true
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

module.exports = router;
