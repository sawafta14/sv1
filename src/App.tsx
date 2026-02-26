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
import socket from './socket';
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
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('room_created', (newRoom: Room) => {
      setRoom(newRoom);
      setIsJudge(true);
      setError('');
    });

    socket.on('room_updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('game_started', (startedRoom: Room) => {
      setRoom(startedRoom);
    });

    socket.on('new_log', (log: LogEntry) => {
      setRoom(prev => prev ? { ...prev, logs: [...prev.logs, log] } : null);
    });

    socket.on('objection_raised', ({ playerName }: { playerName: string }) => {
      setObjectionActive(playerName);
      setTimeout(() => setObjectionActive(null), 3000);
    });

    socket.on('error', (msg: string) => {
      setError(msg);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('new_log');
      socket.off('objection_raised');
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [room?.logs]);

  const createRoom = () => {
    if (!playerName || !password) return setError('يرجى إدخال الاسم وكلمة المرور');
    socket.emit('create_room', { playerName, password });
  };

  const joinRoom = () => {
    if (!playerName || !roomId) return setError('يرجى إدخال الاسم ورقم الغرفة');
    socket.emit('join_room', { roomId, playerName });
  };

  const assignRole = (playerId: string, role: Role) => {
    if (!room) return;
    const assignments = room.players.map(p => ({
      playerId: p.id,
      role: p.id === playerId ? role : p.role
    }));
    socket.emit('assign_roles', { roomId: room.id, assignments });
  };

  const startGame = (selectedCase: Case) => {
    if (!room) return;
    socket.emit('start_game', { roomId: room.id, selectedCase });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !room) return;
    socket.emit('send_message', { roomId: room.id, message });
    setMessage('');
  };

  const raiseObjection = () => {
    if (!room) return;
    socket.emit('objection', { roomId: room.id });
    socket.emit('send_message', { roomId: room.id, message: 'اعتراض!', type: 'objection' });
  };

  const judgeDecision = (decision: 'sustained' | 'overruled') => {
    if (!room) return;
    const text = decision === 'sustained' ? 'تم قبول الاعتراض (Sustained)' : 'تم رفض الاعتراض (Overruled)';
    socket.emit('judge_decision', { roomId: room.id, decision });
    socket.emit('send_message', { roomId: room.id, message: text, type: 'decision' });
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
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
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
                    className="w-full bg-black/40 border border-white/5 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder="أدخل كلمة المرور..."
                  />
                </div>
                <button 
                  onClick={createRoom}
                  className="w-full mt-6 bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20"
                >
                  بدء جلسة جديدة
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 mr-1">رقم الغرفة</label>
                <input 
                  type="text" 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all uppercase"
                  placeholder="أدخل الكود..."
                />
                <button 
                  onClick={joinRoom}
                  className="w-full mt-6 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  دخول المحكمة
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

  const currentPlayer = room.players.find(p => p.id === socket.id);

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
                      <p className="text-sm font-medium text-white">{p.name} {p.id === socket.id && "(أنت)"}</p>
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
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all pr-12"
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
