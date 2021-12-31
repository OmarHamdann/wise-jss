const express = require('express');
const router = express.Router();
const sgMail = require('@sendgrid/mail');
const { SENDGRID_API } = require('../utils/secrets.json');

sgMail.setApiKey(SENDGRID_API);

router.post('/contact-us/send', async (req, res) => {
  let errors = [];
  const { name, subject, email, message } = req.body;

  try {
    if (!email || !name || !subject || !message) {
      errors.push({ msg: 'Please fill in all fields!' });
      req.flash('error', 'Please fill in all fields!');
      res.redirect('/contact-us');
    } else {
      const data = {
        from: `Wise-Journals <${res.locals.secrets.EMAIL_USERNAME}>`,
        to: `<${res.locals.secrets.EMAIL_CONTACT_US}>`,
        subject: 'New message from contact form at wise-jss',
        text: `
            You have a message

            Contact Details

            Name: ${name}

            Email: ${email}

           Subject: ${subject} 

            Message
            ${message}
        `,
        html: `
            <p>You have a message</p>
            <h3>Contact Details</h3>
            <p>Name: ${name}</p>
            <p>Email: ${email}</p>
            <p>Subject: ${subject} </p>
            <h3>Message</h3>
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
      // res.json({ success: true });
      req.flash('success_msg', 'message has been sent successfully');
      res.redirect('/contact-us');
    }
  } catch (err) {
    // res.json({ success: false, errors });
    console.log('Error on /api/user/contact: ', err);
    errors.push({
      msg: 'Oh, something went wrong. Please try again!',
    });
    req.flash('error_msg', 'Oh, something went wrong. Please try again!');
    res.redirect('/contact-us');
  }
});

module.exports = router;
