import React from "react"
import PropTypes from "prop-types"

export class MageCurrentUser extends React.Component {

  render() {
    const { mageAuthSelectors, getComponent } = this.props;
    const Row = getComponent('Row');
    if (mageAuthSelectors.tokenUserFetching()) {
      return (
        <div className="loading-container">
          <div className="loading"></div>
        </div>
      );
    }
    const user = mageAuthSelectors.tokenUser() || new Error('Unknown error fetching current user');
    if (user instanceof Error) {
      return (
        <Row>
          Error fetching current user: {user.message}
        </Row>
      )
    }
    if (user.get('username')) {
      return (
        <Row>
          You are currently signed-in to this MAGE server as {user.get('username')}.
        </Row>
      )
    }
    console.log('unknown error fetching current user: ', user);
    return (
      <div>
        <Row>
          Unknown error fetching current user
        </Row>
        <Row></Row>
      </div>
    )
  }
}

export class MageSignInPrompt extends React.Component {

  render() {
    const { getComponent } = this.props;
    const Row = getComponent('Row');
    return (
      <div>
        <Row>
          Complete this MAGE server's sign-in process to obtain an authorization token for API operations.
        </Row>
        <div className="auth-btn-wrapper">
          <a target="signin" href="/#/signin" className="btn modal-btn auth authorize center">Sign-in to MAGE</a>
        </div>
      </div>
    );
  }
}

export class MageAuthPopup extends React.Component {

  constructor(props) {
    super(props);
    this.close = this.close.bind(this);
    this.state = {
      name: props.name,
      name: props.schema,
      value: this.getToken()
    }
  }

  getToken () {
    const { mageAuthSelectors } = this.props;
    return mageAuthSelectors.mageToken();
  }

  close() {
    let { authActions } = this.props
    authActions.showDefinitions(false)
  }

  render() {
    let { authSelectors, mageAuthSelectors, authActions, getComponent, errSelectors, specSelectors, fn } = this.props
    const isTokenSet = !!this.getToken();
    const CurrentUser = getComponent('MageCurrentUser');
    const SignInPrompt = getComponent('MageSignInPrompt');
    return (
      <div className="dialog-ux">
        <div className="backdrop-ux"></div>
        <div className="modal-ux">
          <div className="modal-dialog-ux">
            <div className="modal-ux-inner">
              <div className="modal-ux-header">
                <h3>MAGE Authorization</h3>
                <button type="button" className="close-modal" onClick={ this.close }>
                  <svg width="20" height="20">
                    <use href="#close" xlinkHref="#close" />
                  </svg>
                </button>
              </div>
              <div className="modal-ux-content">
              {
                isTokenSet ?
                <CurrentUser mageAuthSelectors={mageAuthSelectors} getComponent={getComponent}/>
                :
                <SignInPrompt getComponent={getComponent}/>
              }
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

MageAuthPopup.propTypes =  {
  fn: PropTypes.object.isRequired,
  getComponent: PropTypes.func.isRequired,
  authSelectors: PropTypes.object.isRequired,
  specSelectors: PropTypes.object.isRequired,
  errSelectors: PropTypes.object.isRequired,
  authActions: PropTypes.object.isRequired,
};