require('dotenv').config();
// in case of dotenv we're not actually setting a constant for it beacuse all we
//need to do is require it and call config on it..we don't need it ever again.

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//an object that's created from the Mongoose schema class.
const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});


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

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);


app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

//mongoose-encrypt will encrypt password field here as we call save
  newUser.save(function(err){
    if(err){
      console.log(err);
    } else {
      res.render("secrets");
    }
  })
});

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password;

//mongoose-encrypt will decrypt our password field here as we call find
  User.findOne({email: username}, function(err, foundUser){
    if(err) {
      console.log(err);
    } else {
      if(foundUser) {
        if(foundUser.password === password) {
          res.render("secrets")
        }
      }
    }
  });
});


app.listen(3000, function(){
  console.log("Server started at port 3000.");
});
