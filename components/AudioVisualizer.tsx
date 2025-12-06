import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  stream?: MediaStream;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isActive || !stream || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    contextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 64; // Small size for chunky bars
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Gradient color
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#3b82f6'); // Blue 500
        gradient.addColorStop(1, '#60a5fa'); // Blue 400

        ctx.fillStyle = gradient;
        
        // Rounded top bars
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
           ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 5);
        } else {
           // Fallback for older browsers/types
           ctx.rect(x, canvas.height - barHeight, barWidth, barHeight);
        }
        ctx.fill();

        x += barWidth + 2;
      }
    };

    renderFrame();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (contextRef.current && contextRef.current.state !== 'closed') {
         contextRef.current.close();
      }
    };
  }, [isActive, stream]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={80} 
      className="w-full max-w-[300px] h-[80px]"
    />
  );
};

export default AudioVisualizer;