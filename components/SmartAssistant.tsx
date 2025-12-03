import React, { useState, useRef } from 'react';
import { Send, Globe, Mic, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { searchWithGrounding, transcribeAudio } from '../services/gemini';
import { GroundingMetadata } from '../types';

interface Message {
  id: number;
  role: 'user' | 'model';
  text: string;
  grounding?: GroundingMetadata;
  error?: boolean;
}

const SmartAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'model', text: 'Hello! I can help you find information on the web or transcribe audio. What do you need?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { text, groundingMetadata } = await searchWithGrounding(userMsg.text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'model',
        text,
        grounding: groundingMetadata
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'model',
        text: "I'm sorry, I encountered an error searching for that.",
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsLoading(true);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Default browser mime
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
             const base64Audio = (reader.result as string).split(',')[1];
             // Add a temporary "Transcribing..." message
             const tempId = Date.now();
             setMessages(prev => [...prev, { id: tempId, role: 'user', text: '🎤 Transcribing audio...' }]);
             
             try {
                // Use default mime type logic, usually webm/ogg in browsers
                const mimeType = blob.type || 'audio/webm';
                const text = await transcribeAudio(base64Audio, mimeType);
                
                // Replace temp message with actual text
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: `🎤 "${text}"` } : m));
                
                // Auto-reply
                const reply = await searchWithGrounding(text); // Treat transcription as query
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'model',
                    text: reply.text,
                    grounding: reply.groundingMetadata
                }]);
             } catch (err) {
                 console.error(err);
                 setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: "Audio transcription failed.", error: true } : m));
             } finally {
                 setIsLoading(false);
             }
        };
        reader.readAsDataURL(blob);
        
        // Stop tracks
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : msg.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                        
                        {/* Grounding Sources */}
                        {msg.grounding?.groundingChunks && msg.grounding.groundingChunks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
                                    <Globe className="w-3 h-3 mr-1" /> Sources
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {msg.grounding.groundingChunks.map((chunk, idx) => {
                                        if (chunk.web?.uri) {
                                            return (
                                                <a 
                                                    key={idx} 
                                                    href={chunk.web.uri} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 truncate max-w-full"
                                                >
                                                    {chunk.web.title || chunk.web.uri}
                                                </a>
                                            )
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span className="text-sm text-slate-500">Thinking...</span>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask anything or transcribe audio..."
                    className="w-full pl-4 pr-24 py-3 bg-slate-50 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <div className="absolute right-2 flex items-center space-x-1">
                    <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-200 text-slate-500'}`}
                        title={isRecording ? "Stop Recording" : "Record Audio to Transcribe"}
                    >
                        {isRecording ? <X className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="mt-2 text-center">
                <p className="text-xs text-slate-400 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 mr-1 text-amber-400" />
                    Answers grounded with Google Search
                </p>
            </div>
        </div>
    </div>
  );
};

export default SmartAssistant;
