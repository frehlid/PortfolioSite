import React, { useRef, useEffect } from 'react';
import Application from "./Application";
import MenuBar from './MenuBar';
import { HighlightProvider } from './HighlightContext';
import { ZIndexProvider } from './ZIndexContext'; 
import { GlobalCanvas, SmoothScrollbar } from '@14islands/r3f-scroll-rig'
import '@14islands/r3f-scroll-rig/css'
import CRTScreenEffect from './CRTScreenEffect';
function Screen() {
    return (
        <>
            <div className="bezel-container">
                <CRTScreenEffect />
                <ZIndexProvider>
                    <MenuBar />
                    <HighlightProvider>
                        <Application
                            title="Education"
                            initialPosition={{ x: 50, y: 50 }}
                            sections={[
                                { type: 'text', content: 'Bachelor of Science in Computer Science (3.9 GPA), University of British Columbia, Sep 2020 - Present' },
                            ]}
                        />
                        <Application
                            title="Work Experience"
                            initialPosition={{ x: 150, y: 50 }}
                            sections={[
                                { type: 'text', content: 'Researcher, UBC X-Lab, Apr 2024 – Present' },
                                { type: 'text', content: 'Teaching Assistant, UBC CPSC 317, Apr 2024 – Jun 2024' },
                                { type: 'text', content: 'Unity Developer Intern, VictoryXR, Jun 2023 – Jan 2024' },
                                { type: 'text', content: 'Debate Instructor, Fostering Debate Talent (FDT), Sep 2022 – Apr 2023' },
                                { type: 'text', content: 'Food Service Associate, Pita Pit, Oct 2021 – Dec 2021' },
                                { type: 'text', content: 'Shopify + Advertisement Manager, Lilo Paris, May 2020 – May 2021' },
                            ]}
                        />
                        <Application
                            title="Research"
                            initialPosition={{ x: 250, y: 50 }}
                            sections={[
                                { type: 'text', content: 'Co-Author - MultiSphere: Latency Optimized Multi-User 360° VR Telepresence with Viewport Adaptive IPv6 Multicast' },
                            ]}
                        />
                        <Application
                            title="Projects"
                            initialPosition={{ x: 350, y: 50 }}
                            sections={[
                                { type: 'text', content: 'AutoGit - AI, Python, Flask, Pytorch, Bash Scripting (Mar 2024)' },
                                { type: 'text', content: 'Chore Organizer - Javascript, Python, React, Flask, HTML/CSS (Mar 2024)' },
                                { type: 'text', content: 'VR Graphing and Plotting - C#, Unity, VR, OOP (Jun 2023 – Jan 2024)' },
                                { type: 'text', content: 'WeatherNLP - Prolog, AI (Apr 2023)' },
                                { type: 'text', content: 'BIOT Instrumentation Co Lead - C/C++, Javascript (Express + React), Espressif ESP32, Node.js (Feb 2022 – Jun 2023)' },
                            ]}
                        />
                        <Application
                            title="Achievements"
                            initialPosition={{ x: 450, y: 50 }}
                            sections={[
                                { type: 'text', content: 'National Honors Society (NHS) - President (Singapore, 2020)' },
                                { type: 'text', content: 'National Debate - Canadian Junior National Debate Top Speaker (Canada, 2017 - 2018)' },
                            ]}
                        />
                        <Application
                            title="Technical Skills"
                            initialPosition={{ x: 550, y: 50 }}
                            sections={[
                                { type: 'text', content: 'Programming: Java, C, C++, C#, Python, Javascript/Typescript (React, Express, Mocha+Chai), R (tidyverse), HTML/CSS' },
                                { type: 'text', content: 'Technologies: RESTful APIs, Linux, Shell (Bash/Zsh), Git, Cloudflare, Docker, Adobe suite, LaTeX, Unity, npm' },
                            ]}
                        />
                    </HighlightProvider>
                </ZIndexProvider>
            </div>
        </>
    );
}

export default Screen;

