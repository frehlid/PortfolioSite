import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import Window from './Window';
import WindowHeader from './WindowHeader';
import { useZIndex } from './ZIndexContext';

function Application(props) {
    const [expanded, setExpanded] = useState(false);
    const [highlighted, setHighlighted] = useState(false);
    const [position, setPosition] = useState({x: 0, y: 23});
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [clickTimeout, setClickTimeout] = useState(null);
    const { getNextZIndex } = useZIndex();
    const [zIndex, setZIndex] = useState(1);


    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.application-container')) {
                setHighlighted(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const startDragging = (e) => {
        setIsDragging(true);
        setOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const stopDragging = (e) => {
        setIsDragging(false);
    };

    const onDrag = (e) => {

        if (isDragging) { 
            bringToFront();
            const x = e.clientX - offset.x;
            let y = e.clientY - offset.y;
            if (y <= 22) y = 23;
            setPosition({
                x: x,
                y: y,
            });
        }
    };

    const bringToFront = () => {
        // Increase zIndex using the context function
        const newZIndex = getNextZIndex();
        setZIndex(newZIndex);
    };

    const onClick = (e) => {
        bringToFront();
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            setClickTimeout(null);
            setExpanded(true);
            setHighlighted(false);
        } else {
            setClickTimeout(setTimeout(() => {
                setClickTimeout(null);
                setHighlighted(true);
            }, 500));
        }
    };
    const onClose = (e) => {
        setExpanded(false);
        setHighlighted(false);
    };

    return (
        <div
            className="application-container"
            style={{
                textAlign: 'center',
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: zIndex,
                cursor: isDragging ? 'grabbing' : 'grab',
            }}
        >
            {!expanded && (
                <div
                    onMouseDown={startDragging}
                    onMouseMove={onDrag}
                    onMouseUp={stopDragging}
                    onMouseLeave={stopDragging}
                    onClick={onClick}
                    style={
                        highlighted
                            ? { backgroundColor: 'rgba(10,10,10,0.1)', borderRadius: 5 }
                            : { backgroundColor: 'rgba(0,0,0,0)' }
                    }
                >
                    <Icon text={props.title} />
                </div>
            )}
            {expanded && (
                <div className="window">
                    <div
                        onMouseDown={startDragging}
                        onMouseMove={onDrag}
                        onMouseUp={stopDragging}
                        onMouseLeave={stopDragging}
                        onClick={onClick}
                    >
                        <WindowHeader title={props.title} onClose={onClose} />
                    </div>
                    <Window content={props.content} />
                </div>
            )}
        </div>
    );
}

export default Application;
