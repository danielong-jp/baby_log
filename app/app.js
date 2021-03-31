//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport"); 
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const http = require("http");
const { profile } = require('console');
const app = express();
const uris = require("./uris");

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));


app.use(session({
    secret: "our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(uris.MONGO_USERDB, {
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    useCreateIndex: true
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

 
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: uris.GOOGLE_CALLBACK_URL, 
    userProfileURL: uris.GOOGLE_USER_PROFILE_URL
  },
  function(accessToken, refreshToken, profile, cb) {


        User.findOrCreate({ googleId: profile.id, username: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

// ROUTE path

app.get("/", (req, res) => {
    res.render("home");
});

// AUTH PATH

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

// LOGIN path

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username, 
        password: req.body.password
    });

    req.login(user, (err) => {
        if (err) {
            console.log(err);

        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

// REGISTER path

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

// LOGOUT path 

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
})

// SECRET path
app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
}) 

// SUBMIT path
app.get("/submit", (req, res) => {
    if (req.isAuthenticated) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
})

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;
    
    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secrent = submittedSecret;
                foundUser.save(() => {
                    res.redirect("/secrets");
                });
            }
        }
    })
})

app.listen(3000, () => {
    console.log("Listening on port 3000");
});