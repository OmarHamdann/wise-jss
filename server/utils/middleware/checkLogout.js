var checkLogout = function (req, res, next) {

    var user = req.session.user;
    if (user != null) {

        res.redirect('/dashboard');
        req.session.backTo = req.originalUrl;

    } else {
        next();
    }
};



module.exports = checkLogout;



