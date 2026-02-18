
import React, { useState, useEffect } from 'react';
import { HealthGoal, UserStats, DailyLog, AppState, FoodEntry } from './types';
import Dashboard from './components/Dashboard';
import Logs from './components/Logs';
import Coach from './components/Coach';
import Profile from './components/Profile';
import Diagnosis from './components/Diagnosis';
import DoctorNewsBar from './components/DoctorNewsBar';
import { supabase, GUEST_ID } from './supabaseClient';
import { LayoutDashboard, ClipboardList, MessageSquare, UserCircle, Activity, ShieldCheck, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'diagnosis' | 'coach' | 'profile'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>({
    user: {
      name: 'Guest User',
      age: 28,
      weight: 75,
      heightFeet: 5,
      heightInches: 9,
      gender: 'male',
      goal: HealthGoal.WeightLoss
    },
    logs: []
  });

  // Load Initial Data from Supabase or Fallback to LocalStorage
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fallback logic if Supabase is not configured
        if (!supabase) {
          console.warn('Supabase not configured. Falling back to local storage.');
          const saved = localStorage.getItem('amar_health_state');
          if (saved) {
            setState(JSON.parse(saved));
          }
          setLoading(false);
          return;
        }

        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', GUEST_ID)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        // 2. Fetch Logs
        const { data: logData, error: logError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('profile_id', GUEST_ID);

        if (logError) {
          console.error('Error fetching logs:', logError);
        }

        setState({
          user: profileData ? {
            name: profileData.name,
            age: profileData.age,
            weight: profileData.weight,
            heightFeet: profileData.height_feet,
            heightInches: profileData.height_inches,
            gender: profileData.gender,
            goal: profileData.goal as HealthGoal
          } : state.user,
          logs: logData ? logData.map(l => ({
            date: l.date,
            food: l.food || [],
            exercise: l.exercise || [],
            hydration: l.hydration || 0,
            sleepHours: l.sleep_hours || 0,
            sedentaryHours: l.sedentary_hours || 0
          })) : []
        });
      } catch (err) {
        console.error('Data Sync Failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Persist to LocalStorage as a secondary backup and for non-Supabase environments
  useEffect(() => {
    localStorage.setItem('amar_health_state', JSON.stringify(state));
  }, [state]);

  const updateUser = async (newStats: UserStats) => {
    setState(prev => ({ ...prev, user: newStats }));
    
    if (supabase) {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: GUEST_ID,
          name: newStats.name,
          age: newStats.age,
          weight: newStats.weight,
          height_feet: newStats.heightFeet,
          height_inches: newStats.heightInches,
          gender: newStats.gender,
          goal: newStats.goal,
          updated_at: new Date()
        });
      if (error) console.error('Error updating profile in Supabase:', error);
    }
  };

  const updateLogs = async (newLogs: DailyLog[]) => {
    setState(prev => ({ ...prev, logs: newLogs }));

    if (supabase) {
      for (const log of newLogs) {
        const { error } = await supabase
          .from('daily_logs')
          .upsert({
            profile_id: GUEST_ID,
            date: log.date,
            food: log.food,
            exercise: log.exercise,
            hydration: log.hydration,
            sleep_hours: log.sleepHours,
            sedentary_hours: log.sedentaryHours
          }, { onConflict: 'profile_id, date' });
        
        if (error) console.error('Error syncing log to Supabase:', error);
      }
    }
  };

  const addFoodToToday = async (food: Omit<FoodEntry, 'id' | 'timestamp'>) => {
    const today = new Date().toISOString().split('T')[0];
    const logIndex = state.logs.findIndex(l => l.date === today);
    let updatedLog: DailyLog;
    
    const entry: FoodEntry = { ...food, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() };

    if (logIndex >= 0) {
      updatedLog = { ...state.logs[logIndex], food: [...state.logs[logIndex].food, entry] };
    } else {
      updatedLog = { date: today, food: [entry], exercise: [], hydration: 0, sleepHours: 0, sedentaryHours: 0 };
    }

    const newLogs = [...state.logs];
    if (logIndex >= 0) newLogs[logIndex] = updatedLog;
    else newLogs.push(updatedLog);
    setState(prev => ({ ...prev, logs: newLogs }));

    if (supabase) {
      const { error } = await supabase
        .from('daily_logs')
        .upsert({
          profile_id: GUEST_ID,
          date: updatedLog.date,
          food: updatedLog.food,
          exercise: updatedLog.exercise,
          hydration: updatedLog.hydration,
          sleep_hours: updatedLog.sleepHours,
          sedentary_hours: updatedLog.sedentaryHours
        }, { onConflict: 'profile_id, date' });

      if (error) console.error('Error syncing new food to Supabase:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Syncing Health Data...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard state={state} />;
      case 'logs':
        return <Logs state={state} updateLogs={updateLogs} />;
      case 'diagnosis':
        return <Diagnosis state={state} onAddFood={addFoodToToday} />;
      case 'coach':
        return <Coach state={state} />;
      case 'profile':
        return <Profile stats={state.user} updateStats={updateUser} />;
      default:
        return <Dashboard state={state} />;
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 flex flex-col bg-slate-50">
      <DoctorNewsBar />
      
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <Activity className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Amar Health</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'diagnosis'} onClick={() => setActiveTab('diagnosis')} icon={<ShieldCheck size={20} />} label="Food Diagnosis" />
          <NavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<ClipboardList size={20} />} label="Daily Logs" />
          <NavItem active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} icon={<MessageSquare size={20} />} label="AI Coach" />
          <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircle size={20} />} label="Profile" />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
              {state.user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{state.user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{state.user.goal.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-40">
        <div className="flex items-center gap-2">
           <Activity className="text-emerald-500" size={24} />
           <span className="font-bold text-slate-900">Amar Health</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
          {state.user.name.charAt(0)}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {renderContent()}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 z-50">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} />
        <MobileNavItem active={activeTab === 'diagnosis'} onClick={() => setActiveTab('diagnosis')} icon={<ShieldCheck size={24} />} />
        <MobileNavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<ClipboardList size={24} />} />
        <MobileNavItem active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} icon={<MessageSquare size={24} />} />
        <MobileNavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircle size={24} />} />
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button onClick={onClick} className={`p-2 rounded-xl transition-all ${active ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400'}`}>
    {icon}
  </button>
);

export default App;
