import React from 'react';
import TextWindow from './TextWindow';
import ImageWindow from './ImageWindow';
import ImageTextWindow from './ImageTextWindow';

function Window(props) {
    const { sections } = props; // Sections will now be an array of objects

    return (
        <div className="window">
            <div className="window-content">
                {sections.map((section, index) => {
                    switch (section.type) {
                        case 'text':
                            return <TextWindow key={index} text={section.content} />;
                        case 'image':
                            return <ImageWindow key={index} src={section.content} alt={section.alt || 'Image'} />;
                        case 'imageWithText':
                            return <ImageTextWindow key={index} src={section.content.image} text={section.content.text} />;
                        default:
                            return <div key={index}>No content available</div>;
                    }
                })}
            </div>
        </div>
    );
}

export default Window;
