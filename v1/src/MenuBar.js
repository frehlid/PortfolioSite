import React, { useState, useEffect } from 'react';

const MenuBar = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const formattedTime = `${hours}:${minutes < 10 ? '0' : ''}${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
      setTime(formattedTime);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(intervalId);
  }, []);

  const [activeMenu, setActiveMenu] = useState(null);

  const handleMenuClick = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <div className="menu-bar">
      <div className="menu-item" onClick={() => handleMenuClick('file')}>File
        {activeMenu === 'file' && (
          <div className="dropdown">
            <div className="dropdown-item">New</div>
            <div className="dropdown-item">Open</div>
            <div className="dropdown-item">Save</div>
          </div>
        )}
      </div>
      <div className="menu-item" onClick={() => handleMenuClick('edit')}>Edit
        {activeMenu === 'edit' && (
          <div className="dropdown">
            <div className="dropdown-item">Undo</div>
            <div className="dropdown-item">Redo</div>
            <div className="dropdown-item">Cut</div>
          </div>
        )}
      </div>
      <div className="menu-item" onClick={() => handleMenuClick('view')}>View
        {activeMenu === 'view' && (
          <div className="dropdown">
            <div className="dropdown-item">Zoom In</div>
            <div className="dropdown-item">Zoom Out</div>
            <div className="dropdown-item">Fullscreen</div>
          </div>
        )}
      </div>
      <div className="menu-item" onClick={() => handleMenuClick('go')}>Go
        {activeMenu === 'go' && (
          <div className="dropdown">
            <div className="dropdown-item">Back</div>
            <div className="dropdown-item">Forward</div>
            <div className="dropdown-item">Home</div>
          </div>
        )}
      </div>
      <div className="menu-item" onClick={() => handleMenuClick('window')}>Window
        {activeMenu === 'window' && (
          <div className="dropdown">
            <div className="dropdown-item">Minimize</div>
            <div className="dropdown-item">Zoom</div>
            <div className="dropdown-item">Close</div>
          </div>
        )}
      </div>
      <div className="menu-item" onClick={() => handleMenuClick('help')}>Help
        {activeMenu === 'help' && (
          <div className="dropdown">
            <div className="dropdown-item">Search</div>
            <div className="dropdown-item">Documentation</div>
            <div className="dropdown-item">About</div>
          </div>
        )}
      </div>
      <div className="menu-item clock">{time}</div>
    </div>
  );
};

export default MenuBar;
