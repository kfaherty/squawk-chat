import React, { Component } from 'react';
import { RelativeTime,ParsedText,Avatar } from './common';

class ChatMessage extends Component {
	handleClick(name) {
		if (!name) {
			console.log('whatd you click?',name);
			return;
		}
		this.props.usernameClicked(name);
	}
   	render() {
		const message = this.props.data;
		if (message.systemMessage) {
			return (
				<div className="system-message">
					<ParsedText character={''} text={message.message} />
				</div>
			);
		}

		return (
			<div className={"chat-message " + (message.mine ? "mine " : "") + (message.ping ? "ping " : "")  + (message.friend ? "friend " : "")  + (message.bookmark ? "bookmark " : "")}>
				<Avatar name={message.character} type={3} />
				<div className={"status-badge " + message.status}></div>
		
				<div className="user-name">{message.character}</div>

				<RelativeTime created_at={message.timestamp} />
				<div className="message"><ParsedText character={message.character} text={message.message} /></div>
			</div>
		);
	}
}

export default ChatMessage;