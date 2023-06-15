import * as React from 'react';

import { login,loadCookie,createSocket } from '../api/api2';
import StandardInput from './StandardInput';

import { version } from '../config/api-urls';

interface ICharacterChooser {
	character: string;
	handleClick: (obj: string) => void;
};

class Character extends React.Component<ICharacterChooser, {}> {
	handleConnectClick (): void {
		this.props.handleClick(this.props.character);
	}
	render() {
		return (
			<button className="character-option" onClick={this.handleConnectClick} key={this.props.character}>{this.props.character}</button>
		)
	}
}

interface IAuthorizeProps {
	visible: boolean;
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
	list: string[];
}

class Authorize extends React.Component<IAuthorizeProps, IAuthorizeState> {
	componentWillReceiveProps() {
	    loadCookie().then((list) => {
			this.setState({ list:list, showLogin:false });
	    }).catch((error) => console.log(error));
	}
	handleLoginClick(): void {
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
			}).catch((error: string) => {
				this.setState({submittingLogin: true, error, showError:true});
			});
		}
	}
	handleFieldChange(name: string, value: string): void {
		switch(name) {
			case 'Username':
				this.setState({ username: value, usernamehaserror:false, showError: false});
				break;
			case 'Password':
				this.setState({ password: value, passwordhaserror:false, showError: false});
				break
			default:
				break;
		};
	}
	handleConnectClick(option: any) { // TODO: fix this.
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
	handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
		if (event.key === 'Enter') {
			this.handleLoginClick();
		}
	}

	sortCharacters(array: string[]) {
		function alpha(a: string,b: string) {
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
				<div className="version-wrap">version {version}</div>
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
