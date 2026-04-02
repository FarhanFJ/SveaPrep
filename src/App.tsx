/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ShieldCheck, 
  LayoutDashboard, 
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
  Edit3,
  Trash2,
  Check,
  Download,
  Target,
  Zap,
  Layers,
  Lightbulb,
  Wrench,
  Sigma,
  FileText,
  Play,
  Network,
  Lock,
  History,
  Settings2,
  BrainCircuit,
  MessageSquare,
  Minus,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const callGeminiWithRetry = async (
  operation: () => Promise<any>, 
  maxRetries = 7, 
  initialDelay = 3000
) => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const errorMessage = (err.message || String(err)).toLowerCase();
      const isQuotaError = errorMessage.includes('429') || 
                          errorMessage.includes('resource_exhausted') || 
                          errorMessage.includes('quota') ||
                          err.status === 'RESOURCE_EXHAUSTED' || 
                          err.code === 429;
      
      if (isQuotaError) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini API Quota Exceeded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  const finalErrorMessage = lastError?.message || String(lastError);
  if (finalErrorMessage.toLowerCase().includes('429') || 
      finalErrorMessage.toLowerCase().includes('quota') || 
      lastError?.code === 429) {
    throw new Error("AI Quota Exceeded: The AI is currently busy handling many requests. We are retrying automatically, but if this persists, please wait 60 seconds before trying again.");
  }
  throw lastError;
};

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  distractors: string[];
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'fill-in-the-blank';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  source_citation: string;
  status: 'pending' | 'approved' | 'rejected';
  nodeId?: string;
  module?: string;
  bloomLevel?: string;
  format?: string;
  hints?: string[];
  explanation?: string;
  rubric?: string;
}

interface ReviewItem {
  id: string;
  type: 'question' | 'explanation' | 'answer' | 'chunk';
  content: any;
  reason: string;
  nodeId?: string;
  timestamp: string;
  status: 'pending' | 'resolved';
}

interface Node {
  id: string;
  title: string;
  type: 'topic' | 'concept' | 'skill' | 'objective';
  description: string;
  prerequisites: string[];
  mastery: number; // 0 to 1
  confidence: number; // 0 to 1
  coverageScore?: number; // Node Coverage Monitor
  misconceptions?: string[]; // Misconception Miner
}

interface Edge {
  source: string;
  target: string;
  type: 'prerequisite' | 'contains' | 'supports';
}

interface Chunk {
  id: string;
  text: string;
  nodeIds: string[];
  metadata: {
    source: string;
    module?: string;
    week?: number;
  };
  embedding?: number[];
}

interface StudentProfile {
  masteredNodes: string[];
  attemptedQuestions: string[];
  weakNodes: string[];
  history: { date: string; nodeId: string; score: number; feedback?: string; rating?: number }[];
  tutoringHistory: { role: 'user' | 'model'; text: string; timestamp: string; nodeId?: string }[];
  preferences: {
    country: string;
    language: string;
    examStyle: string;
    academicLevel: string;
    institutionType: string;
    teacherEmphasis: string[];
    socraticMode: boolean;
  };
  generationConfig: {
    bloomLevels: string[];
    examFormat: string;
    allowableStyles: string[];
  };
}

interface Curriculum {
  id: string;
  courseCode: string;
  title: string;
  objectives: string;
  content: string;
  prerequisites?: string;
  url: string;
  modules?: {
    title: string;
    description: string;
  }[];
  graph?: {
    nodes: Node[];
    edges: Edge[];
  };
  chunks?: Chunk[];
  reviewQueue?: ReviewItem[];
  analysis?: {
    topics: string[];
    concepts: string[];
    skills: string[];
    formulas: string[];
    definitions: string[];
  };
}

function PersonalizationPanel({ profile, setProfile }: { profile: StudentProfile, setProfile: React.Dispatch<React.SetStateAction<StudentProfile>> }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-800">Personalization Settings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-700">Learning Context</h4>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500">Academic Level</label>
            <select 
              value={profile.preferences.academicLevel}
              onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, academicLevel: e.target.value } }))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>High School</option>
              <option>University</option>
              <option>Professional</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500">Exam Style</label>
            <select 
              value={profile.preferences.examStyle}
              onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, examStyle: e.target.value } }))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Analytical</option>
              <option>Memorization</option>
              <option>Practical/Applied</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-700">Question Generation</h4>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500">Exam Format</label>
            <select 
              value={profile.generationConfig.examFormat}
              onChange={(e) => setProfile(prev => ({ ...prev, generationConfig: { ...prev.generationConfig, examFormat: e.target.value } }))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Multiple Choice</option>
              <option>Open Ended</option>
              <option>Case Study</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500">Language</label>
            <select 
              value={profile.preferences.language}
              onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, language: e.target.value } }))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>English</option>
              <option>Swedish</option>
            </select>
          </div>
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={profile.preferences.socraticMode}
                onChange={(e) => setProfile(prev => ({ ...prev, preferences: { ...prev.preferences, socraticMode: e.target.checked } }))}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Socratic Mode</span>
            </label>
            <p className="text-[10px] text-slate-400 leading-tight">AI will guide you with hints and probing questions instead of just giving answers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NodeDetailViewProps {
  node: Node;
  curriculum: Curriculum;
  studentProfile: StudentProfile;
  onClose: () => void;
  onGenerateQuestions: (nodeId: string) => Promise<void>;
  onStartTutoring: (nodeId: string) => void;
  key?: string;
}

