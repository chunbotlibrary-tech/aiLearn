import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ProficiencyLevel, Topic } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import AudioVisualizer from './AudioVisualizer';

interface LiveSessionProps {
  level: ProficiencyLevel;
  topic: Topic;
  onEndSession: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ level, topic, onEndSession }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const cleanUpRef = useRef<(() => void) | null>(null);

  const getSystemInstruction = () => {
    let instruction = `You are an expert English tutor helping a Khmer speaker practice English. 
    The user's proficiency level is: ${level}. 
    The current topic is: ${topic.title} (${topic.description}).
    `;

    if (level === ProficiencyLevel.BEGINNER) {
      instruction += " Speak slowly and clearly. Use simple vocabulary. Correct basic grammar mistakes gently. If the user struggles, explain in simple terms.";
    } else if (level === ProficiencyLevel.INTERMEDIATE) {
      instruction += " Speak at a natural but clear pace. Introduce some idioms. Focus on correcting sentence structure and pronunciation.";
    } else {
      instruction += " Speak at a native speed. Use advanced vocabulary and nuances. Challenge the user with complex questions. Be strict about pronunciation and grammar.";
    }

    instruction += " Always be encouraging and friendly. Keep your responses concise to encourage dialogue.";
    return instruction;
  };

  const stopAudioPlayback = useCallback(() => {
    sourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if source already stopped
      }
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    try {
      setError(null);
      
      // 1. Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      // 3. Initialize Gemini
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found");
      const ai = new GoogleGenAI({ apiKey });

      // 4. Connect Live Session
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Session Opened");
            setIsConnected(true);
            
            // Start processing mic input
            const ctx = inputAudioContextRef.current;
            if (!ctx) return;
            
            const source = ctx.createMediaStreamSource(stream);
            // Using ScriptProcessor as per Gemini docs (simplest way to get PCM data for streaming)
            const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
               if (!isMicOn) return; // Mute logic
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createPcmBlob(inputData);
               
               if (sessionPromiseRef.current) {
                 sessionPromiseRef.current.then(session => {
                   session.sendRealtimeInput({ media: pcmBlob });
                 });
               }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(ctx.destination);
            
            // Store cleanup for mic processing
            cleanUpRef.current = () => {
              source.disconnect();
              scriptProcessor.disconnect();
              stream.getTracks().forEach(track => track.stop());
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            const outCtx = outputAudioContextRef.current;
            if (!outCtx) return;

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               try {
                 const audioData = base64ToUint8Array(base64Audio);
                 // Sync timing
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                 
                 const audioBuffer = await decodeAudioData(audioData, outCtx, 24000, 1);
                 const source = outCtx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outCtx.destination);
                 
                 source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                 });
                 
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 sourcesRef.current.add(source);

               } catch (err) {
                 console.error("Audio decoding error", err);
               }
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log("Interrupted");
              stopAudioPlayback();
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setError("Connection error. Please try again.");
            setIsConnected(false);
          }
        }
      });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start session");
    }
  };

  const endSession = async () => {
    // 1. Close session connection
    if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
    }
    
    // 2. Cleanup Audio
    stopAudioPlayback();
    if (cleanUpRef.current) cleanUpRef.current();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    if (micStream) micStream.getTracks().forEach(t => t.stop());

    onEndSession();
  };

  useEffect(() => {
    // Start session on mount
    startSession();

    // Cleanup on unmount
    return () => {
      // We can't use async in cleanup directly, but we trigger the logic
      stopAudioPlayback();
      if (cleanUpRef.current) cleanUpRef.current();
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      // Contexts are closed via refs in endSession usually, but safety check:
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const toggleMic = () => {
    setIsMicOn(prev => !prev);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{topic.title}</h2>
        <p className="text-slate-500 font-battambang">{topic.khmerTitle}</p>
        <div className="mt-4 inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
          Level: {level}
        </div>
      </div>

      {/* Visualizer / Avatar Area */}
      <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
        {/* Pulsing rings when connected */}
        {isConnected && (
          <>
            <div className="absolute w-full h-full bg-blue-100 rounded-full animate-ping opacity-20"></div>
            <div className="absolute w-[90%] h-[90%] bg-blue-200 rounded-full animate-pulse opacity-30"></div>
          </>
        )}
        
        <div className="relative z-10 bg-white p-6 rounded-full shadow-xl w-48 h-48 flex items-center justify-center border-4 border-blue-50">
           <div className="text-6xl">{topic.emoji}</div>
        </div>
      </div>

      {/* Status */}
      <div className="mb-8 h-12 flex items-center justify-center">
        {!isConnected && !error && (
            <div className="flex items-center space-x-2 text-slate-500">
               <i className="fas fa-spinner fa-spin"></i>
               <span>Connecting to tutor...</span>
            </div>
        )}
        {error && (
            <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
            </div>
        )}
        {isConnected && (
            <div className="flex flex-col items-center space-y-2">
                 <p className="text-green-600 font-medium">Tutor is listening</p>
                 <AudioVisualizer isActive={isMicOn} stream={micStream || undefined} />
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button 
          onClick={toggleMic}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-xl transition-all shadow-lg ${
             isMicOn ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200' : 'bg-red-50 text-red-500 border border-red-200'
          }`}
          disabled={!isConnected}
          title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          <i className={`fas ${isMicOn ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
        </button>

        <button 
          onClick={endSession}
          className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2"
        >
          <i className="fas fa-phone-slash"></i>
          <span>End Session</span>
        </button>
      </div>

      <p className="mt-8 text-slate-400 text-sm font-battambang">
        Start speaking to begin the conversation.
      </p>
    </div>
  );
};

export default LiveSession;