import React from 'react';

function ImageTextWindow({ src, text }) {
    return (
        <div className="image-text-window">
            <img src={src} alt={text} style={{ width: '100%', height: 'auto' }} />
            <p>{text}</p>
        </div>
    );
}

export default ImageTextWindow;
