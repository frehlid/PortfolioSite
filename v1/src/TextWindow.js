import React from 'react';

function TextWindow(props) {
    return (
        <div>
           <p className='window-text'>{props.text}</p> 
        </div>
    )
}

export default TextWindow