import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gavel, 
  Users, 
  Shield, 
  Scale, 
  FileText, 
  MessageSquare, 
  AlertTriangle,
  Send,
  UserPlus,
  Lock,
  LogOut,
  Mic,
  Eye,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set, push, update, onDisconnect, get } from 'firebase/database';
import { Room, Player, Role, CASES, Case, LogEntry } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [objectionActive, setObjectionActive] = useState<string | null>(null);
  const [isJudge, setIsJudge] = useState(false);
  const [playerId, setPlayerId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a unique player ID if not exists
    const storedId = localStorage.getItem('verdict_player_id') || Math.random().toString(36).substring(2, 15);
    localStorage.setItem('verdict_player_id', storedId);
    setPlayerId(storedId);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert players object to array
        const playersArray = data.players ? Object.values(data.players) as Player[] : [];
        const logsArray = data.logs ? Object.values(data.logs) as LogEntry[] : [];
        
        setRoom({
          ...data,
          players: playersArray,
          logs: logsArray
        });

        // Check for active objection
        if (data.activeObjection) {
          setObjectionActive(data.activeObjection.playerName);
          setTimeout(() => {
            update(ref(db, `rooms/${roomId}`), { activeObjection: null });
          }, 3000);
        }
      } else {
        setRoom(null);
        if (roomId) setError('الغرفة غير موجودة');
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [room?.logs]);

  const createRoom = async () => {
    if (!playerName || !password) return setError('يرجى إدخال الاسم وكلمة المرور');
    if (password !== 'svoo') return setError('كلمة مرور القاضي غير صحيحة');
    if (!playerId) return setError('جاري تهيئة معرف اللاعب، يرجى المحاولة مرة أخرى');

    setLoading(true);
    setError('');

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom = {
      id: newRoomId,
      judgeId: playerId,
      status: 'lobby',
      currentCase: null,
      phase: 'waiting',
      players: {
        [playerId]: { id: playerId, name: playerName, role: 'judge' }
      },
      logs: {} // Initialize logs
    };

    try {
      const roomRef = ref(db, `rooms/${newRoomId}`);
      await set(roomRef, newRoom);
      
      // Handle disconnect
      onDisconnect(ref(db, `rooms/${newRoomId}/players/${playerId}`)).remove();
      
      setRoomId(newRoomId);
      setIsJudge(true);
    } catch (err: any) {
      console.error("Firebase Error:", err);
      if (err.message?.includes('permission_denied')) {
        setError('خطأ في الصلاحيات: يرجى التأكد من ضبط قواعد Firebase (Rules) لتسمح بالقراءة والكتابة.');
      } else {
        setError('فشل إنشاء الغرفة: ' + (err.message || 'خطأ غير معروف'));
      }
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName || !roomId) return setError('يرجى إدخال الاسم ورقم الغرفة');
    if (!playerId) return setError('جاري تهيئة معرف اللاعب، يرجى المحاولة مرة أخرى');

    setLoading(true);
    setError('');
    const upperRoomId = roomId.toUpperCase();
    
    try {
      const snapshot = await get(ref(db, `rooms/${upperRoomId}`));
      if (!snapshot.exists()) {
        setLoading(false);
        return setError('الغرفة غير موجودة');
      }
      
      const roomData = snapshot.val();
      const players = roomData.players || {};
      
      if (Object.keys(players).length >= 12) {
        setLoading(false);
        return setError('الغرفة ممتلئة');
      }

      await set(ref(db, `rooms/${upperRoomId}/players/${playerId}`), {
        id: playerId,
        name: playerName,
        role: 'unassigned'
      });

      // Handle disconnect
      onDisconnect(ref(db, `rooms/${upperRoomId}/players/${playerId}`)).remove();
      
      setRoomId(upperRoomId);
    } catch (err: any) {
      console.error("Firebase Error:", err);
      if (err.message?.includes('permission_denied')) {
        setError('خطأ في الصلاحيات: يرجى التأكد من ضبط قواعد Firebase (Rules) لتسمح بالقراءة والكتابة.');
      } else {
        setError('فشل الانضمام للغرفة: ' + (err.message || 'خطأ غير معروف'));
      }
    } finally {
      setLoading(false);
    }
  };

  const assignRole = (targetPlayerId: string, role: Role) => {
    if (!room || !roomId) return;
    update(ref(db, `rooms/${roomId}/players/${targetPlayerId}`), { role });
  };

  const startGame = (selectedCase: Case) => {
    if (!room || !roomId) return;
    update(ref(db, `rooms/${roomId}`), {
      status: 'playing',
      currentCase: selectedCase,
      phase: 'opening_statements'
    });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !room || !roomId) return;
    
    const currentPlayer = room.players.find(p => p.id === playerId);
    if (!currentPlayer) return;

    const logRef = push(ref(db, `rooms/${roomId}/logs`));
    set(logRef, {
      id: Date.now(),
      sender: currentPlayer.name,
      role: currentPlayer.role,
      text: message,
      type: 'chat'
    });
    setMessage('');
  };

  const raiseObjection = () => {
    if (!room || !roomId) return;
    const currentPlayer = room.players.find(p => p.id === playerId);
    
    update(ref(db, `rooms/${roomId}`), {
      activeObjection: { playerName: currentPlayer?.name }
    });

    const logRef = push(ref(db, `rooms/${roomId}/logs`));
    set(logRef, {
      id: Date.now(),
      sender: currentPlayer?.name,
      role: currentPlayer?.role,
      text: 'اعتراض!',
      type: 'objection'
    });
  };

  const judgeDecision = (decision: 'sustained' | 'overruled') => {
    if (!room || !roomId) return;
    const text = decision === 'sustained' ? 'تم قبول الاعتراض (Sustained)' : 'تم رفض الاعتراض (Overruled)';
    
    const logRef = push(ref(db, `rooms/${roomId}/logs`));
    set(logRef, {
      id: Date.now(),
      sender: playerName,
      role: 'judge',
      text: text,
      type: 'decision'
    });
  };

  if (!room) {
    return (
      <div className="min-h-screen court-gradient flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
              <Scale className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">حُكم نهائي</h1>
            <p className="text-zinc-400 text-center">مرحباً بك في ساحة العدالة الرقمية</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 mr-1">اسم اللاعب</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-right"
                placeholder="أدخل اسمك..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsJudge(true)}
                className={cn(
                  "py-3 rounded-xl border transition-all flex flex-col items-center gap-2",
                  isJudge ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-black/20 border-white/5 text-zinc-500 hover:bg-black/40"
                )}
              >
                <Gavel className="w-5 h-5" />
                <span className="text-sm font-medium">إنشاء كقاضٍ</span>
              </button>
              <button 
                onClick={() => setIsJudge(false)}
                className={cn(
                  "py-3 rounded-xl border transition-all flex flex-col items-center gap-2",
                  !isJudge ? "bg-indigo-500/20 border-indigo-500 text-indigo-500" : "bg-black/20 border-white/5 text-zinc-500 hover:bg-black/40"
                )}
              >
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">انضمام كلاعب</span>
              </button>
            </div>

            {isJudge ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 mr-1">كلمة مرور القاضي</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-right"
                    placeholder="أدخل كلمة المرور..."
                  />
                </div>
                <button 
                  onClick={createRoom}
                  disabled={loading}
                  className="w-full mt-6 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? 'جاري البدء...' : 'بدء جلسة جديدة'}
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 mr-1">رقم الغرفة</label>
                <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all uppercase text-center font-mono tracking-widest"
                  placeholder="أدخل الكود..."
                />
                <button 
                  onClick={joinRoom}
                  disabled={loading}
                  className="w-full mt-6 bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? 'جاري الدخول...' : 'دخول المحكمة'}
                </button>
              </motion.div>
            )}

            {error && (
              <p className="text-red-400 text-sm text-center mt-4 bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                {error}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.id === playerId);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/20 p-2 rounded-lg">
            <Gavel className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white">حُكم نهائي</h2>
            <p className="text-xs text-zinc-500">غرفة: <span className="text-amber-500 font-mono">{room.id}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-zinc-300">{room.players.length} متصلين</span>
          </div>
          <button onClick={() => window.location.reload()} className="text-zinc-500 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Players & Roles */}
        <aside className="w-80 border-l border-white/5 bg-zinc-900/30 p-6 flex flex-col gap-6 shrink-0">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> أعضاء المحكمة
            </h3>
            <div className="space-y-3">
              {room.players.map((p) => (
                <div key={p.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      p.role === 'judge' ? "bg-amber-500 text-black" :
                      p.role === 'prosecutor' ? "bg-red-500 text-white" :
                      p.role === 'defense' ? "bg-blue-500 text-white" :
                      "bg-zinc-800 text-zinc-400"
                    )}>
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.name} {p.id === playerId && "(أنت)"}</p>
                      <p className="text-[10px] uppercase tracking-tighter text-zinc-500">{p.role}</p>
                    </div>
                  </div>
                  
                  {currentPlayer?.role === 'judge' && p.role !== 'judge' && (
                    <select 
                      onChange={(e) => assignRole(p.id, e.target.value as Role)}
                      className="opacity-0 group-hover:opacity-100 bg-zinc-800 text-[10px] rounded px-1 py-0.5 focus:opacity-100 transition-opacity"
                      value={p.role}
                    >
                      <option value="unassigned">بدون دور</option>
                      <option value="prosecutor">مدعي عام</option>
                      <option value="defense">محامي دفاع</option>
                      <option value="defendant">متهم</option>
                      <option value="witness">شاهد</option>
                      <option value="jury">محلف</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {room.status === 'lobby' && currentPlayer?.role === 'judge' && (
            <div className="mt-auto">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">اختر القضية</h3>
              <div className="space-y-2">
                {CASES.map((c) => (
                  <button 
                    key={c.id}
                    onClick={() => startGame(c)}
                    className="w-full text-right p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all group"
                  >
                    <p className="text-sm font-bold text-white group-hover:text-amber-500">{c.title}</p>
                    <p className="text-[10px] text-zinc-500 line-clamp-1">{c.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Courtroom Area */}
        <section className="flex-1 flex flex-col relative">
          {/* Objection Overlay */}
          <AnimatePresence>
            {objectionActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-red-600 text-white px-12 py-6 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.5)] border-4 border-white flex flex-col items-center gap-2">
                  <AlertTriangle className="w-16 h-16 animate-bounce" />
                  <h2 className="text-6xl font-display font-black italic tracking-tighter">اعتراض!</h2>
                  <p className="text-xl font-bold uppercase">{objectionActive}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {room.status === 'lobby' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center mb-8 border border-white/5">
                <Users className="w-16 h-16 text-zinc-700" />
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-4">في انتظار بدء الجلسة</h2>
              <p className="text-zinc-500 max-w-md">
                {currentPlayer?.role === 'judge' 
                  ? "قم بتوزيع الأدوار على اللاعبين ثم اختر قضية لبدء المحاكمة."
                  : "انتظر حتى يقوم القاضي بتعيين الأدوار وبدء الجلسة."}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Case Info Bar */}
              <div className="bg-amber-500/5 border-b border-amber-500/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-white">{room.currentCase?.title}</h3>
                </div>
                <div className="flex gap-2">
                  {currentPlayer?.role === 'judge' && (
                    <>
                      <button 
                        onClick={() => judgeDecision('sustained')}
                        className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" /> قبول الاعتراض
                      </button>
                      <button 
                        onClick={() => judgeDecision('overruled')}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                      >
                        <XCircle className="w-4 h-4" /> رفض الاعتراض
                      </button>
                    </>
                  )}
                  {['prosecutor', 'defense'].includes(currentPlayer?.role || '') && (
                    <button 
                      onClick={raiseObjection}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
                    >
                      <AlertTriangle className="w-4 h-4" /> اعتراض!
                    </button>
                  )}
                </div>
              </div>

              {/* Logs / Chat */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
                {room.logs.map((log) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id} 
                    className={cn(
                      "max-w-[80%] p-4 rounded-2xl",
                      log.type === 'objection' ? "bg-red-500/20 border border-red-500/30 mr-auto ml-auto w-full text-center" :
                      log.type === 'decision' ? "bg-amber-500/20 border border-amber-500/30 mr-auto ml-auto w-full text-center" :
                      log.role === 'judge' ? "bg-amber-500/10 border-r-4 border-amber-500" :
                      log.role === 'prosecutor' ? "bg-red-500/10 border-r-4 border-red-500" :
                      log.role === 'defense' ? "bg-blue-500/10 border-r-4 border-blue-500" :
                      "bg-zinc-900 border border-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                        log.role === 'judge' ? "bg-amber-500 text-black" :
                        log.role === 'prosecutor' ? "bg-red-500 text-white" :
                        log.role === 'defense' ? "bg-blue-500 text-white" :
                        "bg-zinc-800 text-zinc-400"
                      )}>
                        {log.role}
                      </span>
                      <span className="text-xs font-bold text-white">{log.sender}</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{log.text}</p>
                  </motion.div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-6 bg-zinc-900/50 border-t border-white/5">
                <form onSubmit={sendMessage} className="flex gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="تحدث أمام المحكمة..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all pr-12 text-right"
                    />
                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                  <button 
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-black p-4 rounded-2xl transition-all shadow-lg shadow-amber-500/20"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>

        {/* Evidence Panel */}
        <aside className="w-80 border-r border-white/5 bg-zinc-900/30 p-6 flex flex-col gap-6 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> ملف الأدلة
          </h3>
          
          {room.currentCase ? (
            <div className="space-y-4">
              {room.currentCase.evidence.map((e) => (
                <div key={e.id} className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-amber-500 transition-colors">
                      {e.type === 'document' ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                    <h4 className="text-sm font-bold text-white">{e.title}</h4>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{e.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
              <FileText className="w-12 h-12 mb-4" />
              <p className="text-xs">لا توجد أدلة معروضة حالياً</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
