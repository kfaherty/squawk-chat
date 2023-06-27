import React from "react";
import StandardInput from "./StandardInput";
import { RoomObject, RoomShortObject } from "./RoomObject";

// TODO: typedef.
const alpha = (a, b) => {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};
const population = (a, b) => {
  // pop
  if (a.population > b.population) return -1;
  if (a.population < b.population) return 1;

  //alpha
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};
const type = (a, b) => {
  // bookmarks/favorites..
  if (a.favorite && !b.favorite) return 1;
  if (!a.favorite && b.favorite) return -1;
  if (a.friend && !b.friend) return 1;
  if (!a.friend && b.friend) return -1;
  if (a.bookmark && !b.bookmark) return 1;
  if (!a.bookmark && b.bookmark) return -1;

  // channel type
  if (a.type < b.type) return -1;
  if (a.type > b.type) return 1;

  // alpha
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};
const status = (a, b) => {
  // looking
  if (a.status === "looking" && b.status !== "looking") return -1;
  if (a.status !== "looking" && b.status === "looking") return 1;
  // online
  if (a.status === "online" && b.status !== "online") return -1;
  if (a.status !== "online" && b.status === "online") return 1;
  // everything else
  if (a.status !== "offline" && b.status === "offline") return -1;
  if (a.status === "offline" && b.status !== "offline") return 1;

  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};
const newest = (a, b) => {
  if (a.timestamp > b.timestamp) return -1;
  if (a.timestamp < b.timestamp) return 1;

  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};
const oldest = (a, b) => {
  if (a.timestamp < b.timestamp) return -1;
  if (a.timestamp > b.timestamp) return 1;

  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};

type VALID_SORT = 'Alphabetical' | 'Population' | 'Type' | 'Status' | 'Newest First' | 'Oldest First';

interface IRoomList {
  sortType: VALID_SORT,
  label: string;
  rooms: Array<any> // TODO: typedef.
  activeTab: string;
  selectedChat: string;
  setSelectedChat: (channelName: string, type: number) => void;
}

const RoomList: React.FC<IRoomList> = ({ sortType: sortTypeProps, label, rooms, activeTab, selectedChat, setSelectedChat}) => {
  const [searchString, setSearchString] = React.useState<string>("");
  const [sortMenuOpen, setShowSortMenu] = React.useState<boolean>(false);
  const [sortType, setSortType] = React.useState<VALID_SORT>(sortTypeProps);

  const performFilterSort = React.useCallback((rooms: any, searchString: string, sortType: VALID_SORT) => {
    let sortedRooms = rooms;
    
    if (!Array.isArray(rooms)) {
      sortedRooms = Object.values(rooms);
    }
    if (searchString.length) {
      sortedRooms = rooms.filter((obj: any) => {//TODO: typedef
        return obj.name.search(new RegExp(searchString, "i")) !== -1;
      });
    }

    // determine which function to use here.
    switch (sortType) {
      case "Alphabetical":
        return sortedRooms.sort(alpha);
      case "Population":
        return sortedRooms.sort(population);
      case "Type":
        return sortedRooms.sort(type);
      case "Status":
        return sortedRooms.sort(status);
      case "Newest First":
        return sortedRooms.sort(newest);
      case "Oldest First":
        return sortedRooms.sort(oldest);
      default:
        console.log("invalid sortType", sortType);
        return sortedRooms;
    }
  },
  []);

  const toggleSortMenu = React.useCallback(() => {
    setShowSortMenu((value) => !value);
  }, []);

  const changeSort = React.useCallback((value: string) => {
    toggleSortMenu();
    setSortType( value as VALID_SORT);
  }, [toggleSortMenu]);

  const handleFieldChange = React.useCallback((_name: any, value: string) => {
    setSearchString(value);
  },
  []
  );

    const sortedRooms = React.useMemo(() => performFilterSort(
      rooms || [],
      searchString,
      sortType,
    ), [performFilterSort, rooms, searchString, sortType]);

    return (
      <div
        className={
          "room-list-contain " +
          label +
          " " +
          (activeTab ? "visible" : "")
        }
      >
        <div className="search">
          <StandardInput
            iconClass="fi-magnifying-glass"
            inputName="Search"
            onChange={handleFieldChange}
          />
        </div>

        <div className="sort" onClick={() => toggleSortMenu()}>
          <div className="label">Sort: {sortType}</div>
          <div
            className={"arrow " + (sortMenuOpen ? "flipped" : "")}
          ></div>
        </div>
        <div
          className={"dropdown " + (sortMenuOpen ? "visible" : "")}
        >
          <div
            className="list-item"
            onClick={() => changeSort("Alphabetical")}
          >
            <div className="list-icon fi-text-color"></div>Alphabetical
          </div>
          <div
            className="list-item"
            onClick={() => changeSort("Population")}
          >
            <div className="list-icon fi-torsos"></div>Population
          </div>
          <div className="list-item" onClick={() => changeSort("Type")}>
            <div className="list-icon fi-filter"></div>Type
          </div>
          <div className="list-item" onClick={() => changeSort("Status")}>
            <div className="list-icon fi-filter"></div>Status
          </div>
          <div
            className="list-item"
            onClick={() => changeSort("Newest First")}
          >
            <div className="list-icon fi-arrow-up"></div>Newest First
          </div>
          <div
            className="list-item"
            onClick={() => changeSort("Oldest First")}
          >
            <div className="list-icon fi-arrow-down"></div>Oldest First
          </div>
        </div>

        <div className="room-list">
          {sortedRooms.map((obj) => {
            obj.selected =
              obj.name === selectedChat ? "selected" : "";
            if (label === "messages") {
              return (
                <RoomObject
                  key={obj.channel}
                  user={obj}
                  setSelectedChat={() =>
                    setSelectedChat(obj.channel, obj.type)
                  }
                />
              );
            } else {
              return (
                <RoomShortObject
                  key={obj.channel}
                  user={obj}
                  setSelectedChat={() =>
                    setSelectedChat(obj.channel, obj.type)
                  }
                />
              );
            }
          })}
          <div className={"no-rooms " + (rooms.length ? "hidden" : "")}>
            No {label} to show
          </div>
        </div>
      </div>
    );
  }


export default RoomList;
