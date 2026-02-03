import React, { useState } from 'react';
import { Task, AvatarMood } from '../types';

interface TaskPanelProps {
  onMoodChange: (mood: AvatarMood) => void;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ onMoodChange }) => {
  // Start with an empty list instead of fake data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isCompleting = !t.completed;
        if (isCompleting) {
            onMoodChange(AvatarMood.SUCCESS);
            setTimeout(() => onMoodChange(AvatarMood.IDLE), 3000);
        }
        return { ...t, completed: isCompleting };
      }
      return t;
    }));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks(prev => [...prev, { id: Date.now().toString(), text: newTaskText, completed: false }]);
    setNewTaskText('');
  };

  return (
    <div className="h-full bg-white border-2 border-gray-200 rounded-3xl overflow-hidden flex flex-col">
      <div className="p-4 border-b-2 border-gray-100 bg-white flex justify-between items-center">
        <h2 className="text-lg font-extrabold text-gray-400 uppercase tracking-wider">Your Quests</h2>
        <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-xl text-yellow-600 font-bold">
           <span>👑</span>
           <span>{tasks.filter(t => t.completed).length} / {tasks.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 font-bold text-center p-6 animate-pulse">
                <div className="text-5xl mb-3 grayscale opacity-50">📜</div>
                <p>Your quest log is empty!</p>
                <p className="text-sm font-normal mt-1">Add a study goal below to begin.</p>
            </div>
        )}
        {tasks.map((task) => (
          <div 
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`btn-push cursor-pointer p-4 rounded-2xl border-2 border-b-4 flex items-center gap-4 transition-all
              ${task.completed 
                ? 'bg-[#ffc800] border-[#e5b400] text-white' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors
                ${task.completed ? 'bg-white border-transparent' : 'border-gray-300'}
            `}>
                {task.completed && (
                    <span className="text-[#ffc800] font-bold text-sm">✓</span>
                )}
            </div>
            <span className={`font-bold text-lg ${task.completed ? 'text-white' : 'text-gray-700'}`}>
                {task.text}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={addTask} className="p-4 bg-white border-t-2 border-gray-100">
        <div className="flex gap-2">
            <input 
                type="text" 
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add new quest..."
                className="flex-1 bg-gray-100 border-2 border-gray-200 rounded-xl px-4 py-2 text-gray-700 font-bold focus:border-[#1cb0f6] focus:outline-none focus:bg-white"
            />
            <button type="submit" className="btn-push bg-[#1cb0f6] border-[#1499d6] border-b-4 active:border-b-0 hover:bg-[#3dd2ff] text-white px-4 rounded-xl text-xl font-bold transition-all pb-1">
                +
            </button>
        </div>
      </form>
    </div>
  );
};

export default TaskPanel;