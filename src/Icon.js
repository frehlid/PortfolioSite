import React, {useState} from 'react';
import fileIcon from './icon4.png';

function Icon(props) {

    return (
        <div>
            <img src={fileIcon} style={{ width: '45%', maxWidth: '100px', userSelect:"none" }} alt="file icon" draggable="false"/>
            <p style={{ marginTop: '0', userSelect:"none", fontFamily:"ChicagoFLF"}}>{props.text}</p>
        </div>
    );
}
export default Icon;