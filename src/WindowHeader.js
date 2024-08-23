import React from 'react';

function WindowHeader(props) {
    return (
            <div className="window-header">
        <h4 className="window-title">{props.title}</h4>
        <button className="close-button" onClick={props.onClose}>×</button>
    </div>
    )

}

export default WindowHeader;