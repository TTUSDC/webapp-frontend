import React from 'react';
import {withRouter} from 'react-router';
import * as firebase from 'firebase';
import {connect} from 'react-redux';

import {logoutUser} from 'redux/actions.js';
import logger from 'logger/logger.js';
import NavBar from './NavBar.js';

class NavBarContainer extends React.Component {
  constructor(props) {
    super(props);

    /*
      navigate needs to be bound to the context of NavBarContainer to
      access the router, since it is being called from NavBar.js.
    */
    this.navigate = this.navigate.bind(this);
    this.logout = this.logout.bind(this);
  }

  /*
    Navigates by pushing the relative URL to the router.

    navigate needs to be wrapped in an arrow function before being passed
    to onClick because it has a custom parameter. onClick only passes an
    event, so it won't know how to supply other parameters. But you can't
    add parentheses to navigate because that would call it rather than
    passing it as a variable. Arrow functions allow navigate to have
    parentheses because they wrap it in a variable, so the function call
    doesn't happen until the variable is called as a function.
  */
  navigate(url) {
    this.props.router.push(url);
  }

  logout() {
    firebase.auth().signOut()
      .then(() => {
        logger.info("User was signed out");

        // Set user to guest
        this.props.dispatch(logoutUser());
      })
      .catch((e) => {
        logger.error(e.message);
      });

    this.props.router.push('/');
  }

  render() {
    return (
      /*
        As a presenter, NavBar.js isn't allowed to modify data; this
        includes the router. To maintain the paradigm, the navigate
        function is passed to NavBar.js as a prop. When it is called
        from NavBar.js, the context switches back to NavBarContainer.js.
      */
      <NavBar
        user={this.props.user}
        navigate={this.navigate}
        logout={this.logout}/>
    );
  }
}

// Used by mapStateToProps to get the current user from the redux store
const getUser = (user) => {
  return user;
}

// Used by connect to map user to this.props.user
const mapStateToProps = (state) => {
  return {
    user: getUser(state.user)
  }
}

export default connect(mapStateToProps)(withRouter(NavBarContainer));
