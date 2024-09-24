import React from 'react';

function ImageWindow({ src, alt }) {
    return (
        <div className="image-window">
            <img src={src} alt={alt} style={{ width: '100%', height: 'auto' }} />
        </div>
    );
}

export default ImageWindow;
