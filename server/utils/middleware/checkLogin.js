const jwt = require("jsonwebtoken");
var checkLogin = function (req, res, next) {
    try {
        var userStatus = jwt.decode(
            JSON.parse(JSON.stringify(req.session.user))
        ).userStatus;
    } catch (error) {
        res.redirect('/');
    }

    var user = req.session.user;

    if (user == null) {
        req.session.backTo = req.originalUrl;
    } else {
        req.user = user;
        if (userStatus != "pending") {
            next();
        } else {
            res.redirect("/verification-email");
        }

    }
};



module.exports = checkLogin;





