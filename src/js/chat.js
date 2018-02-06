import React, { Component } from 'react';
import ReactDOM from 'react-dom'

import Textarea from "react-textarea-autosize";

import { ParsedText } from './common';
import { sendMessage,privateMessage,sendTyping,createPrivateMessage,leaveChannel } from './api2'

import ChatMessage from './chatmessage';
import UserList from './userlist';
import UserProfile from './userprofile';

class TypingIndicator extends Component {
	render(){
		return (
			<div className={"typing-indicator " + 
			    (() => {
			        switch (this.props.typing) {
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
		);
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

		this.inputs = {};
    	this.scrolledBottom = false;
    	this.usernameClicked = this.usernameClicked.bind(this);
	    this.handleScroll = this.handleScroll.bind(this);
	}

    clearSelectedChat() {
		clearTimeout(this.timeout);
		leaveChannel(this.props.selectedChat);
    	this.props.clearSelectedChat();
    }
    setSelectedChat(channelName) {
        this.props.setSelectedChat(channelName);
    }

    toggleChatMenu() {
    	this.setState({chatMenuOpen: !this.state.chatMenuOpen});
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
	reportSelectedChat() {
    	this.props.reportSelectedChat();
    	this.toggleChatMenu();
    }

    handleScroll() { // detect if should scroll on new message recieve
        const dom = ReactDOM.findDOMNode(this);
		if ((dom.scrollTop+dom.clientHeight) >= dom.scrollHeight) {
	      	this.scrolledBottom = true;
	      	return;
		}
	    this.scrolledBottom = false;
	}
    scrollToBottom(jump){ // scroll
    	// console.log('scrolling bottom.');
    	if (jump) {
			this.messagesEnd.scrollIntoView();
    	} else {
    		this.messagesEnd.scrollIntoView({ behavior: "smooth" });	
    	}
	}

    handleChange(event){ // textarea.
		this.setState({
			inputValue: event.target.value
		});

		this.inputs[this.props.selectedChat] = event.target.value;

    	if (this.props.chat.type === 3) { // this only needs to run if this is a private chat.
	    	if (this.typing && !event.target.value) {
	    		this.typing = false;
	    		this.paused = false;
	    		clearTimeout(this.timeout);
	    		
	    		sendTyping('clear',this.props.selectedChat); // send tpn clear
	    	}
	    	if ((!this.typing || this.paused) && event.target.value){
	    		this.typing = true;
	    		this.paused = false;

	    		sendTyping('typing',this.props.selectedChat); // send tpn typing

	    		let thisPM = this.props.selectedChat;

	    		clearTimeout(this.timeout);
	    		this.timeout = setTimeout(() => {
		    		sendTyping('paused',thisPM); // send tpn paused
	    			this.paused = true;
				},3000);
	    	}
		}
    }
	handleKeyDown(event) {
        if (event.key === 'Enter' && !this.shiftDown) {
        	event.preventDefault();
        	event.nativeEvent.stopPropagation();
        	event.nativeEvent.preventDefault(); 
    	  	event.nativeEvent.stopImmediatePropagation();
    	}
		if (event.key === 'Shift') {
  			this.shiftDown = true;
  		}
  	}
  	handleKeyUp(event) {		
  		if (event.key === 'Shift') {
  			this.shiftDown = false;
  		}
        if (event.key === 'Enter' && !this.shiftDown) {
        	event.preventDefault();
        	event.nativeEvent.stopPropagation();
        	event.nativeEvent.preventDefault(); 
    	  	event.nativeEvent.stopImmediatePropagation();

  			this.onSendMessage();
  		}
  	}
 	onSendMessage(){
 		if (this.state.inputValue) {
			this.inputs[this.props.selectedChat] = '';

 			if (this.props.chat.type === 3) {
 				this.typing = false;
	    		this.paused = false;
	    		clearTimeout(this.timeout);

 				privateMessage(this.props.selectedChat,this.state.inputValue.trim());
 			} else {
    			sendMessage(this.props.selectedChat,this.state.inputValue.trim());
    		}
    		this.lastInput = this.state.inputValue; // save this incase the user wants it back.
    		this.setState({inputValue:''}); // clear input here.
    	}
    }
    getLogs(value) {
    	// TODO
    }
    usernameClicked(value) {
    	if (value) {
    		createPrivateMessage(value); // open a pm to this user!
    		this.setSelectedChat(value); // change selected chat.
    	}
    }

    componentWillReceiveProps(nextProps)  {
		if (nextProps.selectedChat !== this.props.selectedChat) { // if you've changed chats
	    	this.setState({
	    		chatMenuOpen: false, // reset chat menu.
	    		inputValue: this.inputs[nextProps.selectedChat] || ''
	    	});

	    	// if you switched chats, clear the statuses here.
    		this.typing = false;
    		this.paused = false;
	   	}
    }

   	render() {
   		const chat = this.props.chat || [];
   		const messages = this.props.messages || [];
   		const users = this.props.users || [];
		return (
			<div className="chat-window">
				<div className={"no-chat " + ( this.props.selectedChat ? "hidden" : "" )}>
					<span>No chat selected</span>
				</div>

				<div className={"chat-wrap " + ( this.props.selectedChat ? "" : "hidden" )}>
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
							<div onClick={() => this.getLogs()} className="list-item"><div className="list-icon fi-page-filled"></div>Get logs</div>								
							<div onClick={() => this.reportSelectedChat()} className="list-item"><div className="list-icon fi-flag"></div>Report</div>
						</div>

						<div className="messages-contain" onScroll={this.handleScroll}>
							{messages && messages.map((obj) => {
								// TODO filter out ignored users

								return (
								  <ChatMessage 
								    key={obj.key}
								    data={obj} 
								  />
								)
							})}

					    	<TypingIndicator typing={chat.typing} />

					    	<div className="input-padding"></div>
					    	<div className='marker-bottom' ref={(el) => { this.messagesEnd = el; }}></div>
						</div>

						<div className="input-contain">
							<div className={"label " + (this.state.inputValue ? "hidden" : "")} >
					    		<span>Type a message</span>
						    </div>

						    <Textarea
							  	minRows={3}
						  	  	maxRows={12}
						  	  	type="text"
						  	  	name="message"
						  	  	resizable="false"
					  	  	    useCacheForDOMMeasurements={true}
						  	  	value={this.state.inputValue}
						  	  	onKeyUp={(event) => this.handleKeyUp(event)}
						  	  	onKeyDown={(event) => this.handleKeyDown(event)}
						  	  	onChange={(event) => this.handleChange(event)}
							/>
						</div>
					</div>
					{(chat.type === 3) && (
						<UserProfile 
							userListOpen={this.props.userListOpen} 
							profile={[]} // TODO
						/>
					)}
					{(chat.type !== 3) && (
						<UserList 
							users={users} 
							userListOpen={this.props.userListOpen} 
							usernameClicked={this.usernameClicked} 
						/>
					)}
				</div>
				
			</div>
		)
	}

	componentDidUpdate(prevProps) {
		if (prevProps.selectedChat !== this.props.selectedChat) { // scroll to the bottom if you've changed chats
			this.scrollToBottom(true);
			return;
		}

		if (this.scrolledBottom) { // scrolled to bottom already == scroll again.
			this.scrollToBottom();
		}
	}
}

export default Chat;