import * as React from 'react';
import { login,loadCookie,createSocket } from './api2';
import { StandardInput } from './common';
import loadURLS from './apiurls';

const apiurls = loadURLS();

interface ICharacterChooser {
	obj: ICharacter
	handleClick: void
};

class Character extends React.Component<ICharacterChooser, {}> {
	handleConnectClick () {
		this.props.handleClick(this.props.obj);
	}
	render() {
		return (
			<button className="character-option" onClick={this.handleConnectClick} key={this.props.obj}>{this.props.obj}</button>
		)
	}
}

interface IAuthorizeState {
	username: string;
	password: string;
	usernamehaserror: boolean;
	passwordhaserror: boolean;
	showLogin: boolean;
	showError: boolean;
	submittingLogin: boolean;
	error: string;
	list: ICharacter[];
}

class Authorize extends React.Component<{}, IAuthorizeState> {
	componentWillReceiveProps() {
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

		if (validated && !this.state.submittingLogin) {
			this.setState({ submittingLogin: true }); 
			login(this.state.username,this.state.password).then((list) => {
				this.setState({ submittingLogin: false, list:list, showLogin:false });
			}).catch(error => {
				this.setState({submittingLogin: true, error, showError:true});
			});
		}
	}
	handleFieldChange: (name: string): void {
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
				<div className="authorize-background"></div>

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
							<button onClick={this.handleLoginClick}>Login</button>
						</div>
					</div>
					<div className={"character-select " + (this.state.showLogin? "":"active")}>
						<div className="subtitle">Select Character </div>

						<div className="select-wrap">
							{characterlist.map((obj) => {
								return (
									<Character
										handleClick={this.handleConnectClick}
										character={obj} 
									/>
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