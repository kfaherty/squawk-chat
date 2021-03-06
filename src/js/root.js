import React, { Component } from 'react';
import { ToastContainer, toast, style } from 'react-toastify';
import { Avatar,ParsedText } from './common';
import Authorize from './authorize';
import RoomList from './roomlist';
import Chat from './chat';
import Search from './search';
import StatusModal from './statusmodal';

import { 
	logout,gotLoginPromise,lostConnectionAlert,gainedConnectionAlert,
	joinChannel,getChannelMessages,getChannelUsers,createPrivateMessage,getAnyChannelData,
	fetchChannels,fetchPrivate,
	getFriends,getChannels,getJoinedChannels,getPrivateChannels,
	updateStatus,
	setChannelsCallback,setJoinedChannelsCallback,setFriendsCallback,setSelectedChatCallback,setSelectedChat,setCreateToastCallback,setChannelMessagesCallback,setChannelUsersCallback,setPrivateChannelsCallback
} from './api2';

style({ // toasts style overrides.
  	width: "320px",
  	colorDefault: "#fff",
  	colorProgressDefault: "transparent",
  	mobile: "only screen and (max-width : 480px)",
  	fontFamily: "'Verlag', sans-serif",
  	zIndex: 9999,

  	TOP_RIGHT: {
    	top: 	'90px',
    	right: 	'20px'
  	},
});

class NotificationTemplate extends Component {
    render(){
	    return (
        	<div className={"toast-item " + (this.props.error ? "error" : "")}>
        		<div className="content-wrap">
        			<div className="toast-header">{this.props.header}</div>
			    	<div className="toast-content"><ParsedText character={this.props.character} text={this.props.text} /></div>
			    </div>
			    <button onClick={this.props.closeToast}>Dismiss</button>
			</div>
      	);
    }
}

class Root extends Component {
	constructor(props) {
    	super(props);

    	this.state = {
	    	selectedTab: 'messages',

	    	selectedChat: null,
	    	chatData: undefined,
	    	chatMessages: undefined,
	    	chatUsers: undefined,

	    	username: null,
	    	connected: true,
	    	loggedin: false, // false
	    	
	    	friendslist: [],
	    	roomslist: [],
	    	privatelist: [],
	    	roomsjoined: [],

	    	userMenuOpen: false,
	    	userListOpen: true,

	    	showStatusModal: false,
	    	currentStatus: 'online',
	    	currentStatusMessage: ''
	    };
		
		// these trigger the inital loads
	    this.friendsLoaded = false;
	    this.channelsLoaded = false;
	    this.privateLoaded = false;

		this.updateStatus = this.updateStatus.bind(this);
        this.setSelectedChat = this.setSelectedChat.bind(this);   
        this.reportSelectedChat = this.reportSelectedChat.bind(this);
	}
    
	assignCallbacks() {
	    // messages:
	    setJoinedChannelsCallback((data) => {
			// console.log('new joined data',data);
			if (this.state.selectedTab === 'messages') {
				this.setState({roomsjoined: data});
			}
	    });
	    // channels:
		setChannelsCallback((data) => {
			// console.log('new channel data',data);
			if (this.state.selectedTab === 'channels') {
				this.setState({roomslist: data});
			}
		});
		// private:
		setPrivateChannelsCallback((data) => {
			// console.log('new private data',data);
			if (this.state.selectedTab === 'private') {
				this.setState({privatelist: data});
			}
		});
	    // friends:
	    setFriendsCallback((data) => {
	    	// console.log('friends data',data);
			if (this.state.selectedTab === 'friends') {
				this.setState({friendslist: data});
			}
	    });
	    // sselected chat
	    setSelectedChatCallback((data) => {
	    	console.log('chat update',data);
	    	this.setState({chatData:data});
	    });
	    // melba toasts
	    setCreateToastCallback((props) => {
	    	this.createToast(props);
	    });
	    // channel messages
	    setChannelMessagesCallback((data) => {
	    	// console.log('updating messages',data.length);
	    	this.setState({chatMessages: data});
	    });
	    //channel users 
	    setChannelUsersCallback((data => {
	    	// console.log('updating users',data);
	    	if (this.state.userListOpen) {
	    		this.setState({chatUsers: data});
	    	}
	    }))
	}

	createToast(props) {
		toast(<NotificationTemplate {...props} />);

		// TODO: add this to notifications history.
	}

    componentWillMount() {
	    gotLoginPromise().then((data) => {
			this.setState({
				loggedin: true,
				username: data
			});
	    });

	    lostConnectionAlert((err,connected) => {
	    	this.setState({connected: false});
	    });
	    gainedConnectionAlert((err,connected) => {
	    	this.setState({connected: true})
	    });

	    this.assignCallbacks();
    }

    setSelectedTab(value) {
    	switch(value) {
    		case 'messages':
    			this.setState({roomsjoined:getJoinedChannels()});
    			break;
    		case 'channels':
    			if (!this.channelsLoaded) {
					fetchChannels();
					this.channelsLoaded = true;
				}
				this.setState({roomslist:getChannels()});
    			break;
    		case 'private':
    			if (!this.privateLoaded) {
    				fetchPrivate();
					this.privateLoaded = true;
				}
				this.setState({privatelist:getPrivateChannels()}); 
    			break;
    		case 'friends':
    			this.setState({friendslist:getFriends()});
    			break;
    		default:
    			break;
    	}
    	this.setState({selectedTab: value});
    }

    setSelectedChat(value,type) {
    	if (value) {
    		if (type === 3) {
    			createPrivateMessage(value);
    		} else {
    			joinChannel(value);
    		}
    		setSelectedChat(value); // syncs callback to updates.
    		this.setState({
    			selectedChat:value,
    			chatData: getAnyChannelData(value), // load initial data.
    			chatMessages: getChannelMessages(value),
    			chatUsers: getChannelUsers(value) // might be able to optimize this out on pm
    		});
    	}
    }

    clearSelectedChat() {
    	this.setState({
    		selectedChat: null,
    		chatData: undefined
    	});
    	setSelectedChat(undefined);
    }

    toggleUserMenu() {
    	this.setState({userMenuOpen: !this.state.userMenuOpen});
    }

    toggleUserList() {
    	this.setState({userListOpen: !this.state.userListOpen});
    }

    reportSelectedChat() {
    	// TODO
    	console.log('ok',this.state.selectedChat);
    	// SFC
    	// << SFC { "action": "report", "report": string, "character": string }
    }

    toggleSettings() {
		// TODO
    }

    toggleStatus() {
    	this.setState({showStatusModal: !this.state.showStatusModal,userMenuOpen: false});
    	// this.toggleUserMenu();
    }

    updateStatus(status,statusmsg) {
    	console.log(status,statusmsg);
    	updateStatus(status,statusmsg);
    	this.setState({
    		currentStatus: status,
    		currentStatusMessage: statusmsg
    	});
    }

    createChannel() {
    	// << CCR { "channel": string }
    }

    logout() {
		logout();
    }

