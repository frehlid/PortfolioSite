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
    const [isResizing, setIsResizing] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({width:300, height:200});
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
        setIsResizing(false);
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
    const startResizing = (e, direction) => {
        setIsResizing(true);
        setOffset({
            x: e.clientX,
            y: e.clientY,
            direction: direction,
        });
    };
    const stopResizing = (e, direction) => {
                setIsResizing(false);
    }
        const onResize = (e) => {
        if (isResizing) {
            const { direction } = offset;
            const deltaX = e.clientX - offset.x;
            const deltaY = e.clientY - offset.y;
            let newWidth = size.width;
            let newHeight = size.height;

            if (direction.includes('right')) {
                newWidth += deltaX;
            }
            if (direction.includes('bottom')) {
                newHeight += deltaY;
            }

            if (newWidth > 100 && newHeight > 100) {
                setSize({
                    width: newWidth,
                    height: newHeight,
                });
                setOffset({
                    ...offset,
                    x: e.clientX,
                    y: e.clientY,
                });
            }
        }
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
                        {expanded && (<>
                
                    <div
                        onMouseDown={startDragging}
                        onMouseMove={onDrag}
                        onMouseUp={stopDragging}
                        onMouseLeave={stopDragging}
                        onClick={onClick}
                    >
                        <WindowHeader title={props.title} onClose={onClose} />
                    </div>
                    <div
                    className="window"
                    style={{
                        width: `${size.width}px`,
                        height: `${size.height}px`,
                        position: 'relative',
                    }}
                    onMouseMove={onResize}
                    onMouseUp={stopDragging}
                    onMouseLeave={stopDragging}
                    onClick={bringToFront}
                >
                    <Window content={props.content} />
                    {/* Resize handles */}
                    <div
                        onMouseDown={(e) => startResizing(e, 'right')}
                        onMouseUp={(e) => stopResizing(e, 'right')}
                        
                        style={{ position: 'absolute', right: '-15px', top: 0, width: '30px', height: '100%', cursor: 'ew-resize' }}
                    />
                    <div
                        onMouseDown={(e) => startResizing(e, 'bottom')}
                        onMouseUp={(e) => stopResizing(e, 'bottom')}


                        style={{ position: 'absolute', bottom: "-8px", left: '8px', width: '100%', height: '30px', cursor: 'ns-resize' }}
                    />
                    <div
                        onMouseDown={(e) => startResizing(e, 'bottom-right')}
                        onMouseUp={(e) => stopResizing(e, 'bottom-right')}



                        style={{ position: 'absolute', right: '-15px', bottom: 0, width: '100%', height: '30px', cursor: 'nwse-resize' }}
                    />
                </div>
            </>)}
        </div>
    );
}

export default Application;
