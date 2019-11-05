import React from "react"
import PropTypes from "prop-types"

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
    let { authSelectors, authActions, getComponent, errSelectors, specSelectors, fn: { AST = {} } } = this.props
    const Row = getComponent('Row');

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
                <Row>
                  Complete this MAGE server's sign-in process to obtain an authorization token for API operations.
                </Row>
                <div className="auth-btn-wrapper">
                  <a target="signin" href="/#/signin" className="btn modal-btn auth authorize center">Sign-in to MAGE</a>
                </div>
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