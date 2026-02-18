import React, { useState, useEffect, useCallback } from 'react';
import { HealthGoal, UserStats, DailyLog, AppState, FoodEntry } from './types';
import Dashboard from './components/Dashboard';
import Logs from './components/Logs';
import Coach from './components/Coach';
import Profile from './components/Profile';
import Diagnosis from './components/Diagnosis';
import DoctorNewsBar from './components/DoctorNewsBar';
import { supabase, GUEST_ID } from './supabaseClient';
import { LayoutDashboard, ClipboardList, MessageSquare, UserCircle, Activity, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'diagnosis' | 'coach' | 'profile'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Supabase client not configured');
      }

      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', GUEST_ID)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Fetch Logs
      const { data: logData, error: logError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('profile_id', GUEST_ID);

      if (logError) throw logError;

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
    } catch (err: any) {
      console.error('Data Sync Failed:', err);
      setError(supabase ? 'Could not sync with database.' : 'Cloud sync disabled. Using local storage.');
      const saved = localStorage.getItem('amar_health_state');
      if (saved) setState(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync to localStorage as a fallback
  useEffect(() => {
    localStorage.setItem('amar_health_state', JSON.stringify(state));
  }, [state]);

  const updateUser = async (newStats: UserStats) => {
    setState(prev => ({ ...prev, user: newStats }));
    if (!supabase) return;
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: GUEST_ID,
        name: newStats.name,
        age: newStats.age,
        weight: newStats.weight,
        height_feet: newStats.heightFeet,
        height_inches: newStats.heightInches,
        gender: newStats.gender,
        goal: newStats.goal,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    } catch (err) {
      console.error('Profile update failed:', err);
      setError('Failed to save profile. Changes saved locally.');
    }
  };

  const updateLogs = async (newLogs: DailyLog[]) => {
    setState(prev => ({ ...prev, logs: newLogs }));
    if (!supabase) return;
    try {
      for (const log of newLogs) {
        const { error } = await supabase.from('daily_logs').upsert({
          profile_id: GUEST_ID,
          date: log.date,
          food: log.food,
          exercise: log.exercise,
          hydration: log.hydration,
          sleep_hours: log.sleepHours,
          sedentary_hours: log.sedentaryHours
        }, { onConflict: 'profile_id, date' });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Log update failed:', err);
      setError('Failed to sync logs. Changes saved locally.');
    }
  };

  const addFoodToToday = (food: Omit<FoodEntry, 'id' | 'timestamp'>) => {
    const today = new Date().toISOString().split('T')[0];
    const logIndex = state.logs.findIndex(l => l.date === today);
    const entry: FoodEntry = { ...food, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() };

    let updatedLogs = [...state.logs];
    if (logIndex >= 0) {
      updatedLogs[logIndex] = { ...updatedLogs[logIndex], food: [...updatedLogs[logIndex].food, entry] };
    } else {
      updatedLogs.push({ date: today, food: [entry], exercise: [], hydration: 0, sleepHours: 0, sedentaryHours: 0 });
    }
    updateLogs(updatedLogs);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-emerald-500" size={48} />
      <p className="text-slate-500 font-medium">Synchronizing Health Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 flex flex-col bg-slate-50">
      <DoctorNewsBar />
      
      {error && (
        <div className="bg-amber-50 border-b border-amber-100 p-2 flex items-center justify-center gap-2 text-xs font-medium text-amber-700">
          <AlertCircle size={14} /> {error}
          {supabase && <button onClick={() => fetchData()} className="underline ml-2">Retry Sync</button>}
        </div>
      )}

      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex-col p-6 z-50 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-emerald-500 rounded-xl">
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
        
        <div className="mt-auto p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${supabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
             <span className="text-xs font-bold text-slate-300">{supabase ? 'Cloud Sync Active' : 'Offline Mode'}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {activeTab === 'dashboard' && <Dashboard state={state} />}
        {activeTab === 'logs' && <Logs state={state} updateLogs={updateLogs} />}
        {activeTab === 'diagnosis' && <Diagnosis state={state} onAddFood={addFoodToToday} />}
        {activeTab === 'coach' && <Coach state={state} />}
        {activeTab === 'profile' && <Profile stats={state.user} updateStats={updateUser} />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t flex justify-around p-4 z-50">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} />
        <MobileNavItem active={activeTab === 'diagnosis'} onClick={() => setActiveTab('diagnosis')} icon={<ShieldCheck size={24} />} />
        <MobileNavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<ClipboardList size={24} />} />
        <MobileNavItem active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} icon={<MessageSquare size={24} />} />
        <MobileNavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircle size={24} />} />
      </nav>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
    {icon} <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-2 rounded-2xl transition-all duration-300 ${active ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400'}`}>
    {icon}
  </button>
);

export default App;
