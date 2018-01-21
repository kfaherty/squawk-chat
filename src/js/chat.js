import React, { Component } from 'react';
import { RelativeTime } from './common';

function ChatMessage(message){
	return (
		<div className="chat-message">
			<div className="user-name">{message.from}</div>
			<div className="timestamp">{message.timestamp}</div>
			<div className="message">{message.message}</div>
		</div>
	)
}

class Chat extends Component {
   	render() {
   		const chat = {title: 'Cool Coolname',
		subtitle: 'Online: Yo, just got home wow this is a long status',
		private: true,
		messages: [
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'This doesnt seem to work..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Oh. Weird. Nevermind.'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Cool'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'Hello'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Yep'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'This doesnt seem to work..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Oh. Weird. Nevermind.'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Cool'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'Hello'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Yep'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'This doesnt seem to work..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Oh. Weird. Nevermind.'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'There should be like.. timestamps between messages if the date changes.'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'Yeah I coded that on the last one. Probably can just use whatever I did there.'
			},
			{
				from: 'I sent this one',
				timestamp: '11:45 pm',
				mine: true,
				message: 'lol the database is refusing connections now. Use pg pools I guess..'
			},
			{
				from: 'Cool Coolname',
				timestamp: '11:45 pm',
				message: 'Are you going to fix the usernames?'
			},
		]}
		return (
			<div className="chat-window">
				<div className={"no-chat " + ( this.props.selectedChat ? "hidden" : "" )}>
					<span>No chat selected</span>
				</div>
				<div className="chat-contain {{unless chat 'hidden'}}">
					<div className="chat-header">
						<div className="chat-header-wrap">
							<div className="chat-title">{chat.title}</div>
							<div className="chat-subtitle">{chat.subtitle}</div>
						</div>
						<div className="settings-button">
							<div className="fi-widget"></div>
						</div>
					</div>

					<div className="widgetMenu">
						<div className="list-item"><div className="list-icon fi-x"></div>Close Chat</div>
						<div className="list-item"><div className="list-icon fi-star"></div>Favorite</div>
						<div className="list-item"><div className="list-icon fi-star"></div>Unfavorite</div>
						<div className="list-item"><div className="list-icon fi-plus"></div>Ignore</div>
						<div className="list-item"><div className="list-icon fi-minus"></div>Unignore</div>
						<div className="list-item"><div className="list-icon fi-flag"></div>Report</div>
					</div>

					<div className="messages-contain">
						{// map chat messages to template
						}

				    	<div className="typing-indicator">
				    		<div className="dot-one"></div>
				    		<div className="dot-two"></div>
				    		<div className="dot-three"></div>
				    	</div>
				    	<div className="input-padding"></div>
					</div>
					<div className="input-contain">
						<div className="label">
				    		<span>Type a message</span>
					    </div>
					    <textarea type="text" name="message" resizable="false" />
					    <div className="send">
					    	<div className="fi-send"></div>
					    </div>
					</div>
				</div>

				<div className="chat-user-profile-contain">
					profile
				</div>
				<div className="chat-user-list-contain">
					list
				</div>
			</div>
		)
	}
}

export default Chat;