import React, { Component } from 'react';

import Authorize from './authorize';
import RoomList from './roomlist';
import Chat from './chat';

import { createStatus, gotTwitterLoginPromise, fetchHomeTimeline, fetchMentions,fetchFavorites,subscribeToHomeTimeline } from './api';

class Root extends Component {
	constructor(props) {
    	super(props);
    	this.state = {
	    	selectedTab: 'timeline',
	    	userData: null,
	    	connected: true,
	    };
	}
    
    componentWillMount() {
	  //   gotTwitterLoginPromise().then((data) => {
			this.setState({
				userData: true
			});
	  //   });
    }

	render() {
		return (
			<div className="app-wrapper">
				<Authorize visible={this.state.userData} />

			    <div class="top-bar">
			    	<div className={"potential-problem " + (this.state.connected ? "" : "visible")}>
						<p>Disconnected from data</p>
					</div>

			        <div className="logo-contain">
			            SquawkChat
			        </div>
			        <nav className="text-buttons-contain">
			            <span className="text-button active">Messages</span>
			            <span className="text-button">Channels</span>
			            <span className="text-button">Friends</span>
			            <span className="text-button">Find User</span>
			        </nav>
			        <div className="logged-in-user-contain">
			            <div className="user-name">User Name</div>
			            <div className="arrow"></div>
			            <div className="avatar"></div>
			        </div>
			        <div className="controls-contain">
			            <div className="arrow right"></div>
			        </div>
			    </div>

				<div className="app-contain">
					<RoomList />
					<Chat selectedChat="true" />
				</div>
			</div>
        );
	}
}

export default Root;
