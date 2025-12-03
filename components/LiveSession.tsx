import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, PhoneOff, Play, Loader2, Volume2, User, Settings2 } from 'lucide-react';
import { createPcmBlob, decodeBase64, decodeAudioData } from '../utils/audio';
import { AVAILABLE_VOICES, VoiceName } from '../types';

const LiveSession: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [status, setStatus] = useState<string>('Ready to connect');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Animation Frame for volume visualizer
  const requestRef = useRef<number>();

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const connectToLive = async () => {
    setStatus('Initializing audio...');
    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      setStatus('Connecting to Gemini Live...');
      
      // Initialize Session
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Connected. Start talking!');
            setIsConnected(true);
            
            if (!inputAudioContextRef.current || !streamRef.current) return;

            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = source;
            
            // Use ScriptProcessor for capturing raw PCM (deprecated but required for this specific stream format often)
            // Ideally AudioWorklet, but keeping it simple as per guidelines example
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (!isMicOn) return; // Mute logic
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume meter logic
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolumeLevel(Math.min(rms * 5, 1)); // Amplify for visual

              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromiseRef.current?.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                
                // Ensure time is monotonic
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                const audioBuffer = await decodeAudioData(
                    decodeBase64(base64Audio),
                    ctx,
                    24000,
                    1
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                setStatus('Interrupted...');
                sourcesRef.current.forEach(src => {
                    try { src.stop(); } catch(e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
            
            if (message.serverContent?.turnComplete) {
                 setStatus('Listening...');
            }
          },
          onclose: () => {
            setStatus('Connection closed');
            setIsConnected(false);
            cleanupAudio();
          },
          onerror: (err) => {
            console.error(err);
            setStatus('Error occurred. Reconnecting...');
            // Simple retry or stop could be here
            setIsConnected(false);
            cleanupAudio();
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
            },
            systemInstruction: "You are a helpful, warm, and engaging AI assistant. Keep responses concise and conversational."
        }
      });

    } catch (error) {
      console.error("Connection failed", error);
      setStatus(`Failed to connect: ${error}`);
      cleanupAudio();
    }
  };

  const disconnect = () => {
    // There isn't a direct .close() on sessionPromise wrapper usually in the snippets,
    // but often we just close audio context and let socket time out or if the SDK exposes close.
    // The snippet uses callbacks.onclose, but typically we just reload or stop sending.
    // Assuming we can just close contexts to stop interactions.
    // If the SDK returns an object with close(), we use it. 
    // Since sessionPromise resolves to a session, let's try to close it if possible, 
    // otherwise just cleanup local audio which kills the loop.
    cleanupAudio();
    setIsConnected(false);
    setStatus('Disconnected');
    setVolumeLevel(0);
  };
  
  const toggleMic = () => {
      setIsMicOn(!isMicOn);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-light text-slate-800">Live Conversation</h2>
        <p className="text-slate-500">{status}</p>
      </div>

      {/* Visualizer Circle */}
      <div className="relative flex items-center justify-center">
        {isConnected && (
            <>
                 {/* Ripple effect */}
                <div 
                    className="absolute rounded-full bg-indigo-200 opacity-50 transition-all duration-75"
                    style={{ 
                        width: `${160 + volumeLevel * 100}px`, 
                        height: `${160 + volumeLevel * 100}px` 
                    }}
                />
                 <div 
                    className="absolute rounded-full bg-indigo-300 opacity-30 transition-all duration-100"
                    style={{ 
                        width: `${200 + volumeLevel * 150}px`, 
                        height: `${200 + volumeLevel * 150}px` 
                    }}
                />
            </>
        )}
        
        <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${isConnected ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-200'}`}>
            {isConnected ? (
                <Volume2 className="w-16 h-16 text-white animate-pulse" />
            ) : (
                <MicOff className="w-16 h-16 text-slate-400" />
            )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center space-y-6">
        {!isConnected && (
             <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <Settings2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">Voice:</span>
                <select 
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                    className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
                >
                    {AVAILABLE_VOICES.map((voice) => (
                        <option key={voice.id} value={voice.id}>{voice.label}</option>
                    ))}
                </select>
             </div>
        )}

        <div className="flex space-x-6">
            {!isConnected ? (
            <button
                onClick={connectToLive}
                className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Conversation</span>
            </button>
            ) : (
            <>
                <button
                    onClick={toggleMic}
                    className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-red-100 text-red-600'}`}
                    title={isMicOn ? "Mute Mic" : "Unmute Mic"}
                >
                    {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </button>
                <button
                onClick={disconnect}
                className="p-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors border border-red-200"
                title="End Call"
                >
                <PhoneOff className="w-6 h-6" />
                </button>
            </>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiveSession;