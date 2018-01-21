import React, { Component } from 'react';
import { RelativeTime } from './common';

class RoomObject extends Component {
	render() {
		const user = this.props.user;
		return (
			<div className={"room-object"}>
				<div className="avatar-contain"></div>
				<div className="user-icon-contain">
					<div className={"user-icon fi-star" + (user.friend ? "active" : "")}></div>
					<div className={"user-icon fi-bookmark" + (user.bookmark ? "active"  : "")}></div>
					
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