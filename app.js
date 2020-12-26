require('dotenv').config();
// in case of dotenv we're not actually setting a constant for it beacuse all we
//need to do is require it and call config on it..we don't need it ever again.

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// using passport
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy; // we're going to use it as passport strategy
const findOrCreate = require('mongoose-findorcreate');
//mongoose-encryption removed since we're using md5 now
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");

// hashing and salting using bcrypt
// const bcrypt = require("bcrypt");
// const saltRounds = 10;



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

// app.use session should be above mongoose.connect
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

//initialized passport
app.use(passport.initialize()); //comes bundled with passport.
//now we use passport
app.use(passport.session());  //use passport to deal with session.

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
//an object that's created from the Mongoose schema class.
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String
});

//it has to be a mongoose schema not just a javascript object.
// used to hash and salt our passwords and to save our users to mongodb DB.
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//it's important that you add this plugin to the schema before you create your
//Mongoose model because we're passing in the userSchema as a parameter to
//create our new Mongoose model.

//we've only encrypted the password field as encrypting the whole database would
//result in searching for through our database to find email addresses too.

//we've added our encryption package to our userSchema, defined the secret that
//we're going to use to encrypt our password and also the field that we actually
//want to encrypt

// mongoose-encrypt will encrypt when you call save and will decrypt when you'll call find.

// process.env.SECRET gets the secret encryption msg from the .env file.
//plugin removed because we're going to use md5 now.
//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

// to create a local login strategy
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    // easier to install npm package called findorCreate
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to success.
    res.redirect('/success');
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/success", function(req, res){
  if(req.isAuthenticated()) {
    res.render("success");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

// app.post("/register", function(req, res){
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash){
//     const newUser = new User({
//       email: req.body.username,
//       //password: md5(req.body.password) // hash function md5 turns password into irreversible hash.
//       password: hash
//     });
//
//   //mongoose-encrypt will encrypt password field here as we call save
//     newUser.save(function(err){
//       if(err){
//         console.log(err);
//       } else {
//         res.render("success");
//       }
//     });
//   });
//
// });

// app.post("/login", function(req, res){
//   const username = req.body.username;
//   //const password = md5(req.body.password);
//   const password = req.body.password;
//
// //mongoose-encrypt will decrypt our password field here as we call find
//   User.findOne({email: username}, function(err, foundUser){
//     if(err) {
//       console.log(err);
//     } else {
//       if(foundUser) {
//         bcrypt.compare(password,foundUser.password, function(err, result) {
//           if(result === true) {
//             res.render("success");
//           }
//         });
//       }
//       }
//     });
// });
app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/success")
      })
    }
  })
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/success");
      })
    }
  })
});

app.listen(3000, function(){
  console.log("Server started at port 3000.");
});
