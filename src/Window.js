import react from 'react';
import TextWindow from './TextWindow';

function Window(props) {

    return(
        <div className="window">
            <div className="window-content">
                <TextWindow text={props.content} />
            </div>
        </div>
    )
}

export default Window;