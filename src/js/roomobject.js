import React, { Component } from 'react';
import { RelativeTime } from './common';

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
					console.log('invalid type',this.props);
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

				<RelativeTime created_at={user.relativeTime} />
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
				<Avatar icon={user.icon} public={user.public} />

				<div className="user-icon-contain">
					<div className={"user-icon fi-star " + (user.friend ? "active" : "")}></div>
					<div className={"user-icon fi-bookmark " + (user.bookmark ? "active"  : "")}></div>
				</div>

				<div className="details-contain">
					<div className="user-name">{user.name}</div>
					<div className="message-type">{user.userStatus}{user.statusMessage ? (": "+user.statusMessage) : ""}</div>
					<div className="snippet">{user.snippet}</div>
				</div>

				<RelativeTime created_at={user.relativeTime} />
			</div>
		);
	}
}

export {RoomObject,RoomShortObject};