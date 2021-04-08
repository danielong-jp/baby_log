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


const detailsSchema = new mongoose.Schema({
    time: String,
    left: Number,
    right: Number,
    bottle: Number,
    poop: String, 
    pee: String,
    sleep: String,
    notes: String
});

const entrySchema = new mongoose.Schema({
    date: String,
    details: [detailsSchema]
});

const babySchema = new mongoose.Schema({
    name: String,
    entries: [entrySchema]
})

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    babies: [babySchema]
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

// HOME path
app.route("/")
    .get((req, res) => {
        res.render("home");
    });

// AUTH PATH

app.route("/auth/google")
    .get(passport.authenticate("google", { scope: ["profile"] }));

app.route("/auth/google/secrets")
    .get(
        passport.authenticate("google", { failureRedirect: "/login" }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect("/secrets");
        }
    );

// LOGIN path

app.route("/login")
    .get((req, res) => {
        res.render("login");
    })
    .post((req, res) => {
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
app.route("/register")
    .get((req, res) => {
        res.render("register");
    })
    .post((req, res) => {
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

app.route("/logout")
    .get((req, res) => {
        req.logout();
        res.redirect("/");
    });

// SECRET path
app.route("/secrets")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            User.findById(req.user.id, (err, foundUser) => {
                if (err) {
                    console.log(err);
                } else {
                    let date = new Date();
                    let today = "" + date.getFullYear() + "_" + date.getMonth() + "_" + date.getDate();
                    const babies = foundUser.babies;
                    if (babies) {
                        res.render("secrets", {foundBabies: babies, date: today});
                    } else {
                        res.redirect("/newbaby");
                    }

                }
            });

        } else {
            res.redirect("/login");
        }
    });

// newbaby path
app.route("/newbaby")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render("newbaby");
        } else {
            res.redirect("/login");
        }
    })
    .post((req, res) => {
        const newBaby = {"name": req.body.newbaby};

        User.findById(req.user.id, (err, foundUser) => {
            //if baby exists do not add.
            let found = false;
            foundUser.babies.forEach((baby) => {
                if (baby.name === newBaby.name) {
                    found = true;
                }
            });

            if (!found) {
                foundUser.babies.push(newBaby);
                foundUser.save();
            }

            res.redirect("/secrets");
        });
    });

//baby path
app.route("/:babyname/")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            let date = new Date();
            let todayString = date.toLocaleDateString("en-US").replace(/\//g, "-");
            User.findById(req.user.id, (err, foundUser) => {
                if (err) {
                    console.log(err);
                } else {
                    let myBaby;
                    //get baby dates and post dates
                    foundUser.babies.forEach((baby) => {
                        if (baby.name === req.params.babyname) {
                            myBaby = baby;

                        }
                    });

                    res.render("baby", {baby: myBaby, today: todayString});
                }
            });
        } else {
            res.redirect("/login");
        }
    });

app.route("/:babyname/:date")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            
            User.findById(req.user.id, (err, foundUser) => {
                if (err) {
                    console.log(err);
                } else {
                    let myBaby;
                    let myEntry;
                    //get baby dates and post dates
                    foundUser.babies.forEach((baby) => {
                        if (baby.name === req.params.babyname) {
                            myBaby = baby;
                        }
                    });
                    myBaby.entries.forEach((entry) => {
                        if (entry.date === req.params.date) {
                            myEntry = entry;
                        }
                    });
                    if (myEntry === undefined) {
                        //save baby and then user to update the baby within the user
                        myBaby.entries.push({"date": req.params.date});
                        myBaby.save();
                        foundUser.save();
                    }
                    res.render("entry", {baby: myBaby, today: req.params.date, entry: myEntry});
                }
            });
        } else {
            res.redirect("/login");
        }
    })
    .post((req, res) => {
        // <td><input name="time_<%=i%>" type="time" value="<%=entry.details[i].time%>:00"></td>
        // <td><input type="number" name="left_<%=i%>" value="<%=entry.details[i].left%>"></td>
        // <td><input type="number" name="right_<%=i%>" value="<%=entry.details[i].right%>"></td>
        // <td><input type="number" name="bottle_<%=i%>" value="<%=entry.details[i].bottle%>"></td>
        // <td><input type="button" name="poop_<%=i%>" value="<%=entry.details[i].poop%>" id="poop_<%=i%>" onclick="poop(<%=i%>)"></td>
        // <td><input type="button" name="pee_<%=i%>" value="<%=entry.details[i].pee%>" id="pee_<%=i%>" onclick="pee(<%=i%>)"></td>
        // <td><input type="button" name="sleep_<%=i%>" value="<%=entry.details[i].sleep%>" id="sleep_<%=i%>" onclick="sleep(<%=i%>)"></td>
        // <td><input type="text" name="note_<%=i%>" value="<%=entry.details[i].notes%>"></td>
        if (req.isAuthenticated()) {
            
            User.findById(req.user.id, (err, foundUser) => {
                if (err) {
                    console.log(err);
                } else {
                    let myBaby;
                    let myEntry;
                    //get baby dates and post dates
                    foundUser.babies.forEach((baby) => {
                        if (baby.name === req.params.babyname) {
                            myBaby = baby;
                        }
                    });
                    myBaby.entries.forEach((entry) => {
                        if (entry.date === req.params.date) {
                            myEntry = entry;
                        }
                    });
                    
                    myEntry.details = [];
                    for (let i = 0; i < 24; i++) {
                        myEntry.details.push({
                            time: req.body.time_i,
                            left: req.body.left_i,
                            right: req.body.right_i,
                            bottle: req.body.bottle_i,
                            poop: req.body.poop_i, 
                            pee: req.body.pee_i,
                            sleep: req.body.sleep_i,
                            notes: req.body.note_i
                        });
                    }
                    myEntry.save();
                    myBaby.save();
                    foundUser.save();

                    res.render("entry", {baby: myBaby, today: req.params.date, entry: myEntry});
                }
            });
        } else {
            res.redirect("/login");
        }

    })

app.listen(3000, () => {
    console.log("Listening on port 3000");
});