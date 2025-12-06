import React, { useState } from 'react';
import { ProficiencyLevel, Topic } from './types';
import LiveSession from './components/LiveSession';

// Predefined Topics
const TOPICS: Topic[] = [
  { 
    id: 'intro', 
    title: 'Self Introduction', 
    khmerTitle: 'ការណែនាំខ្លួន', 
    emoji: '👋', 
    description: 'Practice introducing yourself, your hobbies, and your job.' 
  },
  { 
    id: 'travel', 
    title: 'Travel & Tourism', 
    khmerTitle: 'ការធ្វើដំណើរ និងទេសចរណ៍', 
    emoji: '✈️', 
    description: 'Booking hotels, asking for directions, and ordering food.' 
  },
  { 
    id: 'business', 
    title: 'Business English', 
    khmerTitle: 'ភាសាអង់គ្លេសសម្រាប់ពាណិជ្ជកម្ម', 
    emoji: '💼', 
    description: 'Meetings, negotiations, and professional emails.' 
  },
  { 
    id: 'daily', 
    title: 'Daily Life', 
    khmerTitle: 'ជីវិតប្រចាំថ្ងៃ', 
    emoji: '🏠', 
    description: 'Shopping, family, and daily routines.' 
  },
];

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel>(ProficiencyLevel.BEGINNER);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Landing Page View
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            🗣️
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 mb-2">SpeakFluent KH</h1>
          <h2 className="text-xl text-slate-500 mb-8 font-battambang">កម្មវិធីហ្វឹកហាត់និយាយភាសាអង់គ្លេសដ៏ឆ្លាតវៃ</h2>
          
          <p className="text-slate-600 mb-8 leading-relaxed font-battambang">
            ចង់ចេះនិយាយអង់គ្លេសមែនទេ? ហ្វឹកហាត់ជាមួយ AI របស់យើងដើម្បីបង្កើនទំនុកចិត្ត និងភាពត្រឹមត្រូវ។ ចាប់ផ្តើមពីកម្រិតដំបូងរហូតដល់កម្រិតខ្ពស់!
            <br/><span className="text-sm italic text-slate-400 mt-2 block">(Master English speaking from Beginner to Advanced with our AI Tutor)</span>
          </p>

          <button 
            onClick={() => setHasStarted(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-transform hover:scale-105 shadow-lg shadow-blue-200"
          >
            Start Learning / ចាប់ផ្តើម
          </button>
        </div>
      </div>
    );
  }

  // Active Session View
  if (isSessionActive && selectedTopic) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LiveSession 
          level={selectedLevel}
          topic={selectedTopic}
          onEndSession={() => setIsSessionActive(false)}
        />
      </div>
    );
  }

  // Dashboard / Selection View
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">SpeakFluent KH</h1>
            <p className="text-slate-500 text-sm font-battambang">រើសកម្រិត និងប្រធានបទរបស់អ្នក</p>
          </div>
          <button 
            onClick={() => setHasStarted(false)} 
            className="text-slate-400 hover:text-slate-600"
          >
            <i className="fas fa-sign-out-alt text-xl"></i>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Level Selector */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-slate-700 mb-4 font-battambang">1. កម្រិតភាសា (Proficiency Level)</h3>
            
            {(Object.values(ProficiencyLevel) as ProficiencyLevel[]).map((level) => (
              <div 
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex items-center justify-between ${
                  selectedLevel === level 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-white bg-white hover:border-blue-200 shadow-sm'
                }`}
              >
                <div>
                  <span className="font-bold block text-slate-800">{level}</span>
                  <span className="text-xs text-slate-500 font-battambang">
                    {level === ProficiencyLevel.BEGINNER && 'សម្រាប់អ្នកចាប់ផ្តើមដំបូង'}
                    {level === ProficiencyLevel.INTERMEDIATE && 'សម្រាប់អ្នកចេះខ្លះៗ'}
                    {level === ProficiencyLevel.ADVANCED && 'សម្រាប់កម្រិតខ្ពស់'}
                  </span>
                </div>
                {selectedLevel === level && <i className="fas fa-check-circle text-blue-500 text-xl"></i>}
              </div>
            ))}
          </div>

          {/* Topic Selector */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-slate-700 mb-4 font-battambang">2. ប្រធានបទសន្ទនា (Conversation Topic)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TOPICS.map((topic) => (
                <div 
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className={`relative p-6 rounded-2xl cursor-pointer border transition-all hover:shadow-md ${
                    selectedTopic?.id === topic.id 
                    ? 'bg-white border-blue-500 ring-2 ring-blue-500 ring-opacity-50' 
                    : 'bg-white border-transparent shadow-sm'
                  }`}
                >
                  <div className="text-4xl mb-4">{topic.emoji}</div>
                  <h4 className="font-bold text-lg text-slate-800">{topic.title}</h4>
                  <p className="text-slate-600 font-battambang mb-2">{topic.khmerTitle}</p>
                  <p className="text-sm text-slate-400">{topic.description}</p>
                </div>
              ))}
            </div>

            {/* Start Button */}
            <div className="mt-8 flex justify-end">
              <button
                disabled={!selectedTopic}
                onClick={() => setIsSessionActive(true)}
                className={`px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all ${
                  selectedTopic 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:-translate-y-1' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Start Practice</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;