server = {
  errorMessages: {
    invalidLogin: "Invalid user/password combination"
  },

  login: function(email, password) {
    return new Promise(function(resolve, reject) {
      if(dummyData.auth[email] == password && password){
        server._currentUser = dummyData.users[dummyData.emailToUid[email]]
        resolve(server._currentUser)
      }
      else reject(server.errorMessages.invalidLogin)
    })
  },
  logout: function(){
    server._currentUser = null;
  },
  getLoggedInUser: function(){
    return server._currentUser;
  }
}

dummyData = {
  auth: {
    "patty.lastname@ttu.edu": "patty123",
    "john.doesnt@ttu.edu": "john234",
    "sally.does@ttu.edu": "324sally"
  },
  emailToUid: {
    "patty.lastname@ttu.edu": "QveDEhTHWSgVbnL4NXrdD6rSvns1",
    "john.doesnt@ttu.edu": "hMXRXnHKQdbGmX9bwaZntRaJER03",
    "sally.does@ttu.edu": "k8fcP5IgEVcuVVaOTQWduYwheur1"
  },
  users: {
    "QveDEhTHWSgVbnL4NXrdD6rSvns1": {
      email: "patty.lastname@ttu.edu",
      firstName: "Patty",
      lastName: "PattysLastName",
      role: "ADMIN"
    },
    "hMXRXnHKQdbGmX9bwaZntRaJER03": {
      approvalStatus: true,
      email: "john.doesnt@ttu.edu",
      firstName: "John",
      lastName: "Doesnt",
      points: 0,
      role: "STUDENT",
      studentId: "110452"
    },
    "k8fcP5IgEVcuVVaOTQWduYwheur1": {
      approvalStatus: true,
      email: "sally.does@ttu.edu",
      firstName: "Sally",
      lastName: "Does",
      points: 0,
      role: "STUDENT",
      studentId: "110451"
    }
  }
}