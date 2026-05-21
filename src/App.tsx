import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  HeartPulse, 
  Landmark, 
  Building2, 
  Briefcase, 
  Phone, 
  Mail, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Projector, 
  Lock, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight,
  ActivitySquare,
  BarChart3,
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';
import pb, { authenticate } from './lib/pocketbase';

type Categoria = 'Direção e Corpo Técnico' | 'Linhas de Cuidado e Áreas Técnicas' | 'Apoio Operacional e Administrativo';

interface Profissional {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  categoria: Categoria;
  funcao?: string;
  linhaCuidado?: string;
}

const collectionName = import.meta.env.VITE_POCKETBASE_COLLECTION || 'profissionais_daps';

export default function App() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Profissional | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'openAdd' | 'openEdit' | 'save' | 'delete', id?: string, data?: Profissional } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [presentationStep, setPresentationStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Swipe logic
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setPresentationStep(prev => Math.min(5, prev + 1));
    } else if (isRightSwipe) {
      setPresentationStep(prev => Math.max(1, prev - 1));
    }
  };

  // Form states
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('Direção e Corpo Técnico');
  const [funcao, setFuncao] = useState('');
  const [linhaCuidado, setLinhaCuidado] = useState('');

  // Keyboard Navigation for Presentation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (presentationStep === 0) return;

      if (e.key === 'ArrowRight') {
        setPresentationStep(prev => Math.min(5, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setPresentationStep(prev => Math.max(1, prev - 1));
      } else if (e.key === 'Escape') {
        setPresentationStep(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationStep]);

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await authenticate();
      const records = await pb.collection(collectionName).getFullList<Profissional>({
        sort: 'nome',
        requestKey: 'loadData'
      });
      setProfissionais(records);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setPendingAction({ type: 'openAdd' });
    setIsPasswordModalOpen(true);
  };

  const handleOpenEditModal = (p: Profissional) => {
    setPendingAction({ type: 'openEdit', data: p });
    setIsPasswordModalOpen(true);
  };

  const executeSave = async () => {
    const data = {
      categoria,
      nome,
      telefone,
      email,
      ...(categoria === 'Linhas de Cuidado e Áreas Técnicas' ? { linhaCuidado, funcao: '' } : { funcao, linhaCuidado: '' })
    };

    try {
      if (editingId) {
        await pb.collection(collectionName).update(editingId, data);
      } else {
        await pb.collection(collectionName).create(data);
      }
      await loadData();
      setIsModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Erro ao salvar. Verifique se a coleção existe.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    await executeSave();
  };

  const handleDeleteClick = (p: Profissional) => {
    setItemToDelete(p);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setPendingAction({ type: 'delete', id: itemToDelete.id });
    setIsDeleteConfirmOpen(false);
    setIsPasswordModalOpen(true);
  };

  const executePendingAction = async () => {
    if (passwordInput.trim() !== 'daps2022') {
      setPasswordError(true);
      return;
    }

    setPasswordError(false);
    setIsProcessingAction(true);

    try {
      if (pendingAction?.type === 'openAdd') {
        setEditingId(null);
        setCategoria('Direção e Corpo Técnico');
        setNome('');
        setTelefone('');
        setEmail('');
        setFuncao('');
        setLinhaCuidado('');
        setIsModalOpen(true);
      } else if (pendingAction?.type === 'openEdit' && pendingAction.data) {
        const p = pendingAction.data;
        setEditingId(p.id);
        setCategoria(p.categoria);
        setNome(p.nome);
        setTelefone(p.telefone);
        setEmail(p.email);
        setFuncao(p.funcao || '');
        setLinhaCuidado(p.linhaCuidado || '');
        setIsModalOpen(true);
      } else if (pendingAction?.type === 'save') {
        await executeSave();
      } else if (pendingAction?.type === 'delete' && pendingAction.id) {
        await pb.collection(collectionName).delete(pendingAction.id);
        await loadData();
      }
      
      setIsPasswordModalOpen(false);
      setPasswordInput('');
      setPendingAction(null);
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Erro na operação. Verifique a conexão com o banco de dados.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredProfissionais = profissionais.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.nome?.toLowerCase().includes(term)) ||
      (p.categoria?.toLowerCase().includes(term)) ||
      (p.funcao?.toLowerCase().includes(term)) ||
      (p.linhaCuidado?.toLowerCase().includes(term)) ||
      (p.email?.toLowerCase().includes(term))
    );
  });

  const direcao = filteredProfissionais
    .filter(p => p.categoria === 'Direção e Corpo Técnico')
    .sort((a, b) => {
      const nomeA = (a.nome || '').toLowerCase();
      const nomeB = (b.nome || '').toLowerCase();
      if (nomeA.includes('simere')) return -1;
      if (nomeB.includes('simere')) return 1;
      if (nomeA.includes('ana paula')) return 1;
      if (nomeB.includes('ana paula')) return -1;
      return 0;
    });
  const linhas = filteredProfissionais.filter(p => p.categoria === 'Linhas de Cuidado e Áreas Técnicas');
  const apoio = filteredProfissionais.filter(p => p.categoria === 'Apoio Operacional e Administrativo');

  // Agrupamento por Linha de Cuidado
  const linhasAgrupadas = linhas.reduce((acc, curr) => {
    const areas = curr.linhaCuidado ? curr.linhaCuidado.split(',').map(a => a.trim()).filter(Boolean) : ['Outros'];
    const emails = curr.email ? curr.email.split(',').map(e => e.trim()).filter(Boolean) : [];
    
    areas.forEach((area, index) => {
      if (!acc[area]) acc[area] = [];
      const emailCorrespondente = emails[index] || emails[0] || '';
      acc[area].push({ ...curr, email: emailCorrespondente });
    });
    return acc;
  }, {} as Record<string, Profissional[]>);

  const coresHarmonicas = [
    'from-cyan-400/20 to-transparent border-cyan-400/50 text-white',
    'from-indigo-400/20 to-transparent border-indigo-400/50 text-white',
    'from-emerald-400/20 to-transparent border-emerald-400/50 text-white',
    'from-sky-400/20 to-transparent border-sky-400/50 text-white',
    'from-violet-400/20 to-transparent border-violet-400/50 text-white',
  ];

  return (
    <div 
      className="flex flex-col min-h-screen text-on-surface bg-background font-sans selection:bg-secondary-fixed selection:text-on-secondary-fixed"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Premium Header */}
      <header className={`${presentationStep > 0 ? 'hidden' : 'flex'} sticky top-0 z-[100] bg-gradient-to-r from-[#001b3d] to-[#002b5c] border-b border-cyan-400/20 shadow-[0_4px_30px_rgba(0,0,0,0.3)] justify-between items-center w-full px-4 md:px-10 min-h-20 md:h-20 shrink-0 print:hidden overflow-hidden`}>
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        
        <div className="max-w-[1440px] mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 py-4 md:py-0">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center rounded-xl shadow-inner backdrop-blur-sm shrink-0">
              <ActivitySquare className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-black text-white leading-none tracking-widest drop-shadow-md uppercase">DAPS CAP5.3</h1>
              <span className="text-[8px] md:text-[10px] text-cyan-300/80 font-bold uppercase tracking-[0.2em] mt-1">Divisão de Ações e Programas de Saúde</span>
            </div>
          </div>

          {/* Search Bar no Header - Alinhada com a Coluna da Direita */}
          <div className="relative group w-full lg:w-[calc(33.333333%-21.333333px)] md:w-[320px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-cyan-300/40 group-focus-within:text-cyan-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar profissionais, áreas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 h-10 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/40 transition-all text-xs"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-cyan-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto w-full max-w-[1440px] mx-auto p-4 md:p-10 print-border">
          {isLoading && (
            <div className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-primary font-bold animate-pulse">Sincronizando com PocketBase...</p>
              </div>
            </div>
          )}
          {/* Mobile Buttons Layout (Apenas Mobile/Tablet) conforme imagem */}
          <div className="flex lg:hidden gap-4 mb-8 print:hidden">
            <button 
              className="flex-1 h-16 flex items-center justify-center rounded-2xl bg-[#001b3d] border border-cyan-400/20 text-white hover:bg-[#002b5c] hover:border-cyan-400/40 transition-all gap-2 group active:scale-[0.98] shadow-lg" 
              onClick={() => setPresentationStep(1)}
            >
              <Projector className="h-5 w-5 text-cyan-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Apresentação</span>
            </button>
            <button 
              className="flex-1 h-16 flex items-center justify-center rounded-2xl bg-[#001b3d] border border-cyan-400/20 text-white hover:bg-[#002b5c] hover:border-cyan-400/40 transition-all gap-2 group active:scale-[0.98] shadow-lg" 
              onClick={handleOpenAddModal}
            >
              <UserPlus className="h-5 w-5 text-cyan-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Novo Profissional</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Coluna Principal: Linhas de Cuidado (2 colunas de largura) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Linhas de Cuidado e Áreas Técnicas Agrupadas */}
              {Object.keys(linhasAgrupadas).length > 0 && (
                <section className="bg-gradient-to-br from-[#001b3d] to-[#002b5c] rounded-[32px] p-8 shadow-xl relative overflow-hidden print:bg-white print:text-black print:border print:border-gray-200 min-h-[600px]">
                  <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
                    <div className="h-12 w-12 md:h-16 md:w-16 shrink-0 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] print:bg-gray-100 print:text-black">
                      <HeartPulse className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight print:text-black uppercase border-b-2 border-cyan-400/50 pb-1 w-fit">Linhas de Cuidado e Áreas Técnicas</h3>
                      <p className="text-white/60 text-[10px] md:text-sm mt-1 uppercase tracking-widest font-bold">Distribuição por Área de Atuação</p>
                    </div>
                  </div>

                  <div className="space-y-12">
                    {Object.entries(linhasAgrupadas).map(([area, membros], index) => {
                      const colorClass = coresHarmonicas[index % coresHarmonicas.length];
                      return (
                        <div key={area} className="space-y-6">
                          <div className={`flex items-center gap-4 py-4 border-l-4 ${colorClass.split(' ')[2]} bg-gradient-to-r ${colorClass.split(' ').slice(0,2).join(' ')} pl-6 pr-10 shadow-xl backdrop-blur-md relative overflow-hidden group`}>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className={`h-3 w-3 bg-current shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse`} />
                            <h4 className="text-lg font-black uppercase tracking-[0.4em] leading-none text-white drop-shadow-md">{area}</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-2">
                            {membros.map(p => (
                              <div key={p.id} className="group bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/30 hover:bg-white/[0.08] transition-all hover:scale-[1.02] shadow-lg print:bg-white print:border-gray-300">
                                <div className="flex justify-between items-start mb-4">
                                  <h5 className="text-xl font-bold text-white group-hover:text-secondary transition-colors print:text-black">{p.nome}</h5>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                    <button onClick={() => handleOpenEditModal(p)} className="text-white/20 hover:text-cyan-400 transition-colors"><Edit className="h-5 w-5" /></button>
                                    <button onClick={() => handleDeleteClick(p)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="h-5 w-5" /></button>
                                  </div>
                                </div>
                                <div className="space-y-3 text-sm text-white/70 print:text-gray-700">
                                  {p.telefone && (
                                    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                                      <Phone className="h-4 w-4 text-secondary/60" /> 
                                      <span className="font-medium">{p.telefone}</span>
                                    </div>
                                  )}
                                  {p.email && (
                                    <div className="flex flex-col gap-1.5 px-2">
                                      {p.email.split(',').map((e, i) => e.trim() && (
                                        <div key={i} className="flex items-center gap-3">
                                          <Mail className="h-4 w-4 opacity-50 shrink-0" /> 
                                          <span className="truncate">{e.trim()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            <div className="lg:col-span-1 flex flex-col gap-8">
              {/* Controles: Botões conforme Imagem - Apenas Desktop */}
              <div className="hidden lg:flex flex-col gap-4 print:hidden">
                <div className="flex gap-4">
                  <button 
                    className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-[#001b3d] border border-cyan-400/20 text-white hover:bg-[#002b5c] hover:border-cyan-400/40 transition-all gap-2 group active:scale-[0.98] shadow-sm" 
                    onClick={() => setPresentationStep(1)}
                  >
                    <Projector className="h-5 w-5 text-cyan-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Apresentação</span>
                  </button>
                  <button 
                      className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-[#001b3d] border border-cyan-400/20 text-white hover:bg-[#002b5c] hover:border-cyan-400/40 transition-all gap-2 group active:scale-[0.98] shadow-sm" 
                      onClick={handleOpenAddModal}
                    >
                      <UserPlus className="h-5 w-5 text-cyan-400 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Novo Profissional</span>
                    </button>
                </div>
              </div>

              {direcao.length > 0 && (
                <section className="bg-gradient-to-br from-[#002b5c] to-[#001b3d] rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden border border-white/10 print:bg-white print:text-black print:border print:border-gray-200 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-colors" />
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="h-12 w-12 md:h-16 md:w-16 shrink-0 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] print:bg-gray-100 print:text-black">
                      <Landmark className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <h3 className="text-sm md:text-base font-black text-white tracking-widest print:text-black uppercase border-b-2 border-cyan-400/50 pb-1 w-fit">Direção e Corpo Técnico</h3>
                  </div>
                  <div className="space-y-4 relative z-10">
                    {direcao.map(p => (
                      <div key={p.id} className="bg-white/10 rounded-2xl p-5 border border-white/10 hover:border-cyan-400/40 hover:bg-white/15 transition-all shadow-lg backdrop-blur-lg print:bg-white print:border-gray-300">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-base font-bold text-white print:text-black">{p.nome}</h4>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                            <button onClick={() => handleOpenEditModal(p)} className="text-white/20 hover:text-cyan-400 transition-colors"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteClick(p)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="h-5 w-5" /></button>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-white/80 print:text-gray-700">
                          {p.funcao && (
                            <p className="flex items-center gap-2 font-black text-cyan-300 uppercase tracking-tighter bg-cyan-400/20 w-fit px-2 py-1 rounded-md border border-cyan-400/20 shadow-sm"><Briefcase className="h-3 w-3" /> {p.funcao}</p>
                          )}
                          <div className="flex flex-col gap-1.5 pt-1">
                            {p.telefone && (
                              <p className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"><Phone className="h-3 w-3 text-cyan-400/60 shrink-0" /> {p.telefone}</p>
                            )}
                            {p.email && p.email.split(',').map((e, i) => e.trim() && (
                              <p key={i} className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"><Mail className="h-3 w-3 text-cyan-400/60 shrink-0" /> <span className="truncate">{e.trim()}</span></p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {apoio.length > 0 && (
                <section className="bg-gradient-to-br from-[#002b5c] to-[#001b3d] rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden border border-white/10 print:bg-white print:text-black print:border print:border-gray-200 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-colors" />
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="h-12 w-12 md:h-16 md:w-16 shrink-0 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] print:bg-gray-100 print:text-black">
                      <Building2 className="h-6 w-6 md:h-8 md:w-8" />
                    </div>
                    <h3 className="text-sm md:text-base font-black text-white tracking-widest print:text-black uppercase border-b-2 border-cyan-400/50 pb-1 w-fit">Apoio Operacional e Administrativo</h3>
                  </div>
                  <div className="space-y-4 relative z-10">
                    {apoio.map(p => (
                      <div key={p.id} className="bg-white/10 rounded-2xl p-5 border border-white/10 hover:border-cyan-400/40 hover:bg-white/15 transition-all shadow-lg backdrop-blur-lg print:bg-white print:border-gray-300">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-base font-bold text-white print:text-black">{p.nome}</h4>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                            <button onClick={() => handleOpenEditModal(p)} className="text-white/20 hover:text-cyan-400 transition-colors"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteClick(p)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="h-5 w-5" /></button>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-white/80 print:text-gray-700">
                          {p.funcao && (
                            <p className="flex items-center gap-2 font-black text-cyan-300 uppercase tracking-tighter bg-cyan-400/20 w-fit px-2 py-1 rounded-md border border-cyan-400/20 shadow-sm"><Briefcase className="h-3 w-3" /> {p.funcao}</p>
                          )}
                          <div className="flex flex-col gap-1.5 pt-1">
                            {p.telefone && (
                              <p className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"><Phone className="h-3 w-3 text-cyan-400/60 shrink-0" /> {p.telefone}</p>
                            )}
                            {p.email && p.email.split(',').map((e, i) => e.trim() && (
                              <p key={i} className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"><Mail className="h-3 w-3 text-cyan-400/60 shrink-0" /> <span className="truncate">{e.trim()}</span></p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Nova Seção: Linhas de Cuidado em Números */}
              <section className="bg-gradient-to-br from-[#002b5c] to-[#001b3d] rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden border border-white/10 print:bg-white print:text-black print:border print:border-gray-200 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-colors" />
                <div className="flex items-center gap-3 mb-8 relative z-10">
                  <div className="h-12 w-12 md:h-16 md:w-16 shrink-0 rounded-2xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <div className="h-6 w-6 md:h-8 md:w-8 bg-cyan-400 rounded-lg opacity-80" />
                  </div>
                  <h3 className="text-sm md:text-base font-black text-white tracking-widest uppercase border-b-2 border-cyan-400/50 pb-1 w-fit">
                    Linhas de Cuidado e Áreas Técnicas em números de profissionais
                  </h3>
                </div>

                <div className="space-y-0 relative z-10 px-4 md:px-8 flex flex-col items-start">
                  {Object.entries(linhasAgrupadas).map(([area, membros], index, array) => (
                    <div key={area} className="relative flex items-center group/item py-6 w-full">
                      {/* Linha Vertical Conectora - Centralizada no Círculo */}
                      {index < array.length - 1 && (
                        <div className="absolute left-[40px] md:left-[48px] top-[60px] bottom-[-24px] w-[2px] bg-white/20 -translate-x-1/2" />
                      )}
                      
                      {/* Círculo com Nome da Área */}
                      <div className="h-20 w-20 md:h-24 md:w-24 shrink-0 rounded-full bg-cyan-400/10 border-2 border-cyan-400/30 flex items-center justify-center text-center p-2 backdrop-blur-md shadow-lg group-hover/item:border-cyan-400/60 group-hover/item:bg-cyan-400/20 transition-all z-20 relative">
                        <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-tighter leading-tight">{area}</span>
                      </div>

                      {/* Quantidade de Profissionais */}
                      <div className="ml-8 md:ml-12 flex items-center gap-3">
                        <span className="text-xl md:text-2xl font-black text-white drop-shadow-md">{membros.length}</span>
                        <span className="text-xs md:text-sm font-bold text-white/60 uppercase tracking-widest">
                          {membros.length === 1 ? 'Profissional' : 'Profissionais'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Consolidado Quantitativo */}
          <div className="mt-8">
            <section className="bg-gradient-to-br from-[#002b5c] to-[#001b3d] rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden border border-white/10 print:bg-white print:text-black print:border print:border-gray-200">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-8 relative z-10 border-b border-white/10 pb-6">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] print:bg-gray-100 print:text-black">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-widest print:text-black uppercase">Consolidado Quantitativo</h3>
                  <p className="text-cyan-300/80 text-sm mt-1 uppercase tracking-widest font-bold">Resumo Geral de Profissionais</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/50 transition-all hover:bg-white/10 shadow-lg">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shadow-inner border border-cyan-400/20">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">Total Geral</h4>
                  <p className="text-5xl font-black text-white drop-shadow-md">{profissionais.length}</p>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-emerald-400/50 transition-all hover:bg-white/10 shadow-lg">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shadow-inner border border-emerald-400/20">
                      <HeartPulse className="h-5 w-5" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1 truncate" title="Total de Linhas de Cuidado Atendidas">Total de Linhas</h4>
                  <p className="text-4xl font-black text-white drop-shadow-md">{Object.keys(linhasAgrupadas).length}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Profissionais</span>
                    <span className="text-xs font-black text-emerald-400">{profissionais.filter(p => p.categoria === 'Linhas de Cuidado e Áreas Técnicas').length}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-indigo-400/50 transition-all hover:bg-white/10 shadow-lg">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-400/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-400/20 text-indigo-300 flex items-center justify-center shadow-inner border border-indigo-400/20">
                      <Landmark className="h-5 w-5" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1 truncate" title="Direção e Corpo Técnico">Direção e Corpo Técnico</h4>
                  <p className="text-4xl font-black text-white drop-shadow-md">{profissionais.filter(p => p.categoria === 'Direção e Corpo Técnico').length}</p>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-sky-400/50 transition-all hover:bg-white/10 shadow-lg">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-sky-400/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-sky-400/20 text-sky-300 flex items-center justify-center shadow-inner border border-sky-400/20">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1 truncate" title="Apoio Operacional e Administrativo">Apoio Operacional</h4>
                  <p className="text-4xl font-black text-white drop-shadow-md">{profissionais.filter(p => p.categoria === 'Apoio Operacional e Administrativo').length}</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <footer className="bg-gradient-to-r from-[#001b3d] to-[#002b5c] border-t border-cyan-400/20 shadow-[0_-4px_30px_rgba(0,0,0,0.3)] w-full py-6 md:py-8 px-4 flex flex-col items-center justify-center shrink-0 print:hidden relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 w-[300px] md:w-[800px] h-32 md:h-64 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 translate-y-1/2" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="h-1 w-8 md:w-12 bg-cyan-400/50 rounded-full mb-4 md:mb-6" />
          <div className="font-black text-white text-[9px] md:text-[11px] tracking-[0.2em] md:tracking-[0.3em] uppercase drop-shadow-md flex flex-col md:flex-row items-center gap-1 md:gap-0">
            <span>&copy; 2026 DAPS CAP5.3</span>
            <span className="hidden md:inline text-cyan-400/50 mx-2">|</span>
            <span>Divisão de Ações e Programas de Saúde</span>
          </div>
          <div className="text-cyan-300/60 text-[8px] md:text-[9px] font-bold tracking-[0.3em] md:tracking-[0.4em] uppercase mt-3 md:mt-3 hover:text-cyan-300 transition-colors cursor-default leading-relaxed">
            Desenvolvido por Fabio Ferreira de Oliveira<br className="md:hidden" /> (DAPS/CAP5.3)
          </div>
        </div>
      </footer>

      {isDeleteConfirmOpen && itemToDelete && (
        <div className="fixed inset-0 z-[250] bg-[#001b3d]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-[#001b3d] to-[#002b5c] border border-red-500/30 rounded-[32px] w-full max-w-sm shadow-[0_20px_60px_rgba(220,38,38,0.3)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-white tracking-widest uppercase">Confirmar Exclusão</h3>
                <div className="mt-4 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-2">Atenção!</p>
                  <p className="text-cyan-100/80 text-sm">
                    Você está prestes a excluir o registro de <span className="text-white font-bold">{itemToDelete.nome}</span>.
                  </p>
                  <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-tighter mt-3 leading-tight">
                    ESTA AÇÃO É IRREVERSÍVEL E TODOS OS DADOS SERÃO PERDIDOS PERMANENTEMENTE.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsDeleteConfirmOpen(false); setItemToDelete(null); }} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white hover:opacity-90 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all text-xs font-bold uppercase tracking-widest">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#001b3d]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget && !isProcessingAction) { setIsPasswordModalOpen(false); setPasswordInput(''); setPasswordError(false); setPendingAction(null); setShowPassword(false); } }}>
          <div className="bg-gradient-to-br from-[#001b3d] to-[#002b5c] border border-cyan-400/30 rounded-[32px] w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => { setIsPasswordModalOpen(false); setPasswordInput(''); setPasswordError(false); setPendingAction(null); setShowPassword(false); }} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all disabled:opacity-30 z-20" disabled={isProcessingAction}><X className="h-6 w-6" /></button>
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center mb-4 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]"><Lock className="h-8 w-8" /></div>
                <h3 className="text-xl font-black text-white tracking-widest uppercase">Autenticação</h3>
                <p className="text-cyan-100/60 text-sm mt-2">Insira a senha de administrador para confirmar esta ação.</p>
              </div>
              <div className="space-y-4">
                <div className="relative group">
                  <input type={showPassword ? "text" : "password"} className={`w-full bg-white/5 border ${passwordError ? 'border-red-500/50 focus:ring-red-500/20' : 'border-cyan-400/30 focus:border-cyan-400 focus:ring-cyan-400/20'} rounded-xl pl-4 pr-20 py-4 text-lg text-white font-bold focus:outline-none focus:ring-2 transition-all text-center tracking-[0.3em] placeholder:text-white/20`} placeholder="••••••••" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }} onKeyDown={(e) => e.key === 'Enter' && !isProcessingAction && executePendingAction()} autoFocus disabled={isProcessingAction} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {passwordInput && !isProcessingAction && <button onClick={() => setPasswordInput('')} className="p-2 text-white/30 hover:text-white transition-colors rounded-lg"><X className="h-4 w-4" /></button>}
                    <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-white/30 hover:text-white transition-colors rounded-lg" disabled={isProcessingAction}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                  {passwordError && <p className="flex items-center justify-center gap-1 text-red-400 text-xs mt-2 font-bold animate-in slide-in-from-top-1"><ShieldAlert className="h-3 w-3" /> Senha incorreta</p>}
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setIsPasswordModalOpen(false); setPasswordInput(''); setPasswordError(false); setPendingAction(null); setShowPassword(false); }} className="flex-1 px-4 py-4 rounded-xl border border-white/10 bg-white/5 text-white font-bold uppercase tracking-widest text-[11px] hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30" disabled={isProcessingAction}>Cancelar</button>
                  <button onClick={executePendingAction} disabled={isProcessingAction} className="flex-1 px-4 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait">{isProcessingAction ? <><div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />Aguarde...</> : 'Confirmar'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001b3d]/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-[#001b3d] to-[#002b5c] rounded-[32px] border border-cyan-400/30 shadow-2xl p-8 max-w-md w-full relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
            <h3 className="text-2xl text-white font-black tracking-widest uppercase mb-8 flex items-center gap-3 border-b border-white/10 pb-4">{editingId ? <Edit className="h-6 w-6 text-cyan-400" /> : <UserPlus className="h-6 w-6 text-cyan-400" />}{editingId ? 'Editar Profissional' : 'Novo Profissional'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] text-cyan-300 mb-2 uppercase">Categoria</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-medium appearance-none cursor-pointer">
                  <option value="Direção e Corpo Técnico" className="bg-[#001b3d]">Direção e Corpo Técnico</option>
                  <option value="Linhas de Cuidado e Áreas Técnicas" className="bg-[#001b3d]">Linhas de Cuidado e Áreas Técnicas</option>
                  <option value="Apoio Operacional e Administrativo" className="bg-[#001b3d]">Apoio Operacional e Administrativo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.2em] text-cyan-300 mb-2 uppercase">Nome Completo</label>
                <input value={nome} onChange={(e) => { const val = e.target.value; const formatted = val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '); setNome(formatted); }} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all" placeholder="Digite o nome do profissional" type="text" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-cyan-300 mb-2 uppercase">Telefone</label>
                  <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all" placeholder="(00) 00000-0000" type="tel" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-cyan-300 mb-2 uppercase">E-mail(s)</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all" placeholder="email1@ex.com, email2@ex.com" type="text" />
                  {categoria === 'Linhas de Cuidado e Áreas Técnicas' && (
                    <p className="text-[8px] text-cyan-400/60 mt-1 uppercase tracking-widest">Separe por vírgula. Ex: mail1 (Linha 1), mail2 (Linha 2)</p>
                  )}
                </div>
              </div>
              {categoria === 'Linhas de Cuidado e Áreas Técnicas' ? (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-cyan-300 mb-2 uppercase">Linha(s) / Área(s) de Atuação</label>
                  <input value={linhaCuidado} onChange={(e) => setLinhaCuidado(e.target.value.toUpperCase())} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all uppercase" placeholder="Linha 1, Linha 2..." type="text" required />
                  <p className="text-[8px] text-cyan-400/60 mt-1 uppercase tracking-widest">Separe por vírgula para múltiplas áreas.</p>
                </div>
              ) : (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-cyan-300 mb-2 uppercase">Cargo / Função</label>
                  <input value={funcao} onChange={(e) => setFuncao(e.target.value.toUpperCase())} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all uppercase" placeholder="Ex: Diretor, Coordenador..." type="text" required />
                </div>
              )}
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest">Cancelar</button>
                <button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all py-4 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest flex justify-center items-center gap-2" type="submit">{editingId ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? 'Atualizar' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {presentationStep > 0 && (
        <div className="fixed inset-0 z-[300] bg-[#001b3d] overflow-y-auto overflow-x-hidden flex flex-col items-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-300">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[400px] sm:w-[600px] md:w-[800px] h-[400px] sm:h-[600px] md:h-[800px] bg-cyan-400/5 rounded-full blur-[100px] md:blur-[150px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] sm:w-[500px] md:w-[700px] h-[300px] sm:h-[500px] md:h-[700px] bg-blue-600/5 rounded-full blur-[80px] md:blur-[120px]" />
          </div>
          <div className="w-full max-w-[1440px] flex-1 flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 md:mb-10 w-full px-2">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.2)]"><ActivitySquare className="h-5 w-5 md:h-6 md:w-6" /></div>
                <div><h1 className="text-lg md:text-2xl font-black text-white leading-none tracking-widest uppercase">DAPS CAP5.3</h1><p className="text-[8px] md:text-[10px] text-cyan-300/60 font-bold uppercase tracking-widest mt-1">Modo Apresentação</p></div>
              </div>
              <button onClick={() => setPresentationStep(0)} className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-red-400/40 hover:text-red-400 transition-all active:scale-95 group"><X className="h-5 w-5 md:h-6 md:w-6 group-hover:rotate-90 transition-transform" /></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {presentationStep === 1 && (
                <div className="w-full max-w-7xl animate-in slide-in-from-right-10 fade-in duration-500 py-10">
                  <div className="flex flex-col items-center justify-center mb-10 md:mb-16">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.3)] mb-6 md:mb-8"><BarChart3 className="h-10 w-10 md:h-12 md:w-12" /></div>
                    <h2 className="text-3xl md:text-5xl font-black text-center text-white tracking-widest uppercase border-b-4 border-cyan-400/50 pb-4">RESUMO GERAL</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 px-4">
                    <div className="bg-white/5 rounded-[32px] md:rounded-[40px] p-8 md:p-10 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col items-center justify-center py-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 pb-12">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-400/20 shrink-0"><Users className="h-8 w-8 md:h-10 md:w-10" /></div>
                        <div className="flex flex-col items-center gap-2"><h4 className="text-base md:text-lg font-bold text-white/70 uppercase tracking-widest">Total Geral</h4><p className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{profissionais.length}</p></div>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-[32px] md:rounded-[40px] p-8 md:p-10 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col items-center justify-center py-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 pb-12">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-emerald-400/10 text-emerald-300 flex items-center justify-center border border-emerald-400/20 shrink-0"><HeartPulse className="h-8 w-8 md:h-10 md:w-10" /></div>
                        <div className="flex flex-col items-center gap-2"><h4 className="text-base md:text-lg font-bold text-white/70 uppercase tracking-widest leading-tight">Total de Linhas</h4><p className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{Object.keys(linhasAgrupadas).length}</p></div>
                      </div>
                      <div className="absolute bottom-6 md:bottom-8 left-8 md:left-10 right-8 md:right-10 flex items-center justify-between gap-4"><span className="text-[10px] md:text-xs font-bold text-white/40 uppercase tracking-widest">Profissionais</span><span className="text-lg md:text-xl font-black text-emerald-400">{profissionais.filter(p => p.categoria === 'Linhas de Cuidado e Áreas Técnicas').length}</span></div>
                    </div>
                    <div className="bg-white/5 rounded-[32px] md:rounded-[40px] p-8 md:p-10 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col items-center justify-center py-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 pb-12">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-indigo-400/10 text-indigo-300 flex items-center justify-center border border-indigo-400/20 shrink-0"><Landmark className="h-8 w-8 md:h-10 md:w-10" /></div>
                        <div className="flex flex-col items-center gap-2"><h4 className="text-base md:text-lg font-bold text-white/70 uppercase tracking-widest leading-tight">Direção</h4><p className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{profissionais.filter(p => p.categoria === 'Direção e Corpo Técnico').length}</p></div>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-[32px] md:rounded-[40px] p-8 md:p-10 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col items-center justify-center py-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 pb-12">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-sky-400/10 text-sky-300 flex items-center justify-center border border-cyan-400/20 shrink-0"><Building2 className="h-8 w-8 md:h-10 md:w-10" /></div>
                        <div className="flex flex-col items-center gap-2"><h4 className="text-base md:text-lg font-bold text-white/70 uppercase tracking-widest leading-tight">Apoio</h4><p className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{profissionais.filter(p => p.categoria === 'Apoio Operacional e Administrativo').length}</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {presentationStep === 2 && (
                <div className="w-full max-w-7xl animate-in slide-in-from-right-10 fade-in duration-500 py-10 flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center justify-center mb-10 md:mb-16">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.3)] mb-6 md:mb-8"><HeartPulse className="h-10 w-10 md:h-12 md:w-12" /></div>
                    <h2 className="text-3xl md:text-5xl font-black text-center text-white tracking-widest uppercase border-b-4 border-cyan-400/50 pb-4">Linhas de Cuidado e Áreas Técnicas</h2>
                  </div>
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8 px-4 w-full">
                    {Object.entries(linhasAgrupadas).map(([area, membros]) => (
                      <div key={area} className="break-inside-avoid mb-6 md:mb-8 bg-white/5 rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-cyan-400/20 backdrop-blur-md shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <h3 className="text-xl md:text-2xl font-bold text-cyan-300 mb-6 md:mb-8 uppercase tracking-widest relative z-10">{area}</h3>
                        <div className="space-y-4 md:space-y-6 relative z-10">
                          {membros.map(p => (
                            <div key={p.id} className="flex items-center gap-4 bg-white/5 p-4 md:p-5 rounded-2xl border border-white/5">
                              <div className="flex-1 min-w-0">
                                <p className="text-lg md:text-xl font-bold text-white truncate">{p.nome}</p>
                                <div className="flex flex-col gap-1.5 md:gap-2 mt-2 text-xs md:text-sm text-cyan-100/70">
                                  {p.telefone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" /> {p.telefone}</span>}
                                  {p.email && p.email.split(',').map((e, i) => e.trim() && (
                                    <span key={i} className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /> {e.trim()}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {presentationStep === 3 && (
                <div className="w-full max-w-7xl animate-in slide-in-from-right-10 fade-in duration-500 py-10 flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center justify-center mb-10 md:mb-16">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.3)] mb-6 md:mb-8"><Landmark className="h-10 w-10 md:h-12 md:w-12" /></div>
                    <h2 className="text-3xl md:text-5xl font-black text-center text-white tracking-widest uppercase border-b-4 border-cyan-400/50 pb-4">Direção e Corpo Técnico</h2>
                  </div>
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8 w-full px-4">
                    {direcao.map(p => (
                      <div key={p.id} className="break-inside-avoid mb-6 md:mb-8 bg-white/5 rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-cyan-400/20 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/[0.08] transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 relative z-10 w-full">
                          <div className="h-20 w-20 md:h-24 md:w-24 rounded-[20px] md:rounded-[24px] bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-400/20 shadow-inner shrink-0"><Briefcase className="h-8 w-8 md:h-10 md:w-10" /></div>
                          <div className="flex flex-col items-center gap-3 w-full">
                            <h3 className="text-xl md:text-2xl font-bold text-white text-center">{p.nome}</h3>
                            {p.funcao && <p className="text-cyan-300 font-black uppercase tracking-widest text-[10px] md:text-sm bg-cyan-400/10 py-1 md:py-1.5 px-3 md:px-4 rounded-lg inline-block border border-cyan-400/10">{p.funcao}</p>}
                            <div className="space-y-2 md:space-y-3 text-xs md:text-sm text-cyan-100/60 w-full pt-4 border-t border-white/5 mt-2">
                              {p.telefone && <p className="flex items-center justify-center gap-2"><Phone className="h-3 w-3 md:h-4 md:w-4 shrink-0 text-cyan-400/50" /> {p.telefone}</p>}
                              {p.email && p.email.split(',').map((e, i) => e.trim() && <p key={i} className="flex items-center justify-center gap-2 truncate px-4"><Mail className="h-4 w-4 shrink-0 text-cyan-400/50" /> {e.trim()}</p>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {presentationStep === 5 && (
                <div className="w-full max-w-7xl animate-in slide-in-from-right-10 fade-in duration-500 py-10 flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center justify-center mb-10 md:mb-16">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.3)] mb-6 md:mb-8">
                      <BarChart3 className="h-10 w-10 md:h-12 md:w-12" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-center text-white tracking-widest uppercase border-b-4 border-cyan-400/50 pb-4">Linhas em Números</h2>
                  </div>
                  
                  <div className="w-full max-w-4xl px-4 flex justify-center">
                    <div className="bg-white/5 rounded-[40px] p-8 md:p-12 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl w-fit min-w-[320px] md:min-w-[600px]">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                      
                      <div className="space-y-0 relative z-10 flex flex-col items-center px-4 md:px-12">
                        {Object.entries(linhasAgrupadas).map(([area, membros], index, array) => (
                          <div key={area} className="relative flex items-center group/item py-10 w-full justify-start">
                            {/* Linha Vertical Conectora - Centralizada no Círculo Gigante */}
                            {index < array.length - 1 && (
                              <div className="absolute left-[64px] md:left-[88px] top-[120px] bottom-[-40px] w-[3px] bg-white/10 -translate-x-1/2 z-0" />
                            )}
                            
                            {/* Círculo com Nome da Área - Tamanho Máximo */}
                            <div className="h-32 w-32 md:h-44 md:w-44 shrink-0 rounded-full bg-[#001b3d] border-[3px] border-cyan-400/30 flex items-center justify-center text-center p-5 backdrop-blur-md shadow-2xl group-hover/item:border-cyan-400/60 group-hover/item:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all z-10 relative">
                              <div className="absolute inset-0 rounded-full bg-cyan-400/5" />
                              <span className="text-xs md:text-sm font-black text-white uppercase tracking-tighter leading-tight relative z-10">{area}</span>
                            </div>

                            {/* Quantidade de Profissionais */}
                            <div className="ml-12 md:ml-20 flex items-center gap-8 relative z-10">
                              <span className="text-6xl md:text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">{membros.length}</span>
                              <div className="flex flex-col">
                                <span className="text-sm md:text-xl font-bold text-cyan-300 uppercase tracking-[0.2em]">
                                  {membros.length === 1 ? 'Profissional' : 'Profissionais'}
                                </span>
                                <span className="text-xs md:text-sm text-white/40 uppercase tracking-widest mt-1">Atuando na área</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {presentationStep === 4 && (
                <div className="w-full max-w-7xl animate-in slide-in-from-right-10 fade-in duration-500 py-10 flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center justify-center mb-10 md:mb-16">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center backdrop-blur-md border border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.3)] mb-6 md:mb-8"><Building2 className="h-10 w-10 md:h-12 md:w-12" /></div>
                    <h2 className="text-3xl md:text-5xl font-black text-center text-white tracking-widest uppercase border-b-4 border-cyan-400/50 pb-4">Apoio Operacional e Administrativo</h2>
                  </div>
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8 w-full px-4">
                    {apoio.map(p => (
                      <div key={p.id} className="break-inside-avoid mb-6 md:mb-8 bg-white/5 rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-cyan-400/20 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/[0.08] transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6 relative z-10 w-full">
                          <div className="h-20 w-20 md:h-24 md:w-24 rounded-[20px] md:rounded-[24px] bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-400/20 shadow-inner shrink-0"><Briefcase className="h-8 w-8 md:h-10 md:w-10" /></div>
                          <div className="flex flex-col items-center gap-3 w-full">
                            <h3 className="text-xl md:text-2xl font-bold text-white text-center">{p.nome}</h3>
                            {p.funcao && <p className="text-cyan-300 font-black uppercase tracking-widest text-[10px] md:text-sm bg-cyan-400/10 py-1 md:py-1.5 px-3 md:px-4 rounded-lg inline-block border border-cyan-400/10">{p.funcao}</p>}
                            <div className="space-y-2 md:space-y-3 text-xs md:text-sm text-cyan-100/60 w-full pt-4 border-t border-white/5 mt-2">
                              {p.telefone && <p className="flex items-center justify-center gap-2"><Phone className="h-3 w-3 md:h-4 md:w-4 shrink-0 text-cyan-400/50" /> {p.telefone}</p>}
                              {p.email && p.email.split(',').map((e, i) => e.trim() && <p key={i} className="flex items-center justify-center gap-2 truncate px-4"><Mail className="h-4 w-4 shrink-0 text-cyan-400/50" /> {e.trim()}</p>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="h-24 border-t border-white/10 flex items-center justify-between px-10 bg-black/20 backdrop-blur-xl">
              <button onClick={() => setPresentationStep(prev => Math.max(1, prev - 1))} className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all ${presentationStep === 1 ? 'opacity-30 cursor-not-allowed text-white/50' : 'hover:bg-white/10 text-cyan-300 hover:text-cyan-200'}`} disabled={presentationStep === 1}><ChevronLeft className="h-5 w-5" /> Anterior</button>
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(step => (
                  <button key={step} onClick={() => setPresentationStep(step)} className={`h-3 w-12 rounded-full transition-all duration-300 ${presentationStep === step ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] w-20' : 'bg-white/10 hover:bg-white/30'}`} />
                ))}
              </div>
              <button onClick={() => setPresentationStep(prev => Math.min(4, prev + 1))} className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all ${presentationStep === 4 ? 'opacity-30 cursor-not-allowed text-white/50' : 'hover:bg-white/10 text-cyan-300 hover:text-cyan-200'}`} disabled={presentationStep === 4}>Próximo <ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
