
import React, { Component } from 'react';
import { performFilterSort,StandardInput } from './common';
import { RoomObject,RoomShortObject } from './roomobject';

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortType: this.props.defaultSort || 'Alphabetical',
            sortMenuOpen: false,
            selectedChat: null,
            searchString: ""
        };
        this.handleFieldChange = this.handleFieldChange.bind(this);     
    }
    
    toggleSortMenu() {
        this.setState({sortMenuOpen: !this.state.sortMenuOpen });
    }
    
    changeSort(value) {
        this.toggleSortMenu();
        this.setState({
            sortType:value,
        });
    }
    
    handleFieldChange(name,value) {
        this.setState({
            searchString:value,
        });
    }

    setSelectedChat(channelName) {
        // console.log(channelid);
        // this goes to root so root can tell chat-window.
        this.props.setSelectedChat(channelName);
    }

    render() {
        const rooms = performFilterSort(this.props.rooms || [],this.state.searchString,this.state.sortType,this.props.label);
        // console.log(rooms);
        return (
            <div className={"room-list-contain " + this.props.label+" " + (this.props.activeTab ? "visible" : "")}>
                <div className="search">
                    <StandardInput 
                        iconClass="fi-magnifying-glass"
                        inputName='Search' 
                        onChange={this.handleFieldChange}
                    />
                </div>

                <div className="sort" onClick={() => this.toggleSortMenu()}>
                  <div className="label">Sort: {this.state.sortType}</div>
                	<div className="arrow"></div>
                </div>
                <div className={"dropdown " + (this.state.sortMenuOpen ? "visible" : "")}>
                    <div className="list-item" onClick={() => this.changeSort('Alphabetical')}><div className="list-icon fi-text-color"></div>Alphabetical</div>
                    <div className="list-item" onClick={() => this.changeSort('Population')}><div className="list-icon fi-torsos"></div>Population</div>
                    <div className="list-item" onClick={() => this.changeSort('Type')}><div className="list-icon fi-filter"></div>Type</div>
                    <div className="list-item" onClick={() => this.changeSort('Newest First')}><div className="list-icon fi-arrow-up"></div>Newest First</div>
                    <div className="list-item" onClick={() => this.changeSort('Oldest First')}><div className="list-icon fi-arrow-down"></div>Oldest First</div>
                </div>

                <div className="room-list">
                    {rooms.map((obj) => {
                        obj.selected = ( obj.name === this.props.selectedChat ? 'selected' : '' );
                        if (this.props.label === 'channels'){
                            return (
                                <RoomShortObject 
                                    key={obj.name}
                                    user={obj}
                                    setSelectedChat={() => this.setSelectedChat(obj.name)}
                                />
                            );
                        } else {
                            return (
                                <RoomObject 
                                    key={obj.name}
                                    user={obj}
                                    setSelectedChat={() => this.setSelectedChat(obj.name)}
                                />
                            );
                        }
                    })}   
                    <div className={'no-rooms ' + (rooms.length ? "hidden" : "")}>No {this.props.label} to show</div>
                </div>
            </div>
        );
    }
}

export default RoomList;