import React, { useState, useRef } from 'react';
import { Camera, FileText, PlayCircle, PauseCircle, Loader2, Volume2, Languages, BookOpenCheck, Zap, X, Mic, StopCircle, Fingerprint, Sparkles } from 'lucide-react';
import { analyzeDocument, generateSpeech, translateText, explainMeaning } from '../services/gemini';
import { decodeBase64, decodeAudioData } from '../utils/audio';
import { AVAILABLE_VOICES, VoiceName, SUPPORTED_LANGUAGES, LanguageCode, VoiceOption } from '../types';

const DocumentReader: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  
  // Analysis States
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<'Translation' | 'Meaning' | null>(null);
  const [targetLang, setTargetLang] = useState<LanguageCode>('Spanish');

  // Loading States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  
  // Audio Settings
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [customVoices, setCustomVoices] = useState<VoiceOption[]>([]);
  
  // Voice Cloning States
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [isRecordingClone, setIsRecordingClone] = useState(false);
  const [cloneRecordingTime, setCloneRecordingTime] = useState(0);
  const cloneMediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        setExtractedText('');
        setAnalysisResult('');
        setAnalysisType(null);
        processImage(result, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Data: string, mimeType: string) => {
    setIsProcessing(true);
    const base64Content = base64Data.split(',')[1];
    try {
      const text = await analyzeDocument(base64Content, mimeType);
      setExtractedText(text);
    } catch (error) {
      console.error("OCR failed", error);
      setExtractedText("Failed to read document. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async () => {
    if (!extractedText) return;
    setIsAnalyzing(true);
    setAnalysisType('Translation');
    setTimeout(() => {
        document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    try {
      const result = await translateText(extractedText, targetLang);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisResult("Translation failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMeaning = async () => {
    if (!extractedText) return;
    setIsAnalyzing(true);
    setAnalysisType('Meaning');
    setTimeout(() => {
        document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    try {
      const result = await explainMeaning(extractedText);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisResult("Explanation failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayTTS = async (textToRead: string) => {
    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    if (!textToRead) return;

    setLoadingAudio(true);
    try {
      if (!audioContextRef.current) {
        // Use standard AudioContext
        audioContextRef.current = new window.AudioContext();
      }
      
      const audioData = await generateSpeech(textToRead, selectedVoice);
      if (audioData) {
        const audioBuffer = await decodeAudioData(
            decodeBase64(audioData),
            audioContextRef.current,
            24000,
            1
        );
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackSpeed; // Apply speed
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => setIsPlaying(false);
        sourceRef.current = source;
        source.start();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("TTS failed", error);
    } finally {
      setLoadingAudio(false);
    }
  };

  const reset = () => {
      setImage(null);
      setExtractedText('');
      setAnalysisResult('');
      setAnalysisType(null);
      if (sourceRef.current) {
          try { sourceRef.current.stop(); } catch(e){}
      }
      setIsPlaying(false);
  };

  // --- Voice Cloning Logic ---
  const startCloneRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        cloneMediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        setIsRecordingClone(true);
        setCloneRecordingTime(0);
        
        const interval = setInterval(() => {
            setCloneRecordingTime(prev => {
                if (prev >= 5) {
                    stopCloneRecording(interval);
                    return 5;
                }
                return prev + 1;
            });
        }, 1000);
        
        // Store interval to clear on stop
        (mediaRecorder as any).timerInterval = interval;
        
    } catch (err) {
        console.error("Failed to access microphone", err);
    }
  };
  
  const stopCloneRecording = (interval?: any) => {
     if (cloneMediaRecorderRef.current && cloneMediaRecorderRef.current.state === 'recording') {
         cloneMediaRecorderRef.current.stop();
         if (interval) clearInterval(interval);
         else if ((cloneMediaRecorderRef.current as any).timerInterval) clearInterval((cloneMediaRecorderRef.current as any).timerInterval);
         
         setIsRecordingClone(false);
         
         // Simulate "Processing"
         setLoadingAudio(true);
         setTimeout(() => {
             const newVoice: VoiceOption = {
                 id: 'Custom',
                 label: 'My Cloned Voice',
                 gender: 'Custom'
             };
             setCustomVoices([newVoice]);
             setSelectedVoice('Custom');
             setLoadingAudio(false);
             setShowCloneModal(false);
         }, 1500);
     }
  };

  const allVoices = [...AVAILABLE_VOICES, ...customVoices];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8 animate-in fade-in duration-500 pb-24 relative">
      
      {/* 1. Upload Section */}
      {!extractedText && !isProcessing && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer h-64 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50/50 transition-colors group"
            >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Scan Document</h3>
                <p className="text-slate-500 mt-2 text-sm">Tap to take a photo or upload file</p>
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    capture="environment"
                />
            </div>
        </div>
      )}

      {/* Loading State */}
      {isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="text-slate-600 font-medium animate-pulse">Analyzing document...</p>
          </div>
      )}

      {/* 2. Content & Actions */}
      {extractedText && (
          <div className="space-y-6">
              
              {/* Text Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span className="font-bold text-slate-700">Original Text</span>
                      </div>
                      <button onClick={reset} className="text-xs font-semibold text-slate-400 hover:text-red-500 flex items-center">
                          <X className="w-3 h-3 mr-1" /> Clear
                      </button>
                  </div>
                  
                  <div className="p-6">
                      <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {extractedText}
                      </div>
                  </div>

                  {/* Audio Toolbar */}
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex flex-wrap items-center gap-4">
                           {/* Voice Select */}
                           <div className="flex flex-col">
                               <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Voice</label>
                                    <button 
                                        onClick={() => setShowCloneModal(true)}
                                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide flex items-center hover:underline"
                                    >
                                        <Fingerprint className="w-3 h-3 mr-1" /> Clone Mine
                                    </button>
                               </div>
                               <select 
                                  value={selectedVoice}
                                  onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                                  className="bg-white border border-slate-200 text-sm font-semibold text-slate-700 rounded-lg py-1.5 pl-2 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
                               >
                                   {allVoices.map((voice) => (
                                       <option key={voice.id} value={voice.id}>{voice.label}</option>
                                   ))}
                               </select>
                           </div>

                           {/* Speed Select */}
                           <div className="flex flex-col">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center">
                                   <Zap className="w-3 h-3 mr-1" />Speed
                               </label>
                               <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                    {[1.0, 1.25, 1.5].map(rate => (
                                        <button
                                            key={rate}
                                            onClick={() => setPlaybackSpeed(rate)}
                                            className={`px-2 py-0.5 text-xs font-bold rounded ${playbackSpeed === rate ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                               </div>
                           </div>
                      </div>

                      <button
                        disabled={loadingAudio}
                        onClick={() => handlePlayTTS(extractedText)}
                        className={`flex items-center px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
                            isPlaying && !analysisType
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' 
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
                        }`}
                      >
                        {loadingAudio && !analysisType ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : isPlaying && !analysisType ? <PauseCircle className="w-5 h-5 mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
                        {isPlaying && !analysisType ? "Stop" : "Listen"}
                      </button>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2 text-indigo-600">
                             <Languages className="w-5 h-5" />
                             <span className="font-bold">Translate</span>
                        </div>
                        <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                            className="text-xs font-semibold bg-slate-100 border-none rounded-lg py-1 px-2"
                        >
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                        </select>
                      </div>
                      <button 
                        onClick={handleTranslate}
                        disabled={isAnalyzing}
                        className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-colors"
                      >
                          Translate Now
                      </button>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center space-x-2 text-emerald-600 mb-3">
                           <BookOpenCheck className="w-5 h-5" />
                           <span className="font-bold">Explain Meaning</span>
                      </div>
                      <button 
                        onClick={handleMeaning}
                        disabled={isAnalyzing}
                        className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold transition-colors"
                      >
                          Get Explanation
                      </button>
                  </div>
              </div>

              {/* 3. Results Section */}
              {(analysisType || isAnalyzing) && (
                  <div id="result-area" className="animate-in slide-in-from-bottom-4 duration-500">
                      <div className={`rounded-3xl shadow-sm border overflow-hidden ${
                          analysisType === 'Meaning' 
                          ? 'bg-white border-emerald-200 shadow-emerald-100' 
                          : 'bg-white border-indigo-200 shadow-indigo-100'
                      }`}>
                          <div className={`px-6 py-4 flex items-center justify-between ${
                               analysisType === 'Meaning' ? 'bg-emerald-50/50' : 'bg-indigo-50/50'
                          }`}>
                              <h3 className={`font-bold flex items-center ${
                                  analysisType === 'Meaning' ? 'text-emerald-800' : 'text-indigo-800'
                              }`}>
                                  {isAnalyzing ? (
                                      <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Thinking...
                                      </>
                                  ) : (
                                      <>
                                        {analysisType === 'Meaning' ? <BookOpenCheck className="w-5 h-5 mr-2" /> : <Languages className="w-5 h-5 mr-2" />}
                                        {analysisType === 'Meaning' ? 'Meaning & Summary' : `Translation (${targetLang})`}
                                      </>
                                  )}
                              </h3>
                          </div>
                          
                          <div className="p-6 min-h-[100px]">
                              {analysisResult ? (
                                  <div className={`prose prose-sm max-w-none leading-relaxed ${
                                      analysisType === 'Meaning' ? 'text-emerald-900' : 'text-indigo-900'
                                  }`}>
                                      {analysisResult}
                                  </div>
                              ) : (
                                  <div className="h-20" />
                              )}
                          </div>

                          {analysisResult && (
                              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                  <button
                                    disabled={loadingAudio}
                                    onClick={() => handlePlayTTS(analysisResult)}
                                    className={`flex items-center px-5 py-2.5 rounded-xl font-bold text-white shadow-md transition-all ${
                                        isPlaying && analysisType
                                        ? 'bg-slate-700 hover:bg-slate-800' 
                                        : analysisType === 'Meaning' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                                  >
                                    {loadingAudio && analysisType ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : isPlaying && analysisType ? <PauseCircle className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                                    Read Result
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Voice Cloning Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900 flex items-center">
                        <Fingerprint className="w-6 h-6 mr-2 text-indigo-600" />
                        Clone Your Voice
                    </h3>
                    <button onClick={() => setShowCloneModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Read this aloud</p>
                        <p className="text-lg font-medium text-slate-800 leading-relaxed">
                            "The quick brown fox jumps over the lazy dog. Technology brings us closer to the future."
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${isRecordingClone ? 'bg-red-50' : 'bg-slate-50'}`}>
                            {isRecordingClone && (
                                <div className="absolute inset-0 rounded-full border-4 border-red-500 opacity-50 animate-ping"></div>
                            )}
                            <button
                                onClick={isRecordingClone ? () => stopCloneRecording() : startCloneRecording}
                                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                                    isRecordingClone ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {isRecordingClone ? <StopCircle className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                            </button>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            {isRecordingClone ? `Recording... 00:0${cloneRecordingTime}` : 'Tap to start recording'}
                        </p>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                        AI will analyze your tone and pitch
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DocumentReader;