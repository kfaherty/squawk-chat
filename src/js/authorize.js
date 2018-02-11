import React, { Component } from 'react';
import { login,loadCookie,createSocket } from './api2';
import { StandardInput } from './common';
import loadURLS from './apiurls';
const apiurls = loadURLS();

class Authorize extends Component {
	constructor(props) {
    	super(props);
    	this.state = {
    		username: '',
    		password: '',
    		usernamehaserror: false,
    		passwordhaserror: false,
    		showLogin: true,
    		list: []
    	};

	    this.handleFieldChange = this.handleFieldChange.bind(this);	    
	    this.handleKeyDown = this.handleKeyDown.bind(this);	    

	    loadCookie().then((list) => {
			this.setState({ list:list, showLogin:false });
	    }).catch((error) => console.log(error));
    }
	handleLoginClick() {
		let validated = true;
		if (!this.state.username) {
			validated = false;
			this.setState({usernamehaserror:true});
		}	
		if (!this.state.password) {
			validated = false;
			this.setState({passwordhaserror:true});
		}	

		if (validated && !this.submittedLogin) {
			this.submittedLogin = true; // lockout button.
			login(this.state.username,this.state.password).then((list) => {
				// console.log('list!',list);
				this.submittedLogin = false;
				this.setState({ list:list, showLogin:false });
			}).catch((error) => {
				this.submittedLogin = false;
				this.setState({error: error,showError:true});
			});
		}
	}
	handleFieldChange(name,value) {
		switch(name) {
			case 'Username':
				this.setState({username:value,usernamehaserror:false,showError: false});
				break;
			case 'Password':
				this.setState({password:value,passwordhaserror:false,showError: false});
				break
			default:
				break;
		};
	}
	handleConnectClick(option) {
		if (option.obj) {
			createSocket(option.obj)
			.catch((error) => {
				console.log(error);
				// route to login.
				this.setState({ list:[], showLogin:true });
			});
		} else {
			console.error('cant parse character..',option);
		}
	}
	handleKeyDown(event) {
  		// console.log(event.key);
        if (event.key === 'Enter') {
    		this.handleLoginClick();
        }
    }

    sortCharacters(array) {
	    function alpha(a,b) {
    		return a.toLowerCase().localeCompare(b.toLowerCase());
        }
    
        return array.sort(alpha);
    }

	render() {
		const characterlist = this.sortCharacters(this.state.list || []);
		// console.log(characterlist);
		
		return (
			<div className={"authorize-contain " + (this.props.visible ? "" : "visible" )}>
				{/* <div className="authorize-background"></div> */}

				<div className="version-wrap">version {apiurls.version}</div>

				<div className="authorize-modal">
					<div className="logo-row">
						<h1>SquawkChat</h1>
					</div>

					<div className={"login "+ (this.state.showLogin? "active":"")}>
						<div className={"login-input " + (this.state.usernamehaserror ? "error" : "")}>
							<StandardInput 
								inputName='Username' 
								iconClass="fi-torso" 
								onChange={this.handleFieldChange} 
				                onKeyDown={this.handleKeyDown}
							/>
						</div>
						<div className={"login-input " + (this.state.passwordhaserror ? "error" : "")}>
							<StandardInput 
								inputName='Password' 
								iconClass="fi-lock" 
								type='password' 
								onChange={this.handleFieldChange} 
				                onKeyDown={this.handleKeyDown}
							/>
						</div>
						
						<div className="login-wrap">
							<button onClick={() => this.handleLoginClick()}>Login</button>
						</div>
					</div>
					<div className={"character-select " + (this.state.showLogin? "":"active")}>
						<div className="subtitle">Select Character </div>

						<div className="select-wrap">
							{characterlist.map((obj,index) => {
								return (
									<button className="character-option" onClick={() => this.handleConnectClick({obj})} key={index}>{obj}</button>
								)
							})}
						</div>
					</div>
				</div>

				<div className={"error-wrap " + (this.state.showError ? "visible":"")}>{this.state.error}</div>
			</div>
		);
	}
}

export default Authorize;