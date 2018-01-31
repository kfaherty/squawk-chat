import React, { Component } from 'react';
import { RelativeTime,ParsedText } from './common';

class Avatar extends Component {
	render() {
		let iconurl = '';
		
		if(this.props.icon) { // if there's an icon, always use this.
			iconurl = this.props.icon; // user icon
		} else { // if not, render a default one.
			switch(this.props.type) {
				case 0:
					iconurl = ''; // Default public image
					break;
				case 1:
					iconurl = ''; // Default private image
					break;
				case 2:
					iconurl = ''; // Default private invite only image
					break;
				case 3:
					iconurl = ''; // Default private pm image
					break;
				default:
					// console.trace('invalid type',this.props);
					break;
			}
		}

		const avatarStyle = {
			background: 'url(' + iconurl + ') no-repeat 50% 50% / cover',
		};
		return (
			<div className="avatar-contain" style={avatarStyle}></div>
		)
	}
}

class RoomShortObject extends Component {
	roomObjectClicked() {
		this.props.setSelectedChat();
	}
	render() {
		const user = this.props.user;
		return (
			<div className={"room-object short " + (user.selected ? "selected" : "")} onClick={() => this.roomObjectClicked()}>
				<Avatar icon={user.icon} type={user.type} />

				<div className="details-contain">
					<div className="user-name">{user.name}</div>
					<div className="message-type">Users: {user.characters}</div>
				</div>
			</div>
		);
	}
}

class RoomObject extends Component {
	roomObjectClicked() {
		this.props.setSelectedChat();
	}
	render() {
		const user = this.props.user;
		return (
			<div className={"room-object " + (user.selected ? "selected" : "")} onClick={() => this.roomObjectClicked()}>
				<Avatar icon={user.icon} type={user.type} />

				<div className={"unread-badge " + (user.unread > 0 ? "" : "hidden")}>{user.unread}</div>

				{user.type === 3 && (
					<div className={"status-badge " + user.status}></div>
				)}

				<div className="user-icon-contain">
					<div className={"user-icon fi-star " + (user.friend ? "active" : "")}></div>
					<div className={"user-icon fi-bookmark " + (user.bookmark ? "active"  : "")}></div>
				</div>

				<div className="details-contain">
					<div className="user-name">{user.channel}</div>
					{(() => {
				        switch (user.type) {
				        	case 0: return <div className="message-type">Public Channel</div>;
				        	case 1: return <div className="message-type">Private Channel</div>;
				        	case 2: return <div className="message-type">Invite Only</div>;
				        	case 3:
				        		switch (user.typing) {
						        	case "typing": return <div className="message-type">{user.channel} is typing..</div>;
						        	case "paused": return <div className="message-type">{user.channel} has entered text</div>;
						        	case "clear":  return <div className="message-type">{user.status}{user.statusmsg ? (": "+user.statusmsg) : ""}</div>;
						        	default:       return <div className="message-type">{user.status}{user.statusmsg ? (": "+user.statusmsg) : ""}</div>;
						        } 
				        	default: return '';
				        }
				    })()}
					<div className="snippet">
						{(user.lastUser) && (
							<span>{user.lastUser}: </span>
						)}
						{user.lastMessage ? (<ParsedText character={user.lastUser} text={user.lastMessage }/>) :  'No messages to show'}
					</div>
				</div>

				<RelativeTime created_at={user.timestamp} />
			</div>
		);
	}
}

export {RoomObject,RoomShortObject};