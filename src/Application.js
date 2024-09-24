import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import Window from './Window';
import WindowHeader from './WindowHeader';
import { useZIndex } from './ZIndexContext';
import { useHighlight } from './HighlightContext';

function Application(props) {
    const { initialPosition = { x: 0, y: 23 }, sections = [] } = props; // Accept 'sections' as a prop
    const [expanded, setExpanded] = useState(false);
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 300, height: 200 });
    const [clickTimeout, setClickTimeout] = useState(null);
    const { getNextZIndex } = useZIndex();
    const [zIndex, setZIndex] = useState(1);

    const { highlightedApp, setHighlightedApp } = useHighlight(); // Get highlight context
    const isHighlighted = highlightedApp === props.title; // Check if this app is highlighted

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.application-container')) {
                setHighlightedApp(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [setHighlightedApp]);

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
        const newZIndex = getNextZIndex();
        setZIndex(newZIndex);
    };

    const onClick = (e) => {
        bringToFront();
        setHighlightedApp(props.title); // Set this app as the highlighted one
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            setClickTimeout(null);
            setExpanded(true);  // Expand window on double-click
        } else {
            setClickTimeout(setTimeout(() => {
                setClickTimeout(null);
                //setExpanded(false);  // Single click will only set the highlight
            }, 500));
        }
    };

    const onClose = (e) => {
        setExpanded(false);
        setHighlightedApp(null);  // Clear highlight on close
    };

const startResizing = (e, direction) => {
    setIsResizing(true);
    setOffset({
        x: e.clientX,
        y: e.clientY,
        direction: direction,
    });
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResizing);
};

const stopResizing = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResizing);
};

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
                        isHighlighted
                            ? { backgroundColor: 'rgba(10,10,10,0.1)', borderRadius: 5 }
                            : { backgroundColor: 'rgba(0,0,0,0)' }
                    }
                >
                    <Icon text={props.title} />
                </div>
            )}
            {expanded && (
                <>
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
                        <Window sections={sections} />
                        {/* Resize handles */}
                        <div
                            onMouseDown={(e) => startResizing(e, 'right')}
                            onMouseUp={stopResizing}
                            style={{ position: 'absolute', right: '-15px', top: 0, width: '30px', height: '100%', cursor: 'ew-resize' }}
                        />
                        <div
                            onMouseDown={(e) => startResizing(e, 'bottom')}
                            onMouseUp={stopResizing}
                            style={{ position: 'absolute', bottom: "-8px", left: '8px', width: '100%', height: '30px', cursor: 'ns-resize' }}
                        />
                        <div
                            onMouseDown={(e) => startResizing(e, 'bottom-right')}
                            onMouseUp={stopResizing}
                            style={{ position: 'absolute', right: '-15px', bottom: 0, width: '100%', height: '30px', cursor: 'nwse-resize' }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}


export default Application;
