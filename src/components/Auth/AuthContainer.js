import React, { PropTypes } from 'react';
import { withRouter } from 'react-router';
import * as firebase from 'firebase';
import { connect } from 'react-redux';

import { setAuthState } from 'redux/actions.js';
import Auth from './Auth.js';

class AuthContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      logErr: '',
      regErr: ''
    };

    /*
      Only functions that are being passed out of this scope, as in the case
      of passing props to children, need to be bound. This ensures that they
      can still access the scope of this component even though they are
      being called from another component.
    */
    this.handleRegister = this.handleRegister.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
  }

  setRegErr(message) {
    this.setState({
      regErr: message
    });
  }

  setLogErr(message) {
    this.setState({
      logErr: message
    });
  }

  handleRegister(data) {
    firebase.auth().createUserWithEmailAndPassword(data.email, data.password)
      .then((user) => {
        firebase.database().ref().child('users/' + user.uid).set({
          approvalStatus: false,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          points: 0,
          studentId: data.studentID,
          role: data.role
        })
      })
      .then(() => {
        console.log("User was registered");

        this.props.dispatch(setAuthState(data.role));

        if(this.props.authFinished) {
          this.props.authFinished();
        }
      })
      .catch((e) => {
        console.log(e.message);
        this.setRegErr(e.message);
      });
  }

  handleLogin(email, password) {
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((user) => {
        const rootRef = firebase.database().ref();
        const userRef = rootRef.child('users/' + user.uid + '/role');

        userRef.once('value')
          .then((snapshot) => {
            console.log("User was logged in");

            this.props.dispatch(setAuthState(snapshot.val()));

            if(this.props.authFinished) {
              this.props.authFinished();
            }
          });
      })
      .catch((e) => {
        console.log(e.message);
        this.setLogErr(e.message);
      });
  }

  render() {
    return (
      <Auth
        handleRegister={this.handleRegister}
        handleLogin={this.handleLogin}
        authCancelled={this.props.authCancelled}
        regErr={this.state.regErr}
        logErr={this.state.logErr} />
    );
  }
}

AuthContainer.propTypes = {
  authFinished: React.PropTypes.func,
  authCancelled: React.PropTypes.func.isRequired
}

export default connect()(withRouter(AuthContainer));
