import React, { useState, useRef } from 'react';
import { UserProfile, Subject } from '../types';
import { SUBJECTS } from '../constants';
import { validateCourse } from '../services/geminiService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for manual subject entry
  const [subjectInput, setSubjectInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    age: '',
    grade: '8',
    focusSubject: 'Math', // Default, will be updated based on input
    enrolledCourses: [],
    streak: 1, // Start with 1 day streak for signing up!
    lastLoginDate: new Date().toISOString()
  });

  const handleNext = async () => {
    // Total steps: 0 (Welcome) -> 1 (Name) -> 2 (Photo) -> 3 (Age/Grade) -> 4 (Subject)
    if (step < 4) {
      setStep(prev => prev + 1);
    } else {
      // Step 4 Validation with AI
      const cleanInput = subjectInput.trim();
      
      if (!cleanInput) return;

      setIsValidating(true);
      setErrorMsg('');

      // 1. Check if it's in our default list (Instant check)
      const exactMatch = SUBJECTS.find(s => s.toLowerCase() === cleanInput.toLowerCase());
      
      if (exactMatch) {
         completeOnboarding(exactMatch);
         return;
      }

      // 2. Ask AI if it is a real thing
      const isRealCourse = await validateCourse(cleanInput);
      
      setIsValidating(false);

      if (isRealCourse) {
         // Capitalize first letter for neatness
         const formattedSubject = cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1);
         completeOnboarding(formattedSubject);
      } else {
        // Invalid Subject
        setErrorMsg(`Hmm, "${cleanInput}" doesn't sound like a real course. Try something like 'Physics' or 'Art'!`);
      }
    }
  };

  const completeOnboarding = (subject: string) => {
    const finalProfile = {
        ...profile,
        focusSubject: subject,
        enrolledCourses: [subject]
    };
    onComplete(finalProfile);
  };

  const isStepValid = () => {
    if (step === 0) return true; // Welcome
    if (step === 1) return profile.name.trim().length > 0; // Name
    if (step === 2) return true; // Photo (Optional)
    if (step === 3) return profile.age && profile.grade; // Details
    if (step === 4) return subjectInput.trim().length > 0 && !isValidating; // Subject Input
    return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatarImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        
        {/* Progress Bar */}
        <div className="w-full h-4 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-[#58cc02] transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>

        {/* Content Container */}
        <div className="flex flex-col items-center text-center space-y-6 animate-fade-in-up">
          
          {/* Step 0: Welcome */}
          {step === 0 && (
            <>
              <div className="text-8xl mb-4 animate-bounce">👋</div>
              <h1 className="text-3xl font-extrabold text-gray-700">Welcome to Axiom!</h1>
              <p className="text-xl text-gray-500 font-bold">The ultimate study buddy for geniuses like you.</p>
            </>
          )}

          {/* Step 1: Name */}
          {step === 1 && (
            <>
              <div className="text-8xl mb-4">😎</div>
              <h2 className="text-2xl font-extrabold text-gray-700">What's your name?</h2>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-100 border-2 border-gray-200 text-gray-700 text-xl font-bold px-4 py-4 rounded-2xl focus:outline-none focus:bg-white focus:border-[#1cb0f6] text-center"
                placeholder="Type your name..."
                autoFocus
              />
            </>
          )}

          {/* Step 2: Photo Upload */}
          {step === 2 && (
            <>
              <div className="text-8xl mb-4">📸</div>
              <h2 className="text-2xl font-extrabold text-gray-700">Pick a Profile Pic!</h2>
              <p className="text-gray-400 font-bold">Show us your study face.</p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-40 h-40 rounded-full bg-gray-100 border-4 border-[#1cb0f6] border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden group"
              >
                {profile.avatarImage ? (
                  <img src={profile.avatarImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-gray-300 group-hover:scale-110 transition-transform">+</span>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <span className="text-white font-bold opacity-0 group-hover:opacity-100">CHANGE</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
              />
            </>
          )}

          {/* Step 3: Age & Grade */}
          {step === 3 && (
            <>
              <div className="text-8xl mb-4">🎓</div>
              <h2 className="text-2xl font-extrabold text-gray-700">Tell us about you!</h2>
              
              <div className="w-full space-y-4">
                <div className="text-left">
                  <label className="text-gray-400 font-bold text-sm uppercase ml-2">Your Age</label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    className="w-full bg-gray-100 border-2 border-gray-200 text-gray-700 text-lg font-bold px-4 py-3 rounded-2xl focus:outline-none focus:bg-white focus:border-[#1cb0f6]"
                  />
                </div>

                <div className="text-left">
                  <label className="text-gray-400 font-bold text-sm uppercase ml-2">Grade Level</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {['6', '7', '8', '9'].map(g => (
                      <button
                        key={g}
                        onClick={() => setProfile({ ...profile, grade: g })}
                        className={`btn-push py-3 rounded-xl border-b-4 font-bold text-lg transition-all
                          ${profile.grade === g 
                            ? 'bg-[#1cb0f6] border-[#1499d6] text-white' 
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Subject Focus (Manual Input) */}
          {step === 4 && (
            <>
              <div className="text-8xl mb-4">🚀</div>
              <h2 className="text-2xl font-extrabold text-gray-700">What are we crushing today?</h2>
              <p className="text-gray-400 font-bold">Type the course name below</p>
              
              <div className="w-full relative">
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => {
                        setSubjectInput(e.target.value);
                        setErrorMsg(''); // Clear error on type
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isValidating}
                    className={`w-full bg-gray-100 border-2 ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-200'} text-gray-700 text-xl font-bold px-4 py-4 rounded-2xl focus:outline-none focus:bg-white focus:border-[#1cb0f6] text-center transition-colors placeholder-gray-400`}
                    placeholder="e.g. Astrophysics"
                    autoFocus
                  />
                  
                  {isValidating && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-[#1cb0f6] border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  
                  {errorMsg && (
                    <div className="mt-3 text-red-500 font-bold bg-red-100 px-4 py-2 rounded-xl text-sm animate-pulse flex items-center justify-center gap-2">
                        <span>⚠️</span> {errorMsg}
                    </div>
                  )}
              </div>

              {/* Helpful hints */}
              <div className="flex flex-wrap gap-2 justify-center mt-4 opacity-60">
                <span className="text-xs font-bold uppercase text-gray-400 py-1">Popular:</span>
                {SUBJECTS.map(s => (
                    <span key={s} className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-md font-bold cursor-pointer hover:bg-gray-300" onClick={() => {
                        setSubjectInput(s);
                        setErrorMsg('');
                    }}>
                        {s}
                    </span>
                ))}
              </div>
            </>
          )}

          {/* Navigation */}
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="w-full mt-8 btn-push bg-[#58cc02] border-[#46a302] border-b-4 hover:bg-[#61e002] active:border-b-0 text-white font-extrabold px-8 py-4 rounded-2xl uppercase tracking-widest text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {step === 4 ? (isValidating ? "Checking..." : "Start Learning") : "Continue"}
          </button>

        </div>
      </div>
    </div>
  );
};

export default Onboarding;