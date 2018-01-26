import React, { Component } from 'react';

import Authorize from './authorize';
import RoomList from './roomlist';
import Chat from './chat';

import { gotLoginPromise,getFriends,getChannels,lostConnectionAlert,gainedConnectionAlert } from './api2';

class Root extends Component {
	constructor(props) {
    	super(props);
    	this.state = {
	    	selectedTab: 'messages',
	    	selectedChat: null,
	    	username: null,
	    	connected: true,
	    	loggedin: false,
	    	friendslist: [],
	    	roomslist: [],
	    	roomsjoined: [],
	    	userMenuOpen: false
	    };

	    lostConnectionAlert((err,connected) => {
	    	console.log('lost connection!');
	    	this.setState({connected: false});
	    });
	    gainedConnectionAlert((err,connected) => this.setState({connected: true}));

        this.setSelectedChat = this.setSelectedChat.bind(this);     
	}
    
    componentWillMount() {
	    gotLoginPromise().then((data) => {
			this.setState({
				loggedin: true,
				username: data
			});
	    });
    }

    updateJoinedRooms(data) { // callback
    	// TODO
    	// this function needs to get passed to api 
    	// so when a channel gets added/removed to channelsJoined they sync
    	this.setState({roomsjoined: data});
    }

    setSelectedTab(value) {
    	switch(value) {
    		// case 'messages':
    		// 	// get current joined rooms? 
    		// 	// no, this needs to be realtime..
    		// 	// we can just associate a callback and then have that trigger.
    		// 	break;
    		case 'channels':
    			getChannels().then((data) => {
    				this.setState({roomslist: data});
    			});
    			break;
    		case 'friends':
	    		getFriends().then((data) => {
					this.setState({friendslist: data})
				})
    			break;
    		default: 
    			break;
    	}

    	this.setState({selectedTab: value});
    }

    setSelectedChat(value) {
    	// TODO: check if we need to join this chat first.
    	// joinChannel(value);

    	// then update state so chat-window can render the contents.
    	this.setState({selectedChat:value});
    }
    clearSelectedChat() {
    	this.setState({selectedChat: null});
    }

    toggleUserMenu() {
    	this.setState({userMenuOpen: !this.state.userMenuOpen});
    }

	render() {
		return (
			<div className="app-wrapper">
				<Authorize visible={this.state.loggedin} />

			    <div className="top-bar">
			    	<div className={"potential-problem " + (this.state.connected ? "" : "visible")}>
						<p>Disconnected from data</p>
					</div>

			        <div className="logo-contain">
			            SquawkChat
			        </div>

			        <nav className="text-buttons-contain">
			            <span onClick={() => this.setSelectedTab('messages')} className={"text-button " + (this.state.selectedTab === 'messages' ? "active" : "")}>Messages</span>
			            <span onClick={() => this.setSelectedTab('channels')} className={"text-button " + (this.state.selectedTab === 'channels' ? "active" : "")}>Channels</span>
			            <span onClick={() => this.setSelectedTab('friends')}  className={"text-button " + (this.state.selectedTab === 'friends' ? "active" : "")}>Friends</span>
			            <span onClick={() => this.setSelectedTab('search')}   className={"text-button " + (this.state.selectedTab === 'search' ? "active" : "")}>Search Users</span>
			        </nav>
			        
			        <div className="logged-in-user-contain" onClick={() => this.toggleUserMenu()}>
			            <div className="user-name">{this.state.username}</div>
			            <div className="arrow"></div>
			            <div className="avatar"></div>
			        </div>
			        <div className={"dropdown " + (this.state.userMenuOpen ? "visible" : "")}>
			        	<div className="list-item" onClick={() => this.changeSort('Alphabetical')}><div className="list-icon fi-pencil"></div>Set Status</div>
			        	<div className="list-item" onClick={() => this.changeSort('Alphabetical')}><div className="list-icon fi-widget"></div>Settings</div>
	                    <div className="list-item" onClick={() => this.changeSort('Alphabetical')}><div className="list-icon fi-lock"></div>Logout</div>
	                </div>

			        <div className="controls-contain">
			            <div className="arrow right"></div>
			        </div>
			    </div>

				<div className="app-contain">
					{/* MESSAGES */}
					<RoomList
						rooms={this.state.roomsjoined}
						label="messages"
						activeTab={(this.state.selectedTab === 'messages' ? true : false)}
						setSelectedChat={this.setSelectedChat}
					/>
					{/* CHANNELS */}
					<RoomList
						rooms={this.state.roomslist}
						label="channels"
						activeTab={(this.state.selectedTab === 'channels' ? true : false)}
						setSelectedChat={this.setSelectedChat}
					/>
					{/* FRIENDS */}
					<RoomList
						rooms={this.state.friendslist}
						label="friends"
						activeTab={(this.state.selectedTab === 'friends' ? true : false)}
						setSelectedChat={this.setSelectedChat}
					/>
					
					{/* SEARCH */}
					{/* // TODO */}

					{/* CHAT */}
					<Chat 
						selectedChat={this.state.selectedChat} 
						clearSelectedChat={(value)=>this.clearSelectedChat(value)}
					/>
				</div>
			</div>
        );
	}
}

export default Root;