import React, { Component } from 'react';
import { RelativeTime } from './common';

function ChatMessage(props){
	// console.log(message);
	const message = props.data;
	return (
		<div className={"chat-message " + (message.mine ? "mine" : "")}>
			<div className="user-name">{message.from}</div>
			<RelativeTime created_at={message.timestamp} />
			<div className="message">{message.message}</div>
		</div>
	)
}

class Chat extends Component {
	// constructor(props) {
 //    	super(props);
	// }
   	render() {
   		const chat = this.props.chat || {messages:[]};
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
								{chat.messages.map((obj) => {
									obj.selected = ( obj.id_str === this.props.selectedChat ? 'selected' : '' );
									return (
									  <ChatMessage 
									    key={obj.id_str}
									    data={obj} 
									    // onClick={()=>this.setSelectedTweet(obj.id_str)}
									    // mentionHandler={(screen_name)=>this.setSelectedUser(screen_name)} 
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
				)}
			</div>
		)
	}
}

export default Chat;