function NodeDetailView({ node, curriculum, studentProfile, onClose, onGenerateQuestions, onStartTutoring }: NodeDetailViewProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateExplanation = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      // RAG Retriever: Find relevant chunks
      const relevantChunks = (curriculum.chunks || [])
        .filter(c => c.nodeIds.includes(node.id))
        .map(c => c.text)
        .join("\n\n");

      const prompt = `
        You are an expert tutor. Provide a concise, source-grounded explanation for the concept: "${node.title}".
        
        CONTEXT FROM COURSE MATERIAL:
        ${relevantChunks || "No specific course material found for this node. Use general pedagogical knowledge aligned with the course: " + curriculum.title}
        
        LEARNER PROFILE:
        - Level: ${studentProfile.preferences.academicLevel}
        - Style: ${studentProfile.preferences.examStyle}
        
        Explain the concept simply but accurately. Include a "Key Takeaway" and a "Pro-Tip" for exams.
      `;

      const result = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }));

      setExplanation(result.text || "Failed to generate explanation.");
    } catch (err) {
      console.error("Explanation error:", err);
      setExplanation("Error generating explanation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateExplanation();
  }, [node.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            node.type === 'topic' ? 'bg-blue-100 text-blue-600' :
            node.type === 'concept' ? 'bg-purple-100 text-purple-600' :
            node.type === 'skill' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'
          }`}>
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{node.title}</h3>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{node.type}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <XCircle className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="prose prose-slate max-w-none">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium italic">Generating personalized explanation...</p>
            </div>
          ) : (
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {explanation}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
          <button 
            onClick={() => onGenerateQuestions(node.id)}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-sm"
          >
            <Target className="w-4 h-4" />
            Practice Questions
          </button>
          <button 
            onClick={() => onStartTutoring(node.id)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Ask Tutor
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface TutoringPanelProps {
  node: Node;
  curriculum: Curriculum;
  studentProfile: StudentProfile;
  setStudentProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  onClose: () => void;
  onFlag: (type: ReviewItem['type'], content: any, reason: string, nodeId?: string) => void;
  key?: string;
}

function TutoringPanel({ 
  node, 
  curriculum, 
  studentProfile, 
  setStudentProfile,
  onClose,
  onFlag
}: TutoringPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [studentProfile.tutoringHistory]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const newHistory = [
      ...studentProfile.tutoringHistory,
      { role: 'user' as const, text: userMessage, timestamp: new Date().toISOString(), nodeId: node.id }
    ];

    setStudentProfile(prev => ({ ...prev, tutoringHistory: newHistory }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      // Query Rewriter: Add context
      const contextPrompt = `
        The student is asking about "${node.title}" in the course "${curriculum.title}".
        Prior conversation context: ${JSON.stringify(newHistory.slice(-3))}
        Student Question: "${userMessage}"
        
        Rewrite this question to be a self-contained query for a knowledge retrieval system.
      `;
      const rewrittenResult = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: contextPrompt }] }],
      }));
      const rewrittenQuery = rewrittenResult.text || userMessage;

      // RAG Retriever: Find relevant chunks
      const relevantChunks = (curriculum.chunks || [])
        .filter(c => c.nodeIds.includes(node.id))
        .map(c => c.text)
        .join("\n\n");

      // Local LLM (Gemini): Generate response
      const tutorPrompt = `
        You are Svea, an AI tutor for Swedish university students. 
        Concept: ${node.title}
        Course: ${curriculum.title}
        
        COURSE MATERIAL:
        ${relevantChunks}
        
        STUDENT PROFILE:
        - Level: ${studentProfile.preferences.academicLevel}
        - Style: ${studentProfile.preferences.examStyle}
        
        INSTRUCTIONS:
        - Be encouraging and pedagogical.
        - Use the course material to answer.
        - If the student is stuck, provide a HINT instead of the full answer.
        - Use citations like [Source: Course Syllabus] if applicable.
        
        REWRITTEN QUERY: ${rewrittenQuery}
      `;

      const result = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: tutorPrompt }] }],
      }));

      const modelMessage = result.text || "I'm sorry, I couldn't process that. Could you try rephrasing?";
      
      setStudentProfile(prev => ({
        ...prev,
        tutoringHistory: [
          ...prev.tutoringHistory,
          { role: 'model' as const, text: modelMessage, timestamp: new Date().toISOString(), nodeId: node.id }
        ]
      }));
    } catch (err) {
      console.error("Tutoring error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col h-[600px]"
    >
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5" />
          <div>
            <h3 className="text-sm font-bold">Tutoring: {node.title}</h3>
            <p className="text-[10px] opacity-80">AI-Powered Scaffolding</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onFlag('explanation', { node, history: studentProfile.tutoringHistory.filter(h => h.nodeId === node.id) }, 'Student flagged tutoring explanation', node.id)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            title="Flag for Review"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {studentProfile.tutoringHistory.filter(h => h.nodeId === node.id).length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
              <Lightbulb className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Ask me anything about {node.title}!</p>
          </div>
        )}
        {studentProfile.tutoringHistory.filter(h => h.nodeId === node.id).map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function KnowledgeMap({ nodes, edges, studentProfile, onPrepareNode, onSelectNode }: { 
  nodes: Node[], 
  edges: Edge[], 
  studentProfile: StudentProfile, 
  onPrepareNode: (id: string) => void,
  onSelectNode: (node: Node) => void
}) {
  const nextNodes = nodes.filter(node => {
    if (studentProfile.masteredNodes.includes(node.id)) return false;
    return node.prerequisites.every(p => studentProfile.masteredNodes.includes(p));
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-600" />
          Knowledge Graph & Mastery
        </h3>
        <div className="flex gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" /> Mastered
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" /> In Progress
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-200" /> Locked
          </div>
        </div>
      </div>

      {nextNodes.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
          <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" />
            Recommended Next Steps
          </h4>
          <div className="flex flex-wrap gap-3">
            {nextNodes.map(node => (
              <button 
                key={node.id}
                onClick={() => onPrepareNode(node.id)}
                className="bg-white px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                Learn {node.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map(node => {
          const isMastered = studentProfile.masteredNodes.includes(node.id);
          const isWeak = studentProfile.weakNodes.includes(node.id);
          const hasPrereqs = node.prerequisites.every(p => studentProfile.masteredNodes.includes(p));
          
          return (
            <motion.div 
              key={node.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => onSelectNode(node)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isMastered ? 'bg-green-50 border-green-200' : 
                isWeak ? 'bg-red-50 border-red-200' :
                hasPrereqs ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  node.type === 'topic' ? 'bg-blue-100 text-blue-600' :
                  node.type === 'concept' ? 'bg-purple-100 text-purple-600' :
                  node.type === 'skill' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {node.type}
                </span>
                {isMastered && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                {!hasPrereqs && <Lock className="w-4 h-4 text-slate-400" />}
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">{node.title}</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">{node.description}</p>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Mastery</span>
                  <span>{Math.round(node.mastery * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${isMastered ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${node.mastery * 100}%` }}
                  />
                </div>
              </div>

              {!hasPrereqs && node.prerequisites.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Missing Prerequisites
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AnalysisSection({ title, items, icon }: { title: string, items: string[], icon: React.ReactNode }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-md text-xs border border-slate-100">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'student' | 'instructor'>('student');
  const [courseCode, setCourseCode] = useState('DD1337');
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    masteredNodes: [],
    attemptedQuestions: [],
    weakNodes: [],
    history: [],
    tutoringHistory: [],
    preferences: {
      country: 'Sweden',
      language: 'English',
      examStyle: 'Analytical',
      academicLevel: 'University',
      institutionType: 'Research University',
      teacherEmphasis: ['Critical Thinking', 'Practical Application'],
      socraticMode: true
    },
    generationConfig: {
      bloomLevels: ['Understanding', 'Applying', 'Analyzing'],
      examFormat: 'Multiple Choice',
      allowableStyles: ['Case-based', 'Theoretical', 'Problem-solving']
    }
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [instructorTab, setInstructorTab] = useState<'Question Bank' | 'Review Queue' | 'Node Coverage'>('Question Bank');
  const [shortAnswer, setShortAnswer] = useState('');

  const [autoApprove, setAutoApprove] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [tutoringNode, setTutoringNode] = useState<Node | null>(null);

  const featuredCourses = [
    { code: 'DD1337', name: 'Programming (KTH)' },
    { code: 'ID1018', name: 'Programming I (KTH)' },
    { code: 'ME1003', name: 'Industrial Management (KTH)' },
    { code: 'SF1624', name: 'Algebra and Geometry (KTH)' },
  ];

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      if (Array.isArray(data)) {
        setQuestions(data);
      } else {
        console.error("Fetched questions are not an array", data);
        setQuestions([]);
      }
    } catch (err) {
      console.error("Failed to fetch questions", err);
      setQuestions([]);
    }
  };

  const handleScrape = async (selectedCode?: string) => {
    const codeToUse = selectedCode || courseCode;
    setCourseCode(codeToUse);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode: codeToUse }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurriculum(data);
        handleAnalyze(data);
        handleGenerate(data.id);
      } else {
        setError(data.error || "Failed to fetch syllabus");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (curr: Curriculum) => {
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      // 1. Generate Knowledge Graph and Modules
      const graphPrompt = `
        Analyze the following course curriculum for "${curr.title}" (${curr.courseCode}):
        
        OBJECTIVES:
        ${curr.objectives}
        
        CONTENT:
        ${curr.content}
        
        1. Identify Course Modules.
        2. Create a Knowledge Graph of Nodes (Topics, Concepts, Skills, Objectives).
        3. Define Relationships (Prerequisites, Containment).
        4. Identify Topics, Concepts, Skills, Formulas, and Definitions.
        
        Return the output as a JSON object:
        {
          "modules": [{"title": "string", "description": "string"}],
          "nodes": [{
            "id": "string",
            "title": "string",
            "type": "topic" | "concept" | "skill" | "objective",
            "description": "string",
            "prerequisites": ["node_id"]
          }],
          "edges": [{"source": "string", "target": "string", "type": "prerequisite" | "contains" | "supports"}],
          "analysis": {
            "topics": ["string"],
            "concepts": ["string"],
            "skills": ["string"],
            "formulas": ["string"],
            "definitions": ["string"]
          }
        }
      `;

      const graphResult = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: graphPrompt }] }],
        config: { responseMimeType: "application/json" },
      }));

      const graphData = JSON.parse(graphResult.text || "{}");

      // Larger delay between calls to avoid burst rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Chunking Logic
      const chunks: Chunk[] = [];
      const fullText = `${curr.objectives}\n\n${curr.content}`;
      const chunkSize = 500;
      const overlap = 100;
      
      for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
        const chunkText = fullText.substring(i, i + chunkSize);
        chunks.push({
          id: `chunk-${i}`,
          text: chunkText,
          nodeIds: [], 
          metadata: { 
            source: curr.url,
            module: graphData.modules[Math.floor(Math.random() * graphData.modules.length)]?.title // Naive mapping for now
          }
        });
        if (i + chunkSize >= fullText.length) break;
      }

      // 3. Map Chunks to Nodes (Semantic Linkage)
      const mappingPrompt = `
        Based on the following Knowledge Graph Nodes:
        ${JSON.stringify(graphData.nodes.map((n: any) => ({ id: n.id, title: n.title })))}
        
        Map each of these text chunks to the most relevant Node IDs.
        CHUNKS:
        ${JSON.stringify(chunks.map(c => ({ id: c.id, text: c.text.substring(0, 100) + "..." })))}
        
        Return a JSON object mapping chunk IDs to arrays of Node IDs:
        { "chunk-id": ["node-id"] }
      `;

      // Larger delay before mapping call to avoid burst rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mappingResult = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: mappingPrompt }] }],
        config: { responseMimeType: "application/json" },
      }));

      const mappingData = JSON.parse(mappingResult.text || "{}");
      chunks.forEach(c => {
        if (mappingData[c.id]) {
          c.nodeIds = mappingData[c.id];
        }
      });

      // Node Coverage Monitor: Calculate coverage score for each node
      const nodeCoverage: Record<string, number> = {};
      graphData.nodes.forEach((n: any) => {
        const nodeChunks = chunks.filter(c => c.nodeIds.includes(n.id)).length;
        // Score based on number of chunks (0 to 1, cap at 5 chunks for full coverage)
        nodeCoverage[n.id] = Math.min(nodeChunks / 5, 1);
      });

      // Larger delay before embedding call to avoid burst rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Embedding Chunks (Real Integration)
      const embeddingModel = 'gemini-embedding-2-preview';
      const chunkTexts = chunks.map(c => c.text);
      
      try {
        const embedResult = await callGeminiWithRetry(() => ai.models.embedContent({
          model: embeddingModel,
          contents: chunkTexts,
        }));
        
        embedResult.embeddings.forEach((emb: any, idx: number) => {
          chunks[idx].embedding = emb.values;
        });
      } catch (embedErr) {
        console.error("Embedding failed, continuing without vectors", embedErr);
      }

      setCurriculum(prev => prev ? { 
        ...prev, 
        modules: graphData.modules,
        graph: {
          nodes: graphData.nodes.map((n: any) => ({ 
            ...n, 
            mastery: 0, 
            confidence: 0,
            coverageScore: nodeCoverage[n.id] || 0 
          })),
          edges: graphData.edges
        },
        chunks,
        analysis: graphData.analysis,
        reviewQueue: []
      } : null);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "Failed to analyze course curriculum");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFlag = (type: ReviewItem['type'], content: any, reason: string, nodeId?: string) => {
    const newItem: ReviewItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      reason,
      nodeId,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    setCurriculum(prev => prev ? {
      ...prev,
      reviewQueue: [...(prev.reviewQueue || []), newItem]
    } : null);
    alert("Item flagged for instructor review.");
  };

  const handleResolveReview = (id: string) => {
    setCurriculum(prev => {
      if (!prev || !prev.reviewQueue) return prev;
      return {
        ...prev,
        reviewQueue: prev.reviewQueue.map(item => 
          item.id === id ? { ...item, status: 'resolved' } : item
        )
      };
    });
  };
  const downloadCurriculum = () => {
    if (!curriculum) return;
    
    let text = `Course: ${curriculum.title} (${curriculum.courseCode})\n`;
    text += `URL: ${curriculum.url}\n\n`;
    text += `LEARNING OBJECTIVES:\n${curriculum.objectives}\n\n`;
    text += `COURSE CONTENT:\n${curriculum.content}\n\n`;
    
    if (curriculum.analysis) {
      text += `--- ANALYSIS ---\n\n`;
      text += `TOPICS:\n- ${curriculum.analysis.topics.join('\n- ')}\n\n`;
      text += `CONCEPTS:\n- ${curriculum.analysis.concepts.join('\n- ')}\n\n`;
      text += `SKILLS:\n- ${curriculum.analysis.skills.join('\n- ')}\n\n`;
      text += `FORMULAS:\n- ${curriculum.analysis.formulas.join('\n- ')}\n\n`;
      text += `DEFINITIONS:\n- ${curriculum.analysis.definitions.join('\n- ')}\n`;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${curriculum.courseCode}_Curriculum.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (id: string, moduleTitle?: string, nodeId?: string, startExamAfter = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curriculumId: id }),
      });
      const { curriculum, error: serverError } = await res.json();
      
      if (!res.ok) {
        throw new Error(serverError || "Failed to fetch curriculum data");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const moduleContext = moduleTitle ? `Focus specifically on the module: "${moduleTitle}".` : "Cover the entire course curriculum.";
      const nodeContext = nodeId ? `Focus specifically on the knowledge node: "${nodeId}".` : "";
      
      // Adaptive Assessment: Tailor questions based on student profile
      const weakNodesContext = studentProfile.weakNodes.length > 0 
        ? `The student is struggling with: ${studentProfile.weakNodes.join(", ")}. Prioritize these areas.` 
        : "";
      
      // Difficulty Adaptation: Check mastery of the node
      let suggestedDifficulty = 'Medium';
      if (nodeId) {
        const node = curriculum.graph?.nodes.find((n: any) => n.id === nodeId);
        if (node) {
          if (node.mastery > 0.8) suggestedDifficulty = 'Hard';
          else if (node.mastery < 0.4) suggestedDifficulty = 'Easy';
        }
      }

      const prompt = `
        You are a professor at a Swedish university following a SOCRATIC STYLE of teaching. 
        Based on the following course syllabus for "${curriculum.title}" (${curriculum.courseCode}):
        
        LEARNING OBJECTIVES:
        ${curriculum.objectives}
        
        COURSE CONTENT:
        ${curriculum.content}
        
        ${moduleContext}
        ${nodeContext}
        ${weakNodesContext}
        
        STUDENT PREFERENCES:
        - Country: ${studentProfile.preferences.country}
        - Language: ${studentProfile.preferences.language}
        - Exam Style: ${studentProfile.preferences.examStyle}
        - Academic Level: ${studentProfile.preferences.academicLevel}
        - Institution Type: ${studentProfile.preferences.institutionType}
        - Teacher Emphasis: ${studentProfile.preferences.teacherEmphasis.join(", ")}
        
        GENERATION CONFIG:
        - Bloom Levels: ${studentProfile.generationConfig.bloomLevels.join(", ")}
        - Exam Format: ${studentProfile.generationConfig.examFormat}
        - Allowable Styles: ${studentProfile.generationConfig.allowableStyles.join(", ")}
        - Suggested Difficulty: ${suggestedDifficulty}
        
        Generate 5 high-quality exam-style questions. 
        DIVERSIFY question types: multiple-choice, short-answer, true-false, fill-in-the-blank.
        Follow a SOCRATIC STYLE: questions should guide the student to think critically rather than just recalling facts.
        
        Return the output as a JSON array of objects with the following structure:
        {
          "question_text": "string",
          "correct_answer": "string",
          "distractors": ["string", "string", "string"], // 3 for multiple-choice, 1 for true-false (the opposite), empty for short-answer/fill-in-the-blank
          "type": "multiple-choice" | "short-answer" | "true-false" | "fill-in-the-blank",
          "difficulty": "Easy" | "Medium" | "Hard",
          "source_citation": "${curriculum.url}",
          "nodeId": "string",
          "bloomLevel": "string",
          "format": "string",
          "hints": ["string", "string"],
          "explanation": "string",
          "rubric": "string"
        }
      `;

      const result = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        },
      }));

      const generatedQuestions = JSON.parse(result.text || "[]");
      const questionsWithIds = generatedQuestions.map((q: any) => ({
        ...q,
        id: Math.random().toString(36).substr(2, 9),
        curriculumId: id,
        module: moduleTitle || 'General',
        nodeId: q.nodeId || nodeId || 'General',
        status: autoApprove ? "approved" : "pending",
      }));

      // Save to backend
      await fetch('/api/save-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsWithIds }),
      });

      setQuestions(prev => [...prev, ...questionsWithIds]);
      
      if (startExamAfter) {
        // Start exam with these specific questions
        setCurrentQuestionIndex(0);
        setScore(0);
        setExamFinished(false);
        setActiveExam(true);
      } else if (moduleTitle) {
        alert(`Generated 5 new questions for module: ${moduleTitle}`);
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      }
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  const startExam = () => {
    const approvedQuestions = questions.filter(q => q.status === 'approved');
    if (approvedQuestions.length === 0) {
      alert("No approved questions available. Please switch to Instructor view to approve some drafted questions first.");
      return;
    }
    setActiveExam(true);
    setCurrentQuestionIndex(0);
    setScore(0);
    setExamFinished(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const updateMastery = (nodeId: string, correct: boolean, questionId: string) => {
    setStudentProfile(prev => {
      const newHistory = [...prev.history, { 
        date: new Date().toISOString(), 
        nodeId: nodeId, 
        score: correct ? 1 : 0 
      }];
      
      const nodeHistory = newHistory.filter(h => h.nodeId === nodeId);
      const mastery = nodeHistory.reduce((acc, h) => acc + h.score, 0) / nodeHistory.length;
      
      const masteredNodes = [...prev.masteredNodes];
      const weakNodes = [...prev.weakNodes];
      
      if (mastery >= 0.8 && !masteredNodes.includes(nodeId)) {
        masteredNodes.push(nodeId);
        const weakIdx = weakNodes.indexOf(nodeId);
        if (weakIdx > -1) weakNodes.splice(weakIdx, 1);
      } else if (mastery < 0.5) {
        if (!weakNodes.includes(nodeId)) weakNodes.push(nodeId);
        const masteredIdx = masteredNodes.indexOf(nodeId);
        if (masteredIdx > -1) masteredNodes.splice(masteredIdx, 1);
      }

      return {
        ...prev,
        history: newHistory,
        masteredNodes,
        weakNodes,
        attemptedQuestions: [...prev.attemptedQuestions, questionId]
      };
    });

    setCurriculum(prev => {
      if (!prev || !prev.graph) return prev;
      const newNodes = prev.graph.nodes.map(n => {
        if (n.id === nodeId) {
          const nodeHistory = [...studentProfile.history, { date: '', nodeId: n.id, score: correct ? 1 : 0 }]
            .filter(h => h.nodeId === n.id);
          const mastery = nodeHistory.reduce((acc, h) => acc + h.score, 0) / nodeHistory.length;
          return { ...n, mastery, confidence: mastery };
        }
        return n;
      });
      return { ...prev, graph: { ...prev.graph, nodes: newNodes } };
    });
  };

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const approvedQuestions = questions.filter(q => q.status === 'approved');
    const question = approvedQuestions[currentQuestionIndex];
    
    // Socratic Evaluation: Check if the answer is correct or partially correct
    const correct = answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    // Answer Evaluator & Follow-Up Question Engine & Misconception Miner
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const evalPrompt = `
        You are a SOCRATIC TUTOR. A student just answered a question.
        QUESTION: ${question.question_text}
        STUDENT ANSWER: ${answer}
        CORRECT ANSWER: ${question.correct_answer}
        EXPLANATION: ${question.explanation}
        TYPE: ${question.type}
        
        1. Evaluate the student's understanding using a SOCRATIC APPROACH.
        2. If the answer is WRONG, do NOT just give the correct answer. Instead, provide a HINT or a GUIDING QUESTION to help them find the error.
        3. If the answer is CORRECT, provide a brief, encouraging feedback (Evaluation) and ONE probing follow-up question to deepen their understanding of "${question.nodeId}".
        4. Identify any specific MISCONCEPTION or gap in knowledge.
        
        Return JSON:
        {
          "evaluation": "string (Socratic feedback)",
          "followUp": "string (Guiding question or probing question)",
          "misconception": "string | null"
        }
      `;
      const result = await callGeminiWithRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
        config: { responseMimeType: "application/json" },
      }));
      const data = JSON.parse(result.text || "{}");
      setEvaluation(data.evaluation);
      setFollowUp(data.followUp);

      // Misconception Miner: Update node with detected misconception
      if (data.misconception && question.nodeId) {
        setCurriculum(prev => {
          if (!prev || !prev.graph) return prev;
          const newNodes = prev.graph.nodes.map(n => {
            if (n.id === question.nodeId) {
              const misconceptions = [...(n.misconceptions || [])];
              if (!misconceptions.includes(data.misconception)) {
                misconceptions.push(data.misconception);
              }
              return { ...n, misconceptions };
            }
            return n;
          });
          return { ...prev, graph: { ...prev.graph, nodes: newNodes } };
        });
      }
    } catch (err: any) {
      console.error("Evaluation error:", err);
      setEvaluation(err.message || "Failed to evaluate answer");
    }

    // Update Student Profile & Mastery Tracking
    if (question.nodeId && question.nodeId !== 'General') {
      updateMastery(question.nodeId, correct, question.id);
    }
  };

  const handleSkip = () => {
    if (selectedAnswer) return;
    const approvedQuestions = questions.filter(q => q.status === 'approved');
    const question = approvedQuestions[currentQuestionIndex];
    
    setSelectedAnswer("Skipped");
    setIsCorrect(false);
    setEvaluation("You skipped this question. Review the explanation below to understand the concept.");
    
    if (question.nodeId && question.nodeId !== 'General') {
      updateMastery(question.nodeId, false, question.id);
    }
  };

  const nextQuestion = () => {
    const approvedQuestions = questions.filter(q => q.status === 'approved');
    if (currentQuestionIndex + 1 < approvedQuestions.length) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setEvaluation(null);
      setFollowUp(null);
      setShowHint(false);
      setCurrentHintIndex(0);
    } else {
      setExamFinished(true);
    }
  };

  const approvedQuestions = questions.filter(q => q.status === 'approved');
  const pendingQuestions = questions.filter(q => q.status === 'pending');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800">SveaPrep</span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-full">
              <button 
                onClick={() => setView('student')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Student View
              </button>
              <button 
                onClick={() => setView('instructor')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'instructor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Instructor Panel
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'student' ? (
          <div className="space-y-8">
            {/* Student Profile Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mastered</p>
                  <p className="text-2xl font-black text-slate-800">{studentProfile.masteredNodes.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weak Areas</p>
                  <p className="text-2xl font-black text-slate-800">{studentProfile.weakNodes.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attempted</p>
                  <p className="text-2xl font-black text-slate-800">{studentProfile.attemptedQuestions.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-indigo-100 p-3 rounded-xl">
                  <History className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">History</p>
                  <p className="text-2xl font-black text-slate-800">{studentProfile.history.length}</p>
                </div>
              </div>
            </div>

            {/* Resume Practice Banner */}
            {!activeExam && (currentQuestionIndex > 0 || selectedAnswer) && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-500 p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-bold">Practice in Progress</h4>
                    <p className="text-xs text-indigo-100">You are on question {currentQuestionIndex + 1} of {approvedQuestions.length}.</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setActiveExam(true)}
                    className="flex-1 sm:flex-none bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Resume Session
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this practice session? Your progress will be lost.")) {
                        setScore(0);
                        setCurrentQuestionIndex(0);
                        setExamFinished(false);
                        setSelectedAnswer(null);
                        setEvaluation(null);
                        setFollowUp(null);
                        setShowHint(false);
                      }
                    }}
                    className="flex-1 sm:flex-none bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-800 transition-all border border-indigo-500"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Hero Section */}
            {!activeExam && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm overflow-hidden relative">
                  <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
                      Master Your University Exams with <span className="text-blue-600">AI-Powered</span> Precision.
                    </h1>
                    <p className="text-lg text-slate-600 mb-8">
                      Select a course from our library or enter a code to scrape the latest curriculum and generate practice questions.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                          type="text" 
                          value={courseCode}
                          onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                          placeholder="Enter Course Code (e.g. DD1337)"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <button 
                        onClick={() => handleScrape()}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                        Prepare Course
                      </button>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={autoApprove} 
                            onChange={(e) => setAutoApprove(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors ${autoApprove ? 'bg-blue-600' : 'bg-slate-300'}`} />
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoApprove ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                          Demo Mode: Auto-Approve Questions
                        </span>
                      </label>
                    </div>
                    
                    {error && (
                      <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{error}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50 to-transparent hidden lg:block" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {featuredCourses.map((course) => (
                    <button
                      key={course.code}
                      onClick={() => handleScrape(course.code)}
                      disabled={loading}
                      className="bg-white p-4 rounded-xl border border-slate-200 text-left hover:border-blue-500 hover:shadow-md transition-all group"
                    >
                      <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">{course.code}</div>
                      <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{course.name}</div>
                    </button>
                  ))}
                </div>

                {/* Curriculum Display */}
                {curriculum && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                  >
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-slate-900">{curriculum.title}</h2>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-slate-500 font-mono text-sm">{curriculum.courseCode}</span>
                              <span className="text-slate-300">•</span>
                              <a 
                                href={curriculum.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Verifiable Source
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleGenerate(curriculum.id, undefined, undefined, true)}
                              disabled={loading}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                            >
                              <Zap className="w-4 h-4" />
                              Diagnostic Assessment
                            </button>
                            <button 
                              onClick={downloadCurriculum}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-blue-600" />
                              Specific Prerequisites
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {curriculum.prerequisites || "No specific prerequisites listed for this course."}
                              </p>
                            </div>
                          </section>

                          <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <LayoutDashboard className="w-5 h-5 text-blue-600" />
                              Course Modules & Material
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {curriculum.modules ? curriculum.modules.map((mod, i) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-blue-200 transition-all group">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{mod.title}</h4>
                                    <button 
                                      onClick={() => handleGenerate(curriculum.id, mod.title, undefined, true)}
                                      disabled={loading}
                                      className="text-[10px] uppercase tracking-wider font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                                    >
                                      Prepare
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                                </div>
                              )) : (
                                <div className="col-span-2 text-center py-8 text-slate-400 italic">
                                  Analyzing modules...
                                </div>
                              )}
                            </div>
                          </section>

                          <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <Target className="w-5 h-5 text-blue-600" />
                              Learning Objectives
                            </h3>
                            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {curriculum.objectives}
                            </div>
                          </section>

                          {curriculum.graph && (
                            <section className="pt-8 border-t border-slate-100">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                  <KnowledgeMap 
                                    nodes={curriculum.graph.nodes} 
                                    edges={curriculum.graph.edges} 
                                    studentProfile={studentProfile} 
                                    onPrepareNode={(nodeId) => handleGenerate(curriculum.id, undefined, nodeId, true)}
                                    onSelectNode={(node) => setSelectedNode(node)}
                                  />
                                </div>
                                <div className="space-y-6">
                                  <AnimatePresence mode="wait">
                                    {selectedNode && (
                                      <NodeDetailView 
                                        key="detail"
                                        node={selectedNode}
                                        curriculum={curriculum}
                                        studentProfile={studentProfile}
                                        onClose={() => setSelectedNode(null)}
                                        onGenerateQuestions={(nodeId) => handleGenerate(curriculum.id, undefined, nodeId, true)}
                                        onStartTutoring={(nodeId) => {
                                          const node = curriculum.graph?.nodes.find(n => n.id === nodeId);
                                          if (node) setTutoringNode(node);
                                        }}
                                      />
                                    )}
                                    {tutoringNode && (
                                      <TutoringPanel 
                                        key="tutoring"
                                        node={tutoringNode}
                                        curriculum={curriculum}
                                        studentProfile={studentProfile}
                                        setStudentProfile={setStudentProfile}
                                        onClose={() => setTutoringNode(null)}
                                        onFlag={handleFlag}
                                      />
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </section>
                          )}

                          <section className="pt-8 border-t border-slate-100">
                            <PersonalizationPanel profile={studentProfile} setProfile={setStudentProfile} />
                          </section>

                          <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-blue-600" />
                              Course Content
                            </h3>
                            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {curriculum.content}
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-yellow-500" />
                          Curriculum Analysis
                        </h3>
                        
                        {analyzing ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            <p className="text-sm text-slate-500 animate-pulse">Identifying topics & concepts...</p>
                          </div>
                        ) : curriculum.analysis ? (
                          <div className="space-y-6">
                            <AnalysisSection title="Topics" items={curriculum.analysis.topics} icon={<Layers className="w-4 h-4" />} />
                            <AnalysisSection title="Concepts" items={curriculum.analysis.concepts} icon={<Lightbulb className="w-4 h-4" />} />
                            <AnalysisSection title="Skills" items={curriculum.analysis.skills} icon={<Wrench className="w-4 h-4" />} />
                            <AnalysisSection title="Formulas" items={curriculum.analysis.formulas} icon={<Sigma className="w-4 h-4" />} />
                            <AnalysisSection title="Definitions" items={curriculum.analysis.definitions} icon={<FileText className="w-4 h-4" />} />
                          </div>
                        ) : (
                          <div className="text-center py-8 space-y-4">
                            <p className="text-sm text-slate-400">No analysis available.</p>
                            {error && error.includes("AI Quota Exceeded") && (
                              <button 
                                onClick={() => handleAnalyze(curriculum)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 mx-auto"
                              >
                                <Zap className="w-4 h-4" />
                                Retry Analysis
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                        <h3 className="text-lg font-bold mb-2">Ready to Practice?</h3>
                        <p className="text-blue-100 text-sm mb-6">We've generated {approvedQuestions.length} approved questions based on this curriculum.</p>
                        <div className="space-y-3">
                          <button 
                            onClick={() => {
                              if (currentQuestionIndex > 0 || selectedAnswer) {
                                setActiveExam(true);
                              } else {
                                startExam();
                              }
                            }}
                            className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                          >
                            {currentQuestionIndex > 0 || selectedAnswer ? (
                              <>
                                <History className="w-4 h-4" />
                                Resume Practice Exam
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 fill-current" />
                                Start Practice Exam
                              </>
                            )}
                          </button>
                          {(currentQuestionIndex > 0 || selectedAnswer) && (
                            <button 
                              onClick={startExam}
                              className="w-full bg-blue-700/50 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all border border-blue-400/30"
                            >
                              Restart From Beginning
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Exam Area */}
            {activeExam ? (
              <div className="max-w-3xl mx-auto">
                {!examFinished ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setActiveExam(false)}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            title="Minimize & Go Back"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm("Are you sure you want to cancel this practice session? Your progress will be lost.")) {
                                setActiveExam(false);
                                setScore(0);
                                setCurrentQuestionIndex(0);
                                setExamFinished(false);
                                setSelectedAnswer(null);
                                setEvaluation(null);
                                setFollowUp(null);
                                setShowHint(false);
                              }
                            }}
                            className="p-2 hover:bg-red-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
                            title="Cancel Practice"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                          Question {currentQuestionIndex + 1} of {approvedQuestions.length}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {approvedQuestions.map((_, i) => (
                          <div key={i} className={`h-1.5 w-6 rounded-full ${i === currentQuestionIndex ? 'bg-blue-600' : i < currentQuestionIndex ? 'bg-blue-200' : 'bg-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-8">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {approvedQuestions.length}</span>
                        <div className="flex gap-2">
                          {!selectedAnswer && (
                            <button 
                              onClick={handleSkip}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                              title="Skip this question"
                            >
                              Skip Question
                            </button>
                          )}
                          {approvedQuestions[currentQuestionIndex].hints && approvedQuestions[currentQuestionIndex].hints.length > 0 && !selectedAnswer && (
                            <button 
                              onClick={() => {
                                setShowHint(true);
                                setCurrentHintIndex(prev => Math.min(prev + 1, (approvedQuestions[currentQuestionIndex].hints?.length || 1) - 1));
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                              <Lightbulb className="w-3 h-3" />
                              {showHint ? 'Next Hint' : 'Get Hint'}
                            </button>
                          )}
                        </div>
                      </div>

                      {showHint && approvedQuestions[currentQuestionIndex].hints && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-700 italic mb-6"
                        >
                          <strong>Hint:</strong> {approvedQuestions[currentQuestionIndex].hints[currentHintIndex]}
                        </motion.div>
                      )}

                      <h2 className="text-2xl font-bold text-slate-800 mb-8">
                        {approvedQuestions[currentQuestionIndex].question_text}
                      </h2>
                      
                      <div className="space-y-3">
                        {approvedQuestions[currentQuestionIndex].type === 'true-false' ? (
                          ['True', 'False'].map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAnswer(option)}
                              disabled={!!selectedAnswer}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                                selectedAnswer === option 
                                  ? option.toLowerCase() === approvedQuestions[currentQuestionIndex].correct_answer.toLowerCase()
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-red-500 bg-red-50 text-red-700'
                                  : selectedAnswer && option.toLowerCase() === approvedQuestions[currentQuestionIndex].correct_answer.toLowerCase()
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              <span className="font-medium">{option}</span>
                              {selectedAnswer === option && (
                                option.toLowerCase() === approvedQuestions[currentQuestionIndex].correct_answer.toLowerCase()
                                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                                  : <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </button>
                          ))
                        ) : approvedQuestions[currentQuestionIndex].type === 'multiple-choice' ? (
                          [approvedQuestions[currentQuestionIndex].correct_answer, ...approvedQuestions[currentQuestionIndex].distractors]
                            .sort()
                            .map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAnswer(option)}
                                disabled={!!selectedAnswer}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                                  selectedAnswer === option 
                                    ? option === approvedQuestions[currentQuestionIndex].correct_answer
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : 'border-red-500 bg-red-50 text-red-700'
                                    : selectedAnswer && option === approvedQuestions[currentQuestionIndex].correct_answer
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                <span className="font-medium">{option}</span>
                                {selectedAnswer === option && (
                                  option === approvedQuestions[currentQuestionIndex].correct_answer 
                                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    : <XCircle className="w-5 h-5 text-red-600" />
                                )}
                              </button>
                            ))
                        ) : (
                          <div className="space-y-4">
                            <textarea
                              value={shortAnswer}
                              onChange={(e) => setShortAnswer(e.target.value)}
                              disabled={!!selectedAnswer}
                              placeholder="Type your answer here..."
                              className="w-full p-4 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] transition-all"
                            />
                            {!selectedAnswer && (
                              <button
                                onClick={() => {
                                  handleAnswer(shortAnswer);
                                  setShortAnswer('');
                                }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all"
                              >
                                Submit Answer
                              </button>
                            )}
                            {selectedAnswer && (
                              <div className={`p-4 rounded-xl border-2 ${
                                isCorrect ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                              }`}>
                                <p className="font-bold mb-1">{isCorrect ? 'Correct!' : 'Incorrect'}</p>
                                <p className="text-sm">Your answer: {selectedAnswer}</p>
                                <p className="text-sm font-bold mt-2">Correct answer: {approvedQuestions[currentQuestionIndex].correct_answer}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {selectedAnswer && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 pt-6 mt-6 border-t border-slate-100"
                          >
                            {evaluation && (
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="text-sm text-slate-700 font-medium italic">"{evaluation}"</p>
                              </div>
                            )}

                            {approvedQuestions[currentQuestionIndex].explanation && (
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Explanation:</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{approvedQuestions[currentQuestionIndex].explanation}</p>
                              </div>
                            )}

                            {followUp && (
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Deepen your understanding:</p>
                                <p className="text-sm text-blue-800 font-bold">{followUp}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {selectedAnswer && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-slate-50 border-t border-slate-200 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-4 text-slate-500 text-sm">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Source: <a href={approvedQuestions[currentQuestionIndex].source_citation} target="_blank" className="underline hover:text-blue-600">University Syllabus</a></span>
                          <button 
                            onClick={() => handleFlag('answer', { question: approvedQuestions[currentQuestionIndex], answer: selectedAnswer }, 'Student flagged this answer during exam', approvedQuestions[currentQuestionIndex].nodeId)}
                            className="flex items-center gap-1 hover:text-red-500 transition-colors ml-2"
                            title="Flag for Review"
                          >
                            <AlertCircle className="w-3 h-3" />
                            Flag
                          </button>
                        </div>
                        <button 
                          onClick={nextQuestion}
                          className="bg-slate-900 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-800 transition-all"
                        >
                          {currentQuestionIndex + 1 === approvedQuestions.length ? 'Finish Exam' : 'Next Question'}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-xl text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-32 h-32 rounded-full border-8 border-green-500 flex items-center justify-center mx-auto">
                        <span className="text-3xl font-black text-slate-800">{Math.round((score / approvedQuestions.length) * 100)}%</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-slate-100">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-bold mb-2">Exam Completed!</h2>
                    <p className="text-slate-500 mb-8 text-lg">You scored {score} out of {approvedQuestions.length}</p>
                    
                    {/* Next Step Recommender */}
                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl max-w-md mx-auto mb-8 space-y-4">
                      <h4 className="text-sm font-bold text-indigo-900 flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4" />
                        AI Recommendation
                      </h4>
                      <p className="text-xs text-indigo-700 leading-relaxed">
                        {score / approvedQuestions.length > 0.8 
                          ? "Excellent work! You've mastered these concepts. We recommend moving to the next child node in the curriculum."
                          : "Good effort! You're showing progress, but some concepts need review. We recommend practicing more questions on your weak nodes."}
                      </p>
                      {studentProfile.weakNodes.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Weak Nodes to Practice:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {studentProfile.weakNodes.slice(0, 3).map((nodeId, i) => {
                              const node = curriculum?.graph?.nodes.find(n => n.id === nodeId);
                              return (
                                <button 
                                  key={i}
                                  onClick={() => {
                                    setActiveExam(false);
                                    setSelectedNode(node || null);
                                  }}
                                  className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                  {node?.title || nodeId}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-2xl font-bold text-blue-600">{Math.round((score / approvedQuestions.length) * 100)}%</div>
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Accuracy</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-2xl font-bold text-slate-800">{approvedQuestions.length}</div>
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Questions</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4 mb-8">
                      <p className="text-xs font-bold text-slate-400 uppercase">Rate this session</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star}
                            className="p-1 hover:scale-110 transition-transform"
                            onClick={() => alert(`Thanks for your ${star}-star feedback!`)}
                          >
                            <Target className={`w-6 h-6 ${star <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveExam(false)}
                      className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all w-full"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">Verified Question Bank</h2>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {approvedQuestions.length} Questions
                    </span>
                  </div>
                  
                  {approvedQuestions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {approvedQuestions.map((q) => (
                        <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                              q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {q.difficulty}
                            </span>
                            <ShieldCheck className="text-blue-500 w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-slate-700 font-medium leading-relaxed mb-4">{q.question_text}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Check className="w-3 h-3 text-green-500" />
                            <span>Instructor Verified</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                      <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <AlertCircle className="text-slate-300 w-6 h-6" />
                      </div>
                      <p className="text-slate-500 font-medium">No verified questions yet.</p>
                      <p className="text-sm text-slate-400 mt-1">Scrape a course and approve questions in the Instructor Panel.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                    <h3 className="text-xl font-bold mb-4">Ready to test?</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      Take a practice exam based on the currently verified question bank for {courseCode}.
                    </p>
                    <button 
                      onClick={startExam}
                      disabled={approvedQuestions.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      Start Practice Exam
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ShieldCheck className="text-blue-600 w-5 h-5" />
                      Instructor Verification
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Our "Instructor-in-the-Loop" system ensures every question is reviewed by subject matter experts before reaching students.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Curriculum Alignment</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Analytical Focus</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Source Citations</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Instructor Supervision</h1>
                <p className="text-slate-500 mt-1">Review and approve AI-generated questions to build the verified bank.</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{pendingQuestions.length}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Review</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{curriculum?.reviewQueue?.filter(r => r.status === 'pending').length || 0}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flagged Items</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{approvedQuestions.length}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved</div>
                </div>
              </div>
            </div>

            {/* Instructor Sub-navigation */}
            <div className="flex gap-8 border-b border-slate-200">
              {['Question Bank', 'Review Queue', 'Node Coverage'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInstructorTab(tab as any)}
                  className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
                    instructorTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                  {instructorTab === tab && (
                    <motion.div layoutId="instructorTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {instructorTab === 'Question Bank' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Question Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Difficulty</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {questions.length > 0 ? (
                      questions.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-6 max-w-md">
                            <p className="text-slate-800 font-medium mb-2">{q.question_text}</p>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-green-600 font-bold">Correct: {q.correct_answer}</span>
                              <a href={q.source_citation} target="_blank" className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                Syllabus
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                              q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                              q.status === 'approved' ? 'text-green-600' :
                              q.status === 'rejected' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                q.status === 'approved' ? 'bg-green-600' :
                                q.status === 'rejected' ? 'bg-red-600' :
                                'bg-yellow-600'
                              }`} />
                              {q.status}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {q.status !== 'approved' && (
                                <button 
                                  onClick={() => updateQuestionStatus(q.id, 'approved')}
                                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {q.status !== 'rejected' && (
                                <button 
                                  onClick={() => updateQuestionStatus(q.id, 'rejected')}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                                  title="Reject"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <button className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all" title="Edit">
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                          No questions generated yet. Use the Student View to scrape a course.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {instructorTab === 'Review Queue' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Flagged Items Queue</h3>
                  <p className="text-xs text-slate-500">Items flagged by students or AI for instructor verification.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {curriculum?.reviewQueue && curriculum.reviewQueue.length > 0 ? (
                    curriculum.reviewQueue.map((item) => (
                      <div key={item.id} className={`p-6 hover:bg-slate-50 transition-colors ${item.status === 'resolved' ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                              item.type === 'question' ? 'bg-blue-100 text-blue-700' :
                              item.type === 'answer' ? 'bg-orange-100 text-orange-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {item.type}
                            </span>
                            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                          {item.status === 'pending' && (
                            <button 
                              onClick={() => handleResolveReview(item.id)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Resolve
                            </button>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-800 mb-2">Reason: {item.reason}</p>
                        <div className="bg-slate-100 p-4 rounded-xl text-xs font-mono text-slate-600 overflow-x-auto">
                          <pre>{JSON.stringify(item.content, null, 2)}</pre>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-400">
                      <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>Review queue is empty. Great job!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {instructorTab === 'Node Coverage' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {curriculum?.graph?.nodes.map((node) => (
                  <div key={node.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-800">{node.title}</h4>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{node.type}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                        (node.coverageScore || 0) > 0.7 ? 'bg-green-100 text-green-700' :
                        (node.coverageScore || 0) > 0.4 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {Math.round((node.coverageScore || 0) * 100)}%
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                          <span>Source Coverage</span>
                          <span>{Math.round((node.coverageScore || 0) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              (node.coverageScore || 0) > 0.7 ? 'bg-green-500' :
                              (node.coverageScore || 0) > 0.4 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(node.coverageScore || 0) * 100}%` }}
                          />
                        </div>
                      </div>

                      {node.misconceptions && node.misconceptions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-red-500 uppercase mb-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Detected Misconceptions
                          </p>
                          <div className="space-y-1">
                            {node.misconceptions.map((m, i) => (
                              <div key={i} className="text-[10px] bg-red-50 text-red-700 p-2 rounded-lg border border-red-100">
                                {m}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer / CTA */}
      <footer className="bg-white border-t border-slate-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-4">Trusted by students from</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale mb-12">
            <span className="font-bold text-xl">KTH Royal Institute</span>
            <span className="font-bold text-xl">Lund University</span>
            <span className="font-bold text-xl">Stockholm University</span>
            <span className="font-bold text-xl">Uppsala University</span>
          </div>
          <div className="max-w-2xl mx-auto bg-blue-50 rounded-2xl p-8 border border-blue-100">
            <h4 className="text-xl font-bold text-blue-900 mb-2">Are you an Instructor?</h4>
            <p className="text-blue-700 mb-6">Join our verified network to help students master their courses with high-quality, syllabus-aligned content.</p>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
              Apply to Supervise
            </button>
          </div>
          <div className="mt-12 text-slate-400 text-xs">
            © 2026 SveaPrep Platform. Built for Swedish Higher Education Standards.
          </div>
        </div>
      </footer>
    </div>
  );
}

