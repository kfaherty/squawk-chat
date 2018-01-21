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

			        <div class="logo-contain">
			            SquawkChat
			        </div>
			        <nav class="text-buttons-contain">
			            <span class="text-button active">Messages</span>
			            <span class="text-button">Channels</span>
			            <span class="text-button">Friends</span>
			            <span class="text-button">Find User</span>
			        </nav>
			        <div class="logged-in-user-contain">
			            <div class="user-name">User Name</div>
			            <div class="arrow"></div>
			            <div class="avatar"></div>
			        </div>
			        <div class="controls-contain">
			            <div class="arrow right"></div>
			        </div>
			    </div>

				<div className="app-contain">
					<RoomList />
					<Chat />
				</div>
			</div>
        );
	}
}

export default Root;
