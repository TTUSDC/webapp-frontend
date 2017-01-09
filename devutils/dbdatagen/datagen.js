#!/usr/bin/env node

var tracer = require('tracer'); //For logging
var admin = require("firebase-admin");
var fs = require('fs'); //FileSystem
var Q = require('q')
var program = require('commander'); //For taking arguments
var colors = require("colors/safe"); //Makes user input pretty
var readLine = require('readline'); //For reading in files


/*******************************************************************************
 * UTILS
 *******************************************************************************/
//Logging stuff
tracer.setLevel(0) //'log':0, 'trace':1, 'debug':2, 'info':3, 'warn':4, 'error':5
var logger = tracer.console({
  format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
  dateformat: "HH:MM:ss.L"
});

//Ever used Pythons String .format() method? This does the same thing
String.prototype.format = function() {
  var i = 0,
    args = arguments;
  return this.replace(/{}/g, function() {
    return typeof args[i] !== "undefined" ? args[i++] : '';
  });
};

function genRandomString() {
  return Math.random().toString(36).substring(7);
}

//Helper function for handling errors
function onError(err) {
  logger.error('Message: %s', err.message)
  logger.debug('Stack: %j', err);
  closeFirebase();
  return 1;
}


/*******************************************************************************
 * Firebase
 *******************************************************************************/
var app = admin.initializeApp({
  credential: admin.credential.cert("./cpceed-firebase-admin-key.json"),
  databaseURL: "https://cpceed.firebaseio.com"
});

var db = admin.database();

function closeFirebase() {
  app.delete()
    .then(function() {
      logger.log("Firebase closed successfully");
    })
    .catch(function(error) {
      logger.error("Error closing firebase app:", error);
    });
}



/*******************************************************************************
 * Generating Data
 *******************************************************************************/
var uidWriteStream; //Used to writing generated UIDs to file

function generateData(templateFile) {
  uidWriteStream = fs.createWriteStream('./genUIDS', {'flags': 'a'});
  var template = JSON.parse(fs.readFileSync(templateFile));
  var propsList = [];
  template.people.forEach(function(person){
          propsList.push(createProps(person));
  })

  createUsers(propsList).then(function() {
    uidWriteStream.end();
    closeFirebase();
  })
}

//Type = student or admin
function createProps(template) {
  randomString = genRandomString();
  props = {}
  props.password = ((template.password) ? template.password : randomString);
  props.user = {} //This is the object that will be placed in "/users/{uid}"
  props.user.role = template.role; //This is required!
  props.user.email = ((template.email) ? template.email : "user{}@example.com".format(randomString));
  props.user.firstName = ((template.firstName) ? template.firstName : "First");
  props.user.lastName = ((template.lastName) ? template.lastName : "Last");
  props.displayName = ((template.displayName) ? template.displayName : "Display")

  props.user = ((props.user.role === "student") ? generateStudentData(props.user, template) : props.user)
  return props;
}

// Used to generate data specfic to the student role
function generateStudentData(user, template) {
  logger.log("Generating student data for", user.email)
  user.approvalStatus = ((template.approvalStatus) ? true : false);
  user.studentId = ((template.studentId) ? template.studentId : genRandomString());
  user.points = ((template.points) ? template.points : 10 );
  return user;
}

// Calls #createUser on every props in the list and gathers all promises.
// Returns a "promise of promises".
function createUsers(propsList) {
  var the_promises = [];
  propsList.forEach(function(props) {
    var deferred = Q.defer();
    createUser(props, function(error, props) {
      logger.log("Done creating user", props.uid);
      uidWriteStream.write("{}\n".format(props.uid))
      deferred.resolve(props)
    })
    the_promises.push(deferred.promise);
  });
  return Q.all(the_promises);
}

// Handles the firebase-admin calls to to creating the user and adding user data
function createUser(props, cb) {
  admin.auth().createUser({
      email: props.user.email,
      emailVerified: true,
      password: props.password,
      displayName: props.displayName,
      disabled: false
    })
    .then(function(userRecord) { // A UserRecord representation of the newly created user is returned
      logger.log("Successfully created new user:", userRecord.uid);
      props.uid = userRecord.uid;
      var usersRef = db.ref("users/")
      var userRef = usersRef.child(props.uid)
      userRef.update(props.user, function(error) {
        cb(error, props)
      })
    })
    .catch(function(error) {
      cb(error, props)
    });
}


/*******************************************************************************
 * Deleting Data
 *******************************************************************************/
// Iterates through the passed in file to get the UIDs of people that need to be
// deleted.
function deleteData(uidFile) {
  var uidList = []
  var delete_promises = [];
  logger.info("Deleting UIDs");

  //Reads through the file in an async way
  var lineReader = readLine.createInterface({
    input: fs.createReadStream(uidFile)
  });

  //Called on each line read in by lineReader
  lineReader.on('line', function(line) {
    uidList.push(line);
    var deferred = Q.defer();
    deleteUser(line, function(error, line) {
      logger.log("Removing used with uid:", line);
      deferred.resolve(line)
    })
    delete_promises.push(deferred.promise);
  });

  //Called when lineReader is done reading the file
  lineReader.on('close', function() {
    Q.all(delete_promises).then(function() {
      fs.unlink(uidFile)
      closeFirebase();
    })
  })
}

// Handles connecting to Firebase and deleting all relevant user data
function deleteUser(uid, cb) {
  admin.auth().deleteUser(uid)
    .then(function() {
      logger.log("Successfully deleted user", uid);
      logger.log("Removing user data")
      var usersRef = db.ref("users/")
      usersRef.update({
        [uid]: null
      }, function(error) {
        if(error) {
          logger.warn("Error removing user data for UID:", uid, error)
        }
        logger.log("Removed user data")
        cb(null, uid);
      })
    })
    .catch(function(error) {
      logger.error("Error deleting user:", error);
      cb(error, uid);
    });
}

/*******************************************************************************
* Activity & Event Points
*******************************************************************************/
//Used to reset the Activity & Event points to their default values
function resetAEPoints(){
  logger.log("Resetting A&E Points")
  var points = JSON.parse(fs.readFileSync("data/aepoints.json"));
  var pointsRef = db.ref("aepoints/")
  pointsRef.set(points, function(error) {
    logger.log("Done resetting A&E Points");
    closeFirebase();
  })
}

/*******************************************************************************
 * Program
 *******************************************************************************/
//Handles CLI arguemnts/options
program
  .version('0.0.1')
  .option('-g, --gen <genfile>', 'Generate data using passed in file as template')
  .option('-d, --delete <uidfile>', 'Delete all UIDs listed in file')
  .option('-p --points', 'Resets the activity & event points')
  .parse(process.argv);


if(program.gen) {
  generateData(program.gen);
} else if(program.delete) {
  deleteData(program.delete);
} else if(program.points){
  resetAEPoints();
}