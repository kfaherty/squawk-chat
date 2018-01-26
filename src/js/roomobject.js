import React, { Component } from 'react';
import { RelativeTime } from './common';

class Avatar extends Component {
	render() {
		let iconurl = '';
		if(this.props.icon) {
			iconurl = this.props.icon; // user icon
		} else if (this.props.public) {
			iconurl = ''; // Default public image
		} else {
			iconurl = ''; // Default private image
		}

		const avatarStyle = {
			background: 'url(' + iconurl + ') no-repeat 50% 50% / cover',
		};
		return (
			<div className="avatar-contain" style={avatarStyle}></div>
		)
	}
}

class RoomObject extends Component {
	roomObjectClicked() {
		this.props.setSelectedChat();
	}
	render() {
		const user = this.props.user;
		return (
			<div className={"room-object"} onClick={() => this.roomObjectClicked()}>
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

export {RoomObject};