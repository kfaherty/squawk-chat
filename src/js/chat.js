import React, { Component } from 'react';
import { RelativeTime } from './common';
import { sendMessage,privateMessage } from './api2'

function ChatMessage(props){
	// console.log(message);
	const message = props.data;
	return (
		<div className={"chat-message " + (message.mine ? "mine" : "")}>
			<div className="user-name">{message.character}</div>
			<RelativeTime created_at={message.timestamp} />
			<div className="message">{message.message}</div>
		</div>
	)
}

function ListUser(props){
	const user = props.data;
	
	// TODO: gender stuff.
	// TODO: status icons.

	return (
		<div className="list-user">
			<div className="status-icon"></div>
			<div className="rank-icon"></div>
			<div className="user-name">{user.identity}</div>
		</div>
	)
}

class Chat extends Component {
	constructor(props) {
    	super(props);

    	this.state= {
			chatMenuOpen: false,
			favorited: this.props.favorited, // this is going to come from cookie.
			ignored: this.props.ignored
    	}
	}
    toggleChatMenu() {
    	this.setState({chatMenuOpen: !this.state.chatMenuOpen});
    }
    clearSelectedChat() {
    	this.props.clearSelectedChat();
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
		if (event.key == 'Shift') {
  			this.shiftDown = true;
  		}
  	}
  	handleKeyUp(event) {
  		if (event.key == 'Shift') {
  			this.shiftDown = false;
  		}
        if (event.key == 'Enter' && !this.shiftDown) {
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
   	render() {
   		const chat = this.props.chat;
   		let users = undefined;
   		if (chat && chat.users) {
   			users = Object.values(chat.users);
   		}
		return (
			<div className="chat-window">
				<div className={"no-chat " + ( this.props.selectedChat ? "hidden" : "" )}>
					<span>No chat selected</span>
				</div>
				{this.props.selectedChat && (
					<div className="chat-wrap">
						<div className={"chat-contain "}>
							<div className="chat-header">
								<div className="chat-header-wrap">
									<div className="chat-title">{chat.channel}</div>
									{(chat.type === 0 || chat.type === 1) && (
										<div className="chat-subtitle">{chat.description}</div>
									)}
									{/* other chat types..! */}
								</div>
								<div className="settings-button" onClick={() => this.toggleChatMenu()}>
									<div className="fi-widget"></div>
								</div>
							</div>

					        <div className={"dropdown " + (this.state.chatMenuOpen ? "visible" : "")}>
								<div onClick={() => this.clearSelectedChat()} className="list-item"><div className="list-icon fi-x"></div>Close Chat</div>
								<div onClick={() => this.toggleFavorite()} className={"list-item " + (this.state.favorited ? "hidden" : "")}><div className="list-icon fi-star"></div>Favorite</div>
								<div onClick={() => this.toggleFavorite()} className={"list-item " + (this.state.favorited ? "" : "hidden")}><div className="list-icon fi-star"></div>Unfavorite</div>
								<div onClick={() => this.toggleIgnore()} className={"list-item " + (this.state.ignored ? "hidden" : "")}><div className="list-icon fi-plus"></div>Ignore</div>
								<div onClick={() => this.toggleIgnore()} className={"list-item " + (this.state.ignored ? "" : "hidden")}><div className="list-icon fi-minus"></div>Unignore</div>
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

						    	<div className="typing-indicator">
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
						<div className="chat-user-profile-contain">
							profile
						</div>
						<div className="chat-user-list-contain">
							{users && users.map((obj) => {
								return (
									<ListUser
										key={obj.identity}
										data={obj}
									/>
								)	
							})}
						</div>
					</div>
				)}
			</div>
		)
	}
}

export default Chat;