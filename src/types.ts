export type Role = 'judge' | 'prosecutor' | 'defense' | 'defendant' | 'witness' | 'jury' | 'unassigned';

export interface Player {
  id: string;
  name: string;
  role: Role;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  evidence: Evidence[];
  witnesses: string[];
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'audio' | 'video' | 'photo';
}

export interface Room {
  id: string;
  judgeId: string;
  players: Player[];
  status: 'lobby' | 'playing';
  currentCase: Case | null;
  phase: string;
  logs: LogEntry[];
}

export interface LogEntry {
  id: number;
  sender: string;
  role: Role;
  text: string;
  type: 'chat' | 'action' | 'objection' | 'decision';
}

export const CASES: Case[] = [
  {
    id: 'corruption-001',
    title: 'قضية الفساد الحكومي الكبرى',
    description: 'تورط مسؤولين كبار في صفقات غير قانونية وتضارب مصالح ضخم أدى لضياع أموال عامة.',
    witnesses: ['المحاسب القانوني', 'السكرتير الخاص', 'مخبر سري'],
    evidence: [
      { id: 'e1', title: 'كشف حساب بنكي', description: 'تحويلات مشبوهة إلى حسابات خارجية.', type: 'document' },
      { id: 'e2', title: 'تسجيل صوتي', description: 'مكالمة مسربة تناقش تقسيم العمولات.', type: 'audio' }
    ]
  },
  {
    id: 'murder-002',
    title: 'جريمة القتل في القصر المهجور',
    description: 'تم العثور على رجل أعمال مقتولاً في مكتبه داخل قصره. جميع الأدلة تشير إلى شخص مقرب، لكن الحقيقة قد تكون أغرب.',
    witnesses: ['رئيس الخدم', 'الزوجة', 'البستاني'],
    evidence: [
      { id: 'e3', title: 'سلاح الجريمة', description: 'سكين مطبخ عليه بصمات غير واضحة.', type: 'photo' },
      { id: 'e4', title: 'رسالة تهديد', description: 'رسالة مكتوبة بخط اليد وجدت في سلة المهملات.', type: 'document' }
    ]
  },
  {
    id: 'theft-003',
    title: 'سرقة الماس الإمبراطوري',
    description: 'اختفاء أكبر ماسة في العالم من المتحف الوطني رغم وجود أحدث أنظمة الأمان. هل هي عملية داخلية؟',
    witnesses: ['حارس الأمن', 'مدير المتحف', 'خبير أنظمة الأمان'],
    evidence: [
      { id: 'e5', title: 'فيديو المراقبة', description: 'تعطل الكاميرات لمدة 30 ثانية في وقت السرقة.', type: 'video' },
      { id: 'e6', title: 'بصمة مجهولة', description: 'بصمة وجدت على صندوق العرض الزجاجي.', type: 'photo' }
    ]
  },
  {
    id: 'medical-004',
    title: 'قضية الخطأ الطبي القاتل',
    description: 'وفاة مريض شاب بعد عملية جراحية بسيطة. هل هو إهمال من الطبيب أم خلل في أجهزة المستشفى؟',
    witnesses: ['الممرضة المناوبة', 'الطبيب الجراح', 'مدير المستشفى'],
    evidence: [
      { id: 'e7', title: 'التقرير الطبي', description: 'تناقض في جرعات التخدير المسجلة.', type: 'document' },
      { id: 'e8', title: 'تسجيل الكاميرا', description: 'دخول شخص غير مصرح له لغرفة العمليات.', type: 'video' }
    ]
  }
];
