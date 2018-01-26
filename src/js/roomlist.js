
import React, { Component } from 'react';
import { StandardInput } from './common';
import { RoomObject,RoomShortObject } from './roomobject';

class RoomList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            sortType: 'Alphabetical',
            sortMenuOpen: false,
            selectedChat: null,
            // filteredRooms: this.performFilterSort("",'Newest First'), // load these values from props.
            searchString: ""
        };
        this.handleFieldChange = this.handleFieldChange.bind(this);     
        // console.log(this.props.rooms);
    }
    
    toggleSortMenu() {
        this.setState({sortMenuOpen: !this.state.sortMenuOpen });
    }
    
    changeSort(value) {
      // console.log(value);
        this.toggleSortMenu();

        this.setState({
            sortType:value,
            // filteredRooms: this.performFilterSort(this.state.searchString,value)
        });
    }
    
    handleFieldChange(name,value) {
        // console.log(value);
        this.setState({
            searchString:value,
            // filteredRooms: this.performFilterSort(value,this.state.sortType)
        });
    }

    performFilterSort(searchString,sortType) {
        function alpha(a,b) {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        }
        function population(a,b) {
            if (a.characters < b.characters) return -1;
            if (a.characters > b.characters) return 1;
            return 0;
        }
        function type(a,b) {
            if (a.type < b.type) return -1;
            if (a.type > b.type) return 1;
            return 0;
        }
        function newest(a,b) { // TODO: this should look at the message timestamps.
            if (a.key < b.key) return -1;
            if (a.key > b.key) return 1;
            return 0;
        }
        function oldest(a,b) { // TODO: this should look at the message timestamps.
            if (a.key > b.key) return -1;
            if (a.key < b.key) return 1;
            return 0;
        }

        let array = this.props.rooms || [];

        if (searchString.length) {
            array = array.filter((obj)=> {
                // obj.name.match(/bookt/i)
                return obj.name.search(new RegExp(searchString, "i")) !== -1;
            });
        }
        
        // determine which function to use here.
        switch(sortType) {
            case 'Alphabetical':
                return array.sort(alpha);
            case 'Population':
                return array.sort(population);
            case 'Type':
                return array.sort(type);
            case 'Newest First':
                return array.sort(newest);
            case 'Oldest First':
                return array.sort(oldest);
            default:
                console.log('invalid sortType',sortType);
                return array;
        }
    }

    setSelectedChat(channelid) {
        console.log(channelid);
        // this needs to go to root so root can tell chat-window.
        this.props.setSelectedChat(channelid);
    }

    render() {
        const rooms = this.performFilterSort(this.state.searchString,this.state.sortType); //this.state.filteredRooms;
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
                        obj.selected = ( obj.id === this.state.selectedChat ? 'selected' : '' );
                            if (this.props.label === 'channels'){
                                return (
                                    <RoomShortObject 
                                        key={obj.key}
                                        user={obj}
                                        setSelectedChat={() => this.setSelectedChat(obj.key)}
                                    />
                                );
                            } else {
                                return (
                                    <RoomObject 
                                        key={obj.key}
                                        user={obj}
                                        setSelectedChat={() => this.setSelectedChat(obj.key)}
                                    />
                                );
                            }
                        
                    })}   
                    <div className={'no-rooms ' + (rooms.length ? "hidden" : "")}>No channels to show</div>
                </div>
            </div>
        );
    }
}

export default RoomList;