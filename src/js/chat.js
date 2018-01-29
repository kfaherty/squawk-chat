import React, { Component } from 'react';
import { performFilterSort,RelativeTime,ParsedText } from './common';
import { sendMessage,privateMessage } from './api2'

function ChatMessage(props){
	// console.log(message);
	const message = props.data;
	return (
		<div className={"chat-message " + (message.mine ? "mine" : "")}>
			<div className="user-name">{message.character}</div>
			<RelativeTime created_at={message.timestamp} />
			<div className="message"><ParsedText character={message.character} text={message.message} /></div>
		</div>
	)
}

class UserList extends Component {
	constructor(props) {
    	super(props);

    	this.state= {
    		sortType: this.props.defaultSort || 'Alphabetical',
            searchString: ""
    	}
	}
	handleClick(name) {
		if (!name) {
			console.log('whatd you click?',name);
			return;
		}
		this.props.usernameClicked(name);
	}
   	render() {
   		console.log(this.props.users);
        const users = performFilterSort(this.props.users || [],this.state.searchString,this.state.sortType); //this.state.filteredRooms;

		return (
			<div className={"chat-user-list-contain " + ( this.props.userListOpen ? "" : "full" )}>
				{users && users.map((obj) => {
					// TODO: gender stuff.
					// TODO: status icons.

					return (
						<div className="list-user" key={obj.identity} onClick={() => this.handleClick(obj.identity)}>
							<div className="status-icon"></div>
							<div className="rank-icon"></div>
							<div className="user-name">{obj.identity}</div>
						</div>
					)	
				})}
			</div>
		)
	}
}

class Chat extends Component {
	constructor(props) {
    	super(props);

    	this.state= {
			chatMenuOpen: false,
			favorited: this.props.favorited, // this is going to come from cookie.
			ignored: this.props.ignored
    	}
    	this.usernameClicked = this.usernameClicked.bind(this);
	}
    toggleChatMenu() {
    	this.setState({chatMenuOpen: !this.state.chatMenuOpen});
    }
    clearSelectedChat() {
    	this.props.clearSelectedChat();

    	// TODO: tell the api we've left a channel

		// this.toggleChatMenu();
    }
    reportSelectedChat() {
    	this.props.reportSelectedChat();
    	this.toggleChatMenu();
    }
    toggleFavorite() {
    	// TODO: write into favorites list
    	this.setState({favorited: !this.state.favorited});
    	this.toggleChatMenu();
    }
    toggleIgnore() {
    	// TODO: api needs to tell server we've added this.
    	// TODO: write into ignore list.

    	this.setState({ignored: !this.state.ignored});
    	this.toggleChatMenu();
    }
    handleChange(event){
		this.setState({
			inputValue: event.target.value
		});
    }
	handleKeyDown(event) {
		// console.log(event.key);
		if (event.key === 'Shift') {
  			this.shiftDown = true;
  		}
  	}
  	handleKeyUp(event) {
  		if (event.key === 'Shift') {
  			this.shiftDown = false;
  		}
        if (event.key === 'Enter' && !this.shiftDown) {
  			this.onSendMessage();
  		}
  	}
 	onSendMessage(){
 		if (this.state.inputValue) {
 			if (this.props.chat.type === 3) {
 				privateMessage(this.props.selectedChat,this.state.inputValue.trim());
 			} else {
    			sendMessage(this.props.selectedChat,this.state.inputValue.trim());
    		}
    		this.lastInput = this.state.inputValue; // save this incase the user wants it back.
    		this.setState({inputValue:''}); // clear input here.
    	}
    }
    usernameClicked(value) {
    	console.log(value);
    	// open a pm to this user!
    	// TODO!
    }
   	render() {
   		const chat = this.props.chat;
		return (
			<div className="chat-window">
				<div className={"no-chat " + ( this.props.selectedChat ? "hidden" : "" )}>
					<span>No chat selected</span>
				</div>
				{this.props.selectedChat && (
					<div className="chat-wrap">
						<div className={"chat-contain " + (this.props.userListOpen ? "" : "full")}>
							<div className="chat-header">
								<div className="chat-header-wrap">
									<div className="chat-title">{chat.channel}</div>
									
									{(() => {
								        switch (chat.type) {
								        	case 0: return <div className="chat-subtitle"><ParsedText text={chat.description} /></div>;
								        	case 1: return <div className="chat-subtitle"><ParsedText text={chat.description} /></div>;
								        	case 2: return <div className="chat-subtitle"><ParsedText text={chat.description} /></div>;
								        	case 3: return ''; // TODO: render status and stuff.
								        	default: return '';
								        }
								    })()}
								</div>
								<div className="settings-button" onClick={() => this.toggleChatMenu()}>
									<div className="fi-widget"></div>
								</div>
							</div>

					        <div className={"dropdown " + (this.state.chatMenuOpen ? "visible" : "")}>
								<div onClick={() => this.clearSelectedChat()} className="list-item"><div className="list-icon fi-trash"></div>{chat.type === 3 ? "Close Chat" : "Leave Channel"}</div>
								<div onClick={() => this.toggleFavorite()} className={"list-item " + (this.state.favorited ? "hidden" : "")}><div className="list-icon fi-star"></div>Favorite</div>
								<div onClick={() => this.toggleFavorite()} className={"list-item " + (this.state.favorited ? "" : "hidden")}><div className="list-icon fi-star"></div>Unfavorite</div>
								{(chat.type === 3) && (<div onClick={() => this.toggleIgnore()} className={"list-item " + (this.state.ignored ? "hidden" : "")}><div className="list-icon fi-plus"></div>Ignore</div>)}
								{(chat.type === 3) && (<div onClick={() => this.toggleIgnore()} className={"list-item " + (this.state.ignored ? "" : "hidden")}><div className="list-icon fi-minus"></div>Unignore</div>)}
								<div onClick={() => this.reportSelectedChat()} className="list-item"><div className="list-icon fi-flag"></div>Report</div>
							</div>

							<div className="messages-contain">
								{chat.messages && chat.messages.map((obj) => {
									// TODO filter out ignored users

									return (
									  <ChatMessage 
									    key={obj.key}
									    data={obj} 
									  />
									)
								})}

						    	<div className={"typing-indicator " + 
						    	    (() => {
								        switch (chat.typing) {
								        	case "typing": return 'visible';
								        	case "paused": return 'paused';
								        	case "clear":  return '';
								        	default:      return '';
								        }
								    })()
						    	}>
						    		<div className="dot-one"></div>
						    		<div className="dot-two"></div>
						    		<div className="dot-three"></div>
						    	</div>
						    	<div className="input-padding"></div>
							</div>

							<div className="input-contain">
								<div className={"label " + (this.state.inputValue ? "hidden" : "")} >
						    		<span>Type a message</span>
							    </div>
							    <textarea type="text" name="message" resizable="false" value={this.state.inputValue} onKeyUp={(event) => this.handleKeyUp(event)} onKeyDown={(event) => this.handleKeyDown(event)} onChange={(event) => this.handleChange(event)} />
							</div>
						</div>
						{(chat.type === 3) && (
							<div className={"chat-user-profile-contain " + ( this.props.userListOpen ? "" : "full" )}>
								profile
							</div>
						)}
						{(chat.type !== 3) && (
							<UserList users={chat.users} userListOpen={this.props.userListOpen} usernameClicked={this.usernameClicked} />
						)}
					</div>
				)}
			</div>
		)
	}
}

export default Chat;