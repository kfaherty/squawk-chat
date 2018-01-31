import React from 'react';
import { RelativeTime,ParsedText } from './common';

function ChatMessage(props){
	// console.log(message);
	const message = props.data;
	return (
		<div className={"chat-message " + (message.mine ? "mine " : "") + (message.ping ? "ping " : "")}>
			<div className="user-name">{message.character}</div>
			<RelativeTime created_at={message.timestamp} />
			<div className="message"><ParsedText character={message.character} text={message.message} /></div>
		</div>
	)
}

export default ChatMessage;