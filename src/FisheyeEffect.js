import React, { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';


const FisheyeEffect = ({ children }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const renderFisheye = () => {
      // Capture the entire webpage as an image
      html2canvas(document.body).then((screenshot) => {
        // Clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the fisheye effect
        const image = screenshot;
        const { width, height } = canvas;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const nx = (x / width) * 2 - 1;
            const ny = (y / height) * 2 - 1;
            const r = Math.sqrt(nx * nx + ny * ny);
            const theta = Math.atan2(ny, nx);

            // Apply fisheye distortion
            const nr = Math.pow(r, 2.5);
            const nx2 = nr * Math.cos(theta);
            const ny2 = nr * Math.sin(theta);

            const srcX = ((nx2 + 1) / 2) * width;
            const srcY = ((ny2 + 1) / 2) * height;

            const pixel = context.getImageData(srcX, srcY, 1, 1);
            context.putImageData(pixel, x, y);
          }
        }
      });
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    renderFisheye();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 10 }}></canvas>
      <div style={{ position: 'relative', zIndex: 100 }}>
        {children}
      </div>
    </div>
  );
};

export default FisheyeEffect;