	render() {
		return (
			<div className="app-wrapper">
				<Authorize visible={this.state.loggedin} />
          		
          		<div className="toasts-contain">
          			<ToastContainer 
          				autoClose={20000} 
          				newestOnTop={true} 
          				hideProgressBar={true} 
          				closeButton={false} 
          			/>
				</div>

   				<div className={"potential-problem " + (this.state.connected ? "" : "visible")}>
					<p>Connection Terminated</p>
				</div>

			    <div className={"top-bar "  + (this.state.loggedin ? "" : "blurred")}>
			        <div className="logo-contain">SquawkChat</div>

			        <nav className="text-buttons-contain">
			            <span onClick={() => this.setSelectedTab('messages')} className={"text-button " + (this.state.selectedTab === 'messages' ? "active" : "")}>Messages</span>
			            <span onClick={() => this.setSelectedTab('channels')} className={"text-button " + (this.state.selectedTab === 'channels' ? "active" : "")}>Channels</span>
			            <span onClick={() => this.setSelectedTab('private')} className={"text-button " + (this.state.selectedTab === 'private' ? "active" : "")}>Private</span>
			            <span onClick={() => this.setSelectedTab('friends')}  className={"text-button " + (this.state.selectedTab === 'friends' ? "active" : "")}>Friends</span>
			            { <span onClick={() => this.setSelectedTab('search')}   className={"text-button " + (this.state.selectedTab === 'search' ? "active" : "")}>Search</span> }
			        </nav>
			        
			        <div className={"logged-in-user-contain " + (this.state.userListOpen ? "" : "full")} onClick={() => this.toggleUserMenu()}> 
			        	{!!this.state.username && (<div className="user-header">
				        	<div className="user-wrap">
				            	<div className="user-name">{this.state.username}</div>
				            	<div className="user-status">
				            		<span className="status">{this.state.currentStatus}</span>
				            		{this.state.currentStatusMessage && (<span>: <ParsedText character={this.state.username} text={this.state.currentStatusMessage} /></span>)}
				            	</div>
				            </div>
				        </div>)}
			            <div className={"arrow " + (this.state.userMenuOpen ? "flipped" : "")}></div>
						<Avatar name={this.state.username} type={3} />
						<div className={"status-badge " + this.state.currentStatus}></div>
			        </div>
			        <div className={"dropdown " + (this.state.userMenuOpen ? "visible " : "") + (this.state.userListOpen ? "" : "full")}>
			        	<div className="list-item" onClick={() => this.toggleStatus()}><div className="list-icon fi-pencil"></div>Status</div>
			        	<div className="list-item" onClick={() => this.toggleSettings()}><div className="list-icon fi-widget"></div>Settings</div>
	                    <div className="list-item" onClick={() => this.logout()}><div className="list-icon fi-lock"></div>Logout</div>
	                </div>

	                <StatusModal
	                	showStatusModal={this.state.showStatusModal}
	                	full={this.state.userListOpen}
	                	updateStatus={this.updateStatus}
	                	currentStatus={this.state.currentStatus}
	                	currentStatusMessage={this.state.currentStatusMessage}
	                	closeModal={() => this.toggleStatus()}
	                />

			        <div className={"controls-contain " + (this.state.userListOpen ? "" : "full")}>
			            <div className="arrow right" onClick={() => this.toggleUserList()}></div>

			            {/*<div className="chat-toggles">
			            	<div className="fi-list selected"></div>
			            	<div className="fi-list-thumbnails"></div>
			            </div>*/}
			        </div>
			    </div>

				<div className={"app-contain "  + (this.state.loggedin ? "" : "blurred")}>
					{/* MESSAGES */}
					<RoomList
						selectedChat={this.state.selectedChat}
						rooms={this.state.roomsjoined}
						defaultSort={'Newest First'}
						label="messages"
						activeTab={(this.state.selectedTab === 'messages' ? true : false)}
						setSelectedChat={this.setSelectedChat}
					/>
					{/* CHANNELS */}
					<RoomList
						selectedChat={this.state.selectedChat}
						rooms={this.state.roomslist}
						defaultSort={'Alphabetical'}
						label="channels"
						activeTab={(this.state.selectedTab === 'channels' ? true : false)}
						setSelectedChat={this.setSelectedChat}
					/>

					{/* PRIVATE */}
					<RoomList
						selectedChat={this.state.selectedChat}
						rooms={this.state.privatelist}
						defaultSort={'Population'}
						label="private channels"
						activeTab={(this.state.selectedTab === 'private' ? true : false)}
						setSelectedChat={this.setSelectedChat}
					/>

					{/* FRIENDS */}
					<RoomList
						selectedChat={this.state.selectedChat}
						rooms={this.state.friendslist}
						defaultSort={'Status'}
						label="friends"
						activeTab={(this.state.selectedTab === 'friends' ? true : false)}
						setSelectedChat={this.setSelectedChat}
					/>
					
					{/* SEARCH */}
					<Search />

					{/* CHAT */}
					<Chat 
						chat={this.state.chatData}
						messages={this.state.chatMessages}
						users={this.state.chatUsers}
						selectedChat={this.state.selectedChat} 
						reportSelectedChat={this.reportSelectedChat}
						clearSelectedChat={()=>this.clearSelectedChat()}
						userListOpen={this.state.userListOpen}
						setSelectedChat={this.setSelectedChat}						
					/>
				</div>
			</div>
        );
	}
}

export default Root;
