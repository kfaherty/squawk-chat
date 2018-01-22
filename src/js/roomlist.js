
import React, { Component } from 'react';
import { StandardInput,RelativeTime } from './common';
import { RoomObject } from './roomobject';

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortType: 'Newest First',
            selectedChat: null
        };
    }
    render() {
        const testuser = [
            {
              name: 'Cool Coolname',
              relativeTime: '11:45 pm',
              status: 0,
              userStatus: "Offline",
              statusMessage: null,
              friend: true,
              snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
            },
            {
              name: 'Cool Coolname',
              relativeTime: '11:45 pm',
              status: 1,
              userStatus: "Online",
              statusMessage: 'Yo, just got home wow this is a long status',
              friend: false,
              bookmark: true,
              selected: true,
              snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
            },
            {
              name: 'Cool Coolname',
              relativeTime: '11:45 pm',
              status: 2,
              userStatus: "Busy",
              statusMessage: null,
              friend: false,
              snippet: 'Hey dude Hope you are fine lorem ipsum Dolor sit amet, consectetur adipiscing elit, sed do magnaet ifsa nidsian kgskhg idshgi ingskngls klngds'
            }
        ];
        return (
            <div className="room-list-contain">
                <div className="search">
                    <StandardInput 
                        iconClass="fi-magnifying-glass"
                        inputName='Search' 
                    />
                </div>
                <div className="sort" >
                    <div className="label">Sort: {this.state.sortType}</div>
                	<div className="arrow"></div>
                </div>
                <div className="sortMenu">
                    <div className="list-item"><div className="list-icon fi-arrow-up"></div>Newest First</div>
                    <div className="list-item"><div className="list-icon fi-arrow-down"></div>Oldest First</div>
                    <div className="list-item"><div className="list-icon fi-text-color"></div>Alphabetical</div>
                    <div className="list-item"><div className="list-icon fi-filter"></div>Type</div>
                </div>
                <div className="room-list">
                    {testuser.map((obj) => {
                        obj.selected = ( obj.id === this.state.selectedChat ? 'selected' : '' );
                        return (
                            <RoomObject user={obj}/>
                        )
                    })}   
                </div>
            </div>
        );
    }
}

export default RoomList;