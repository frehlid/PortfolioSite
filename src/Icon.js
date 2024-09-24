import React, {useState} from 'react';
import fileIcon from './icon4.png';

function Icon(props) {

    return (
        <div>
            <img src={fileIcon} style={{ width: '50px', maxWidth: '100px', userSelect:"none" }} alt="file icon" draggable="false"/>
            <p style={{ width:'100px', textOverflow: 'clip' ,marginTop:0, alignContent:'center', textAlign:'center' ,userSelect:"none", fontFamily:"ChicagoFLF"}}>{props.text}</p>
        </div>
    );
}
export default Icon;