const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  "userName":  {type: String, unique: true},
  "password": String,
  "email": String,
  "loginHistory": [{
    "dateTime": Date,
    "userAgent": String
  }]
});

let User;

module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection("mongodb+srv://kush4822:<password>@cluster0.lov6zp2.mongodb.net/test");
        db.on('error', (err)=>{
            reject(err);
        });
        db.once('open', ()=>{
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

module.exports.registerUser = function (userData) {
  return new Promise(function (resolve, reject) {
    if(userData.password === userData.password2) {
      bcrypt.hash(userData.password, 10).then(hash=>{
        userData.password = hash;
        const newUser = User(userData);
        newUser.save().then(() => {
            resolve();
        }).catch(err => {
          if(err.code === 11000)
            reject("User Name already taken!");
          else
            reject("There was an error creating a user:",err);
        });
      })
      .catch(err=>{
          console.log("There was an error encrypting the password");
      }); 
    } else {
      reject("Password didn't match!");
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(function (resolve, reject) {
    User.findOne({userName: userData.userName})
    .exec()
    .then(users => {
      if(users) {
        bcrypt.compare(userData.password, users.password).then(result => {
          if(result) {
              users.loginHistory.push({dateTime: new Date().toString(), userAgent: userData.userAgent});
              User.updateOne(
                {userName: users.userName},
                {$set: {loginHistory: users.loginHistory}}
              ).exec()
              .then(() => {
                resolve(users);
              }).catch(err => {
                reject("There was an error varifying the user!");
              });
          } else reject(`Incorrect password for user ${userData.user}`);
      });
    } else reject(`Unable to find user ${userData.userName}`);   
    }).catch(err => {
      reject(`Unable to find a user ${userData.userName}`);
    });
  });
};

