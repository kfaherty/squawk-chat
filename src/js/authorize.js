import React, { Component } from 'react';
import { getRequestToken,gotTwitterLoginPromise } from './api';
import {StandardInput} from './common';


class Authorize extends Component {
	handleClick() {

	}
	render() {
		return (
			<div className={"authorize-contain " + (this.props.visible ? "visible" : "" )}>
				<div className="authorize-background"></div>
				<div className="authorize-modal">
					<div className="logo-row">
						{/*<div className="fi-first-aid"></div>*/}
						<h1>SquawkChat</h1>
					</div>

					<StandardInput inputName='Username' />
					<StandardInput inputName='Password' type='password' />
					
					<div className="login-wrap">
						<button onClick={() => this.handleClick()}>Login</button>
					</div>
				</div>
			</div>
		);
	}
}

export default Authorize;