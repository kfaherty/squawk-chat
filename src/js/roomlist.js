
import React, { Component } from 'react';
import { RelativeTime } from './common';
import { RoomObject } from './roomobject';

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortType: 'Newest First'
        };
    }
    render() {
        const testuser = {
            name: 'cool coolname',
            bookmark: false,
            friend:true,
            userStatus: "busy",
            statusMessage: 'okokokok',
            snippet: 'alright, thats cool',
            relativeTime: '11:45'
        }
        return (
            <div className="room-list-contain">
                <div className="search">
                	<div className="label">
                		<div className="fi-magnifying-glass"></div>
                    	<span>Search</span>
                    </div>
                    <input type="text" name="search" />
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
                        { // TODO: this needs data & map
                        }
                    <RoomObject user={testuser}/>
                </div>
            </div>
        );
    }
}

export default RoomList;