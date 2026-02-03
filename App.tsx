import React, { useState, useEffect, useRef } from 'react';
import StudyAvatar from './components/StudyAvatar';
import ChatInterface from './components/ChatInterface';
import TaskPanel from './components/TaskPanel';
import Onboarding from './components/Onboarding';
import { AvatarMood, UserProfile, Subject } from './types';
import { SUBJECTS } from './constants';
import { validateCourse } from './services/geminiService';

const App: React.FC = () => {
  const [avatarMood, setAvatarMood] = useState<AvatarMood>(AvatarMood.IDLE);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Course Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourseInput, setNewCourseInput] = useState('');
  const [isCheckingCourse, setIsCheckingCourse] = useState(false);
  const [courseError, setCourseError] = useState('');

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE LAYER ---
  // 1. Load Profile on Startup
  useEffect(() => {
    const initProfile = () => {
      try {
        const savedProfileStr = localStorage.getItem('axiom_user_profile');
        if (savedProfileStr) {
          const savedProfile: UserProfile = JSON.parse(savedProfileStr);
          
          // Migration: Ensure enrolledCourses exists
          if (!savedProfile.enrolledCourses) {
            savedProfile.enrolledCourses = [savedProfile.focusSubject];
          }

          // STREAK LOGIC
          const today = new Date();
          const lastLogin = new Date(savedProfile.lastLoginDate);
          
          // Normalize to midnight
          const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
          
          const diffTime = Math.abs(todayDate.getTime() - lastLoginDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let newStreak = savedProfile.streak;
          
          if (diffDays === 1) {
            newStreak += 1; // Consecutive day
          } else if (diffDays > 1) {
            newStreak = 1; // Missed a day
          }
          // if diffDays === 0, keep same streak

          const updatedProfile = {
            ...savedProfile,
            streak: newStreak,
            lastLoginDate: new Date().toISOString()
          };

          setUserProfile(updatedProfile);
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
        // If data is corrupt, we force logout to prevent crash loop, 
        // effectively resetting to onboarding.
        localStorage.removeItem('axiom_user_profile');
      } finally {
        setIsLoading(false);
      }
    };

    initProfile();
  }, []);

  // 2. Auto-Save Profile on ANY Change
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('axiom_user_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const handleOnboardingComplete = (profile: UserProfile) => {
    // Setting state triggers the Auto-Save useEffect
    setUserProfile(profile);
  };

  const handleLogout = () => {
    localStorage.removeItem('axiom_user_profile');
    setUserProfile(null); // This sets it to null, so the auto-save effect won't run (it checks if userProfile is truthy)
    setIsProfileModalOpen(false);
  };

  const handleSwitchCourse = (subject: Subject) => {
    if (!userProfile) return;
    setUserProfile({ ...userProfile, focusSubject: subject });
  };

  const handleValidateAndAddCourse = async () => {
    if (!userProfile || !newCourseInput.trim()) return;

    const cleanInput = newCourseInput.trim();
    setCourseError('');
    setIsCheckingCourse(true);

    // 1. Check if already enrolled (Case insensitive)
    const alreadyEnrolled = userProfile.enrolledCourses.some(
        c => c.toLowerCase() === cleanInput.toLowerCase()
    );

    if (alreadyEnrolled) {
        setCourseError(`You are already studying ${cleanInput}!`);
        setIsCheckingCourse(false);
        return;
    }

    // 2. Check validity (Quick check first, then AI)
    let finalSubjectName = cleanInput;
    const exactMatch = SUBJECTS.find(s => s.toLowerCase() === cleanInput.toLowerCase());
    
    let isValid = false;

    if (exactMatch) {
        isValid = true;
        finalSubjectName = exactMatch;
    } else {
        // AI Check
        isValid = await validateCourse(cleanInput);
        if (isValid) {
            // Capitalize nicely
            finalSubjectName = cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1);
        }
    }

    setIsCheckingCourse(false);

    if (isValid) {
        // Update State -> Triggers Auto-Save
        setUserProfile(prev => prev ? ({
            ...prev,
            enrolledCourses: [...prev.enrolledCourses, finalSubjectName],
            focusSubject: finalSubjectName
        }) : null);
        
        // Reset Modal
        setIsCourseModalOpen(false);
        setNewCourseInput('');
    } else {
        setCourseError(`"${cleanInput}" doesn't seem like a real topic. Try 'Physics' or 'Music Theory'.`);
    }
  };

  // --- PROFILE EDITING LOGIC ---
  const openProfileModal = () => {
    if (userProfile) {
        setEditingProfile({ ...userProfile });
        setIsProfileModalOpen(true);
    }
  };

  const saveProfileChanges = () => {
    if (editingProfile) {
        // Ensure grade/age aren't empty
        if (!editingProfile.name.trim() || !editingProfile.age || !editingProfile.grade) return;

        // Update State -> Triggers Auto-Save
        setUserProfile(editingProfile);
        setIsProfileModalOpen(false);
    }
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProfile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProfile({ ...editingProfile, avatarImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (isCourseModalOpen) handleValidateAndAddCourse();
        if (isProfileModalOpen) saveProfileChanges();
    }
  };

  // Helper to open modal and reset state
  const openCourseModal = () => {
      setNewCourseInput('');
      setCourseError('');
      setIsCourseModalOpen(true);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-[#58cc02] font-bold text-2xl">Loading Axiom...</div>;
  }

  // Show Onboarding if no profile
  if (!userProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Show Main App
  return (
    <div className="min-h-screen bg-white">
      
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white border-b-2 border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🚀</div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-[#58cc02] tracking-wide leading-none">
              AXIOM <span className="text-gray-400 font-bold text-sm ml-1">STUDY BUDDY</span>
            </h1>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] ml-1">
              by Vertex Labs
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
             <div className="hidden sm:flex gap-4">
                <div className="flex items-center gap-2 font-bold text-gray-500 hover:bg-gray-100 px-3 py-2 rounded-xl cursor-pointer transition-colors group">
                    <span className="group-hover:scale-110 transition-transform">🔥</span> 
                    {userProfile.streak} Day Streak
                </div>
            </div>
            {/* User Avatar / Profile Menu */}
            <div 
                onClick={openProfileModal}
                className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center font-bold text-gray-500 border-b-4 border-gray-300 cursor-pointer hover:bg-[#1cb0f6] hover:text-white hover:border-[#1499d6] transition-all overflow-hidden"
                title="Edit Profile"
            >
                {userProfile.avatarImage ? (
                  <img src={userProfile.avatarImage} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  userProfile.name.charAt(0).toUpperCase()
                )}
            </div>
        </div>
      </header>

      {/* Course Bar */}
      <div className="fixed top-[70px] left-0 w-full z-40 px-6 py-2 bg-white/80 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto flex items-center gap-2">
            
            {/* Scrollable Course List - Flex 1 takes remaining space */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide pr-2">
                {userProfile.enrolledCourses.map(course => (
                    <button
                        key={course}
                        onClick={() => handleSwitchCourse(course)}
                        className={`btn-push flex-shrink-0 px-4 py-2 rounded-xl font-extrabold text-sm uppercase tracking-wider border-b-4 transition-all whitespace-nowrap
                            ${userProfile.focusSubject === course 
                                ? 'bg-[#1cb0f6] border-[#1499d6] text-white' 
                                : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200'
                            }`}
                    >
                        {course}
                    </button>
                ))}
            </div>

            {/* Fixed Add Button - Flex shrink 0 prevents it from squishing */}
            <div className="flex-shrink-0 pb-2 pl-2 border-l-2 border-gray-100">
                <button 
                    onClick={openCourseModal}
                    className="btn-push w-12 h-10 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-[#58cc02] hover:text-[#58cc02] transition-colors bg-white/50"
                    title="Add Course"
                >
                    +
                </button>
            </div>

        </div>
      </div>

      {/* Main Grid Layout */}
      <main className="pt-36 pb-6 px-4 md:px-8 h-screen flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto">
        
        {/* Left Column: Avatar & Tasks */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          
          {/* Avatar Container */}
          <div className="h-64 bg-[#e5f6ff] rounded-3xl border-2 border-b-4 border-[#1cb0f6] relative overflow-hidden">
            <div className="absolute top-4 left-4 font-extrabold text-[#1499d6] opacity-50 uppercase tracking-widest text-sm z-10">Buddy Cam</div>
            <StudyAvatar mood={avatarMood} />
          </div>

          {/* Task Panel */}
          <div className="flex-1 min-h-[300px]">
            <TaskPanel onMoodChange={setAvatarMood} />
          </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="flex-1 h-full min-h-[500px]">
          <ChatInterface 
            onMoodChange={setAvatarMood} 
            userProfile={userProfile}
          />
        </div>

      </main>

      {/* Add Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 border-b-4 border-gray-200 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-700">Add a Course</h2>
                    <button onClick={() => setIsCourseModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
                </div>
                
                <div className="w-full relative mb-4">
                    <input
                        type="text"
                        value={newCourseInput}
                        onChange={(e) => {
                            setNewCourseInput(e.target.value);
                            setCourseError('');
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isCheckingCourse}
                        className={`w-full bg-gray-100 border-2 ${courseError ? 'border-red-400 bg-red-50' : 'border-gray-200'} text-gray-700 text-xl font-bold px-4 py-4 rounded-2xl focus:outline-none focus:bg-white focus:border-[#1cb0f6] text-center transition-colors placeholder-gray-400`}
                        placeholder="e.g. World History"
                        autoFocus
                    />
                    
                    {isCheckingCourse && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-5 w-5 border-2 border-[#1cb0f6] border-t-transparent rounded-full"></div>
                        </div>
                    )}
                </div>

                {courseError && (
                    <div className="mb-4 text-red-500 font-bold bg-red-100 px-4 py-3 rounded-xl text-sm animate-pulse flex items-center justify-center gap-2">
                        <span>⚠️</span> {courseError}
                    </div>
                )}

                {/* Suggestions Pills */}
                <div className="flex flex-wrap gap-2 justify-center mb-6 opacity-60">
                    <span className="text-xs font-bold uppercase text-gray-400 py-1">Popular:</span>
                    {SUBJECTS.filter(s => !userProfile.enrolledCourses.includes(s)).map(s => (
                        <span 
                            key={s} 
                            onClick={() => {
                                setNewCourseInput(s);
                                setCourseError('');
                            }}
                            className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-md font-bold cursor-pointer hover:bg-gray-300 transition-colors"
                        >
                            {s}
                        </span>
                    ))}
                </div>

                <button 
                    onClick={handleValidateAndAddCourse}
                    disabled={isCheckingCourse || !newCourseInput.trim()}
                    className="w-full btn-push bg-[#58cc02] border-[#46a302] border-b-4 hover:bg-[#61e002] active:border-b-0 text-white font-extrabold px-8 py-3 rounded-2xl uppercase tracking-widest text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCheckingCourse ? "Checking..." : "Add to Dashboard"}
                </button>

            </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isProfileModalOpen && editingProfile && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 border-b-4 border-gray-200 animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-extrabold text-gray-700">Your Profile</h2>
                    <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
                </div>
                
                <div className="overflow-y-auto px-1 scrollbar-hide space-y-4">
                    {/* Image Editor */}
                    <div className="flex justify-center">
                         <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-28 h-28 rounded-3xl bg-gray-100 border-4 border-[#1cb0f6] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden group"
                        >
                            {editingProfile.avatarImage ? (
                                <img src={editingProfile.avatarImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl text-gray-300 font-bold">{editingProfile.name.charAt(0)}</span>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold uppercase">Change</span>
                            </div>
                         </div>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleProfileImageUpload} 
                            className="hidden" 
                            accept="image/*"
                         />
                    </div>

                    {/* Stats */}
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-3 flex justify-around items-center">
                        <div className="text-center">
                            <div className="text-2xl">🔥</div>
                            <div className="text-xs font-bold text-yellow-700 uppercase">Streak</div>
                            <div className="text-xl font-extrabold text-yellow-600">{editingProfile.streak}</div>
                        </div>
                        <div className="w-px h-10 bg-yellow-200"></div>
                        <div className="text-center">
                            <div className="text-2xl">📚</div>
                            <div className="text-xs font-bold text-yellow-700 uppercase">Courses</div>
                            <div className="text-xl font-extrabold text-yellow-600">{editingProfile.enrolledCourses.length}</div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Name</label>
                            <input
                                type="text"
                                value={editingProfile.name}
                                onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                                className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:border-[#1cb0f6] focus:bg-white"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1/3">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Age</label>
                                <input
                                    type="number"
                                    value={editingProfile.age}
                                    onChange={(e) => setEditingProfile({...editingProfile, age: e.target.value})}
                                    className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:border-[#1cb0f6] focus:bg-white text-center"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Grade</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['6', '7', '8', '9'].map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setEditingProfile({...editingProfile, grade: g})}
                                            className={`rounded-lg border-b-2 font-bold text-sm py-2 transition-all
                                                ${editingProfile.grade === g 
                                                    ? 'bg-[#1cb0f6] border-[#1499d6] text-white' 
                                                    : 'bg-white border-gray-200 text-gray-400'
                                                }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <button 
                        onClick={saveProfileChanges}
                        className="w-full btn-push bg-[#58cc02] border-[#46a302] border-b-4 hover:bg-[#61e002] active:border-b-0 text-white font-extrabold px-6 py-3 rounded-2xl uppercase tracking-widest"
                    >
                        Save Changes
                    </button>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full text-red-400 hover:text-red-500 hover:bg-red-50 font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-colors"
                    >
                        Log Out
                    </button>
                </div>

            </div>
        </div>
      )}
    </div>
  );
};

export default App;