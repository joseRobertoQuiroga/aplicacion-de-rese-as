import React, { useState, useEffect } from "react";
import { 
  Star, 
  Users, 
  Settings, 
  Mail, 
  RefreshCw, 
  Sliders, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Send, 
  Eye, 
  Search, 
  Database, 
  Sparkles, 
  Plus, 
  FileText, 
  Check, 
  Share2, 
  Phone, 
  ShieldAlert, 
  Info,
  SlidersHorizontal,
  MailWarning,
  ListFilter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from "recharts";
import { SurveyResponse, MailConfig, MailLog, DailySummaryReport } from "./types";

// Static agents available for review options
const AGENTS = [
  { name: "Sofía Ramos", role: "Soporte Técnico" },
  { name: "Carlos Mendoza", role: "Instalaciones de Fibra" },
  { name: "Andrés Delgado", role: "Atención Telefónica" },
  { name: "Lucia Fernández", role: "Planes y Cambios" }
];

export default function App() {
  // Navigation & Page Modes
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<"dashboard" | "surveys" | "smtp" | "maillogs" | "automation">("dashboard");

  // Core Application Data States
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [mailConfig, setMailConfig] = useState<MailConfig | null>(null);
  const [mailLogs, setMailLogs] = useState<MailLog[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummaryReport[]>([]);

  // State loading indicators
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingSurvey, setSubmittingSurvey] = useState<boolean>(false);
  const [submittingConfig, setSubmittingConfig] = useState<boolean>(false);
  const [testingConfig, setTestingConfig] = useState<boolean>(false);
  const [triggeringAutomation, setTriggeringAutomation] = useState<boolean>(false);

  // Success/Error Feedback notifications
  const [surveyNotice, setSurveyNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [configNotice, setConfigNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testNotice, setTestNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [automationNotice, setAutomationNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Customer Survey Form Draft Data States
  const [surveyDraft, setSurveyDraft] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    agentName: "Sofía Ramos",
    attentionScore: 10,
    speedScore: 5,
    friendlinessScore: 5,
    recommend: "highly" as "highly" | "maybe" | "no",
    comments: ""
  });

  // Client Filter & Search modifiers (Inside Admin Panel)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all"); // 'high' (8+), 'mid' (5-7), 'low' (<5)

  // Mail visualizer Popup Modal
  const [selectedMailHtml, setSelectedMailHtml] = useState<{ subject: string; body: string } | null>(null);

  // Load backend states on boot
  const loadBackendData = async () => {
    try {
      setLoading(true);
      const [survRes, confRes, logsRes, summariesRes] = await Promise.all([
        fetch("/api/surveys"),
        fetch("/api/mail-config"),
        fetch("/api/mail-logs"),
        fetch("/api/daily-summaries")
      ]);

      if (survRes.ok) setSurveys(await survRes.json());
      if (confRes.ok) setMailConfig(await confRes.json());
      if (logsRes.ok) setMailLogs(await logsRes.json());
      if (summariesRes.ok) setDailySummaries(await summariesRes.json());
    } catch (e) {
      console.error("Fallo al conectar con el servidor Express backend:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  // Submit customer survey action
  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyDraft.customerName.trim() || !surveyDraft.customerEmail.trim()) {
      setSurveyNotice({ type: "error", text: "Por favor complete su nombre y correo electrónico." });
      return;
    }

    setSubmittingSurvey(true);
    setSurveyNotice(null);

    try {
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyDraft)
      });

      const result = await response.json();

      if (response.ok) {
        setSurveyNotice({
          type: "success",
          text: result.simulated 
            ? "¡Encuesta registrada con éxito! El sistema simuló y registró la notificación de correo interna adecuadamente."
            : "¡Muchos gracias! Su reseña se guardó correctamente y enviamos una notificación por email real según su configuración."
        });

        // Reset customer review inputs
        setSurveyDraft({
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          agentName: "Sofía Ramos",
          attentionScore: 10,
          speedScore: 5,
          friendlinessScore: 5,
          recommend: "highly",
          comments: ""
        });

        // Reload data registers in background
        loadBackendData();
      } else {
        throw new Error(result.error || "Error al procesar el formulario.");
      }
    } catch (err: any) {
      setSurveyNotice({ type: "error", text: `Error de envío: ${err.message}` });
    } finally {
      setSubmittingSurvey(false);
    }
  };

  // Submit/Update SMTP parameters settings
  const handleMailConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailConfig) return;

    setSubmittingConfig(true);
    setConfigNotice(null);

    try {
      const response = await fetch("/api/mail-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mailConfig)
      });

      const result = await response.json();
      if (response.ok) {
        setMailConfig(result.config);
        setConfigNotice({ type: "success", text: "Configuración de correo guardada con éxito." });
      } else {
        throw new Error(result.error || "Fallo al guardar configuración.");
      }
    } catch (err: any) {
      setConfigNotice({ type: "error", text: err.message });
    } finally {
      setSubmittingConfig(false);
    }
  };

  // Dispatch a test email with the specified configuration settings
  const handleTestMailConfig = async () => {
    if (!mailConfig) return;
    setTestingConfig(true);
    setTestNotice(null);

    try {
      const response = await fetch("/api/mail-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mailConfig)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setTestNotice({ 
          type: "success", 
          text: mailConfig.sandboxMode 
            ? "¡Prueba Simulada Exitosa! El correo de prueba se registró en la lista de Logs locales como exitoso." 
            : `¡Correo enviado con éxito! Revise la casilla de correo: ${mailConfig.receiverAddress}`
        });
        loadBackendData(); // update logs list
      } else {
        throw new Error((result.log && result.log.errorDetails) || result.error || "Fallo en conexión SMTP.");
      }
    } catch (e: any) {
      setTestNotice({ 
        type: "error", 
        text: `Error de Conexión: ${e.message}. Verifique el Host, Puerto o use el 'Modo Simulador Local' para validar flujos sin fallar.` 
      });
    } finally {
      setTestingConfig(false);
    }
  };

  // Single review deletion
  const handleDeleteSurvey = async (id: string) => {
    if (!window.confirm("¿Está seguro de eliminar esta reseña del registro histórico?")) return;

    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setSurveys(prev => prev.filter(s => s.id !== id));
      } else {
        alert("Fallo al eliminar la reseña seleccionada.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct 24 Hours Executive report triggering
  const handleTriggerAutomation = async () => {
    setTriggeringAutomation(true);
    setAutomationNotice(null);

    try {
      const response = await fetch("/api/automation/trigger", {
        method: "POST"
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setAutomationNotice({
          type: "success",
          text: `¡Automatización completada de forma impecable! Se procesaron las encuestas recibidas, se generaron las métricas del periodo y se envió el reporte ejecutivo formal por correo.`
        });
        loadBackendData(); // update summaries, logs
      } else {
        throw new Error(result.error || "Fallo en ejecución de reporte.");
      }
    } catch (err: any) {
      setAutomationNotice({ type: "error", text: `Fallo de ejecución: ${err.message}` });
    } finally {
      setTriggeringAutomation(false);
    }
  };

  // Generate completely random customer reviews to populate history (DEMO purposes)
  const handleGenerateRandomDemoSurvey = async () => {
    const demoNames = ["Esteban Solari", "Valeria Quiroga", "Héctor Gómez", "Marta Benítez", "Fernando Rossi", "Constanza Flores"];
    const demoEmails = ["esteban.solari@gmail.com", "vale_quiroga@yahoo.com", "hgomez@outlook.com", "mbenitez.it@gmail.com", "fer.rossi99@gmail.com", "constflores@protonmail.com"];
    const demoPhones = ["+54 9 11 3456-7890", "+54 9 11 9012-3456", "+54 9 11 2345-6789", undefined, "+54 9 11 8765-4321", undefined];
    const demoComments = [
      "El servicio superó totalmente mis expectativas. Fueron atentos y resolvieron la configuración en tiempo récord.",
      "La velocidad contratada no coincide con lo instalado inicialmente, pero el oficial me lo explicó amablemente y me agendó un cambio sin costo.",
      "Muy mala experiencia inicial, estuve esperando demasiado tiempo en línea y cuando me atendieron me colgaron la llamada sin avisar.",
      "El agente fue muy educado y me despejó las dudas que tenía sobre el software de forma muy simple. Un 10 rotundo.",
      "Atención regular. Se demoraron bastante en el trámite administrativo aunque el servicio técnico final fue de buena calidad.",
      "Considero que falta información al iniciar el proceso, pero rescato el entusiasmo y la empatía del gestor técnico."
    ];
    
    const randomIdx = Math.floor(Math.random() * demoNames.length);
    const scoreVal = Math.floor(Math.random() * 8) + 3; // score from 3 to 10
    const randomAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)].name;

    const draft = {
      customerName: demoNames[randomIdx],
      customerEmail: demoEmails[randomIdx],
      customerPhone: demoPhones[randomIdx] || "",
      agentName: randomAgent,
      attentionScore: scoreVal,
      speedScore: Math.floor(Math.random() * 3) + 3, // 3 - 5
      friendlinessScore: Math.floor(Math.random() * 3) + 3,
      recommend: scoreVal >= 8 ? "highly" : scoreVal >= 5 ? "maybe" : "no",
      comments: demoComments[randomIdx]
    };

    try {
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (response.ok) {
        loadBackendData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reset database state to standard list
  const handleResetDatabase = async () => {
    if (!window.confirm("¿Está seguro de RESTAURAR la base de datos? Esto removerá encuestas nuevas y re-establecerá los datos demo iniciales.")) return;
    try {
      const response = await fetch("/api/surveys/reset", { method: "POST" });
      if (response.ok) {
        loadBackendData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------- CORE METRICS CALCULATIONS ----------------
  const totalReceived = surveys.length;
  
  const avgSelectionRating = totalReceived > 0 
    ? parseFloat((surveys.reduce((acc, s) => acc + s.attentionScore, 0) / totalReceived).toFixed(1))
    : 0;
    
  const promotersCount = surveys.filter(s => s.attentionScore >= 9).length;
  const detractorsCount = surveys.filter(s => s.attentionScore <= 6).length;
  const npsCalculatedScore = totalReceived > 0 
    ? Math.round(((promotersCount - detractorsCount) / totalReceived) * 100)
    : 0;

  const speedScoreAvg = totalReceived > 0
    ? parseFloat((surveys.reduce((acc, s) => acc + s.speedScore, 0) / totalReceived).toFixed(1))
    : 0;

  const friendScoreAvg = totalReceived > 0
    ? parseFloat((surveys.reduce((acc, s) => acc + s.friendlinessScore, 0) / totalReceived).toFixed(1))
    : 0;
    
  const criticalIssuesCount = surveys.filter(s => s.attentionScore <= 4).length;

  // ---------------- CHART DATA WRANGULATION ----------------
  // 1. Attention distribution rating (1-10)
  const scoreDistributionMap: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  surveys.forEach(s => {
    if (scoreDistributionMap[s.attentionScore] !== undefined) {
      scoreDistributionMap[s.attentionScore]++;
    }
  });
  const chartScoreData = Object.keys(scoreDistributionMap).map(k => ({
    Calificación: `${k} pts`,
    Frecuencia: scoreDistributionMap[Number(k)]
  }));

  // 2. Average rating per agent
  const agentPerformanceMap: { [key: string]: { sum: number; count: number } } = {};
  AGENTS.forEach(a => {
    agentPerformanceMap[a.name] = { sum: 0, count: 0 };
  });
  surveys.forEach(s => {
    if (agentPerformanceMap[s.agentName]) {
      agentPerformanceMap[s.agentName].sum += s.attentionScore;
      agentPerformanceMap[s.agentName].count++;
    } else {
      agentPerformanceMap[s.agentName] = { sum: s.attentionScore, count: 1 };
    }
  });
  const chartAgentData = Object.keys(agentPerformanceMap).map(k => ({
    Agente: k,
    Promedio: agentPerformanceMap[k].count > 0 
      ? parseFloat((agentPerformanceMap[k].sum / agentPerformanceMap[k].count).toFixed(1))
      : 0,
    Encuestas: agentPerformanceMap[k].count
  }));

  // 3. Score Rating Trend logic based on dates sequence
  // Sort survey responses by chronological date asc
  const sortedSurveys = [...surveys].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const chartTrendData = sortedSurveys.map(s => ({
    Fecha: new Date(s.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    Calificación: s.attentionScore,
    Cliente: s.customerName
  }));

  // ---------------- SURVEY FILTER LOGIC ----------------
  const filteredSurveys = surveys.filter(s => {
    const matchesSearch = 
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.comments && s.comments.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesAgent = agentFilter === "all" || s.agentName === agentFilter;
    
    let matchesRating = true;
    if (ratingFilter === "high") matchesRating = s.attentionScore >= 8;
    else if (ratingFilter === "mid") matchesRating = s.attentionScore >= 5 && s.attentionScore <= 7;
    else if (ratingFilter === "low") matchesRating = s.attentionScore <= 4;
    
    return matchesSearch && matchesAgent && matchesRating;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="opinion-app">
      
      {/* GLOBAL BANNER HEADER */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Title and Slogan */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl text-slate-900 tracking-tight">SoporteIT Reseñas</h1>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider border border-emerald-100">
                  AUTOMATED EMAIL
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Gestión de alertas instantáneas y reportes ejecutivos diarios de atención</p>
            </div>
          </div>

          {/* Nav Selection Buttons: Public Feedback Survey vs Admin Dashboard Grid */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setIsAdminMode(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isAdminMode 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver Formulario Público</span>
            </button>
            <button
              onClick={() => setIsAdminMode(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isAdminMode 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              id="admin-dashboard-btn"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Panel de Control (Admin)</span>
            </button>
          </div>
        </div>
      </header>

      {/* RENDER DYNAMIC CORE LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 mb-12">
        <AnimatePresence mode="wait">
          
          {/* ==================== 1. PUBLIC SURVEY VIEW ==================== */}
          {!isAdminMode ? (
            <motion.div
              key="customer-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
                
                {/* Form header branding */}
                <div className="text-center space-y-2 border-b border-slate-100 pb-5">
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold tracking-widest uppercase px-3 py-1 rounded-full">
                    Satisfecho con Nuestro Soporte
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Evaluación de Atención Recibida</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Su opinión es sumamente importante para nosotros. Cada calificación de atención gatilla alertas operativas en tiempo real en nuestra plataforma.
                  </p>
                </div>

                {/* Status indicator notice alerts message */}
                {surveyNotice && (
                  <div className={`p-4 rounded-xl border flex gap-3 text-xs leading-relaxed ${
                    surveyNotice.type === "success" 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}>
                    {surveyNotice.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
                    <div>
                      <p className="font-bold">{surveyNotice.type === "success" ? "Procesado Exitosamente" : "Alerta de Envío"}</p>
                      <p>{surveyNotice.text}</p>
                    </div>
                  </div>
                )}

                {/* Form Elements */}
                <form onSubmit={handleSurveySubmit} className="space-y-6">
                  
                  {/* Phase 1: Client Identifiers */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-2 border-blue-600 pl-2">
                      1. Identificación del Cliente
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Completo *</label>
                        <input
                          id="customer-name-field"
                          type="text"
                          required
                          placeholder="Ej: Jose Quiroga"
                          value={surveyDraft.customerName}
                          onChange={(e) => setSurveyDraft(prev => ({ ...prev, customerName: e.target.value }))}
                          className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:outline-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Correo Electrónico *</label>
                        <input
                          id="customer-email-field"
                          type="email"
                          required
                          placeholder="j.quiroga@empresa.com"
                          value={surveyDraft.customerEmail}
                          onChange={(e) => setSurveyDraft(prev => ({ ...prev, customerEmail: e.target.value }))}
                          className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:outline-blue-600"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono de Contacto (Opcional)</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Phone className="w-4 h-4" />
                          </span>
                          <input
                            type="tel"
                            placeholder="Ej: +54 9 11 1234-5678"
                            value={surveyDraft.customerPhone}
                            onChange={(e) => setSurveyDraft(prev => ({ ...prev, customerPhone: e.target.value }))}
                            className="w-full text-xs font-semibold border border-slate-200 rounded-lg py-3 pl-9 pr-3 bg-slate-50 focus:bg-white focus:outline-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: Attendant officer selection list */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-2 border-blue-600 pl-2">
                      2. Profesional de Atención Evaluado
                    </h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">¿Quién le brindó la atención o servicio?</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {AGENTS.map((agent) => (
                          <div
                            key={agent.name}
                            onClick={() => setSurveyDraft(prev => ({ ...prev, agentName: agent.name }))}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                              surveyDraft.agentName === agent.name
                                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/10"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <p className="text-xs font-bold text-slate-800">{agent.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{agent.role}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Phase 3: Core attention metrics sliders */}
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-2 border-blue-600 pl-2">
                      3. Calificación de Calidad
                    </h3>
                    
                    {/* Attention Score slider (1-10) */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700">Calificación del Trato y Solución:</label>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          surveyDraft.attentionScore >= 8 ? "bg-emerald-100 text-emerald-800" : surveyDraft.attentionScore >= 5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                        }`}>
                          {surveyDraft.attentionScore} de 10 puntos ({surveyDraft.attentionScore >= 8 ? "Promotor" : surveyDraft.attentionScore >= 5 ? "Pasivo" : "Detractor"})
                        </span>
                      </div>
                      
                      {/* Grid button style selector for precise scores */}
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                        {Array.from({ length: 10 }).map((_, i) => {
                          const val = i + 1;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSurveyDraft(prev => ({ ...prev, attentionScore: val }))}
                              className={`py-2 text-xs font-extrabold rounded-md border transition-all cursor-pointer ${
                                surveyDraft.attentionScore === val
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-bold px-1 select-none">
                        <span>Muy Insatisfecho (Menor a 4)</span>
                        <span>Excelente (8 en adelante)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Speed Score stars */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Velocidad de Respuesta:</label>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const val = i + 1;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setSurveyDraft(prev => ({ ...prev, speedScore: val }))}
                                className="text-2xl outline-hidden focus:scale-110 active:scale-95 transition-transform"
                              >
                                <Star 
                                  className={`w-6 h-6 ${
                                    val <= surveyDraft.speedScore ? "fill-yellow-400 text-yellow-400" : "text-slate-300 fill-transparent"
                                  }`} 
                                />
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium italic">
                          {surveyDraft.speedScore === 5 ? "Instantáneo" : surveyDraft.speedScore === 4 ? "Rápido" : surveyDraft.speedScore === 3 ? "Aceptable" : "Lento"}
                        </span>
                      </div>

                      {/* Friendliness stars */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Amabilidad y Empatía:</label>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const val = i + 1;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setSurveyDraft(prev => ({ ...prev, friendlinessScore: val }))}
                                className="text-2xl outline-hidden focus:scale-110 active:scale-95 transition-transform"
                              >
                                <Star 
                                  className={`w-6 h-6 ${
                                    val <= surveyDraft.friendlinessScore ? "fill-yellow-400 text-yellow-400" : "text-slate-300 fill-transparent"
                                  }`} 
                                />
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium italic">
                          {surveyDraft.friendlinessScore === 5 ? "Muy Carismático" : surveyDraft.friendlinessScore === 4 ? "Cordial" : surveyDraft.friendlinessScore === 3 ? "Normal" : "De trato seco"}
                        </span>
                      </div>
                    </div>

                    {/* Recommendation Level NPS select */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">¿Recomendaría nuestros servicios a conocidos?</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: "no", label: "Definitivamente No" },
                          { key: "maybe", label: "Tal Vez" },
                          { key: "highly", label: "Altamente Sí" }
                        ].map((rec) => (
                          <button
                            key={rec.key}
                            type="button"
                            onClick={() => setSurveyDraft(prev => ({ ...prev, recommend: rec.key as any }))}
                            className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              surveyDraft.recommend === rec.key
                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-150"
                            }`}
                          >
                            {rec.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Phase 4: Free textComments */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-2 border-blue-600 pl-2">
                      4. Comentarios Generales
                    </h3>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Cuéntenos un poco más de su experiencia *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Ej: Sofía me atendió de maravilla, pero la plataforma web demora en subir las facturas..."
                        value={surveyDraft.comments}
                        onChange={(e) => setSurveyDraft(prev => ({ ...prev, comments: e.target.value }))}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:outline-blue-600 leading-relaxed text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Form Submission actions */}
                  <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold">
                      * CAMPOS REQUERIDOS OBLIGATORIOS
                    </p>
                    <button
                      type="submit"
                      disabled={submittingSurvey}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-blue-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {submittingSurvey ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Guardando Reseña...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar Mi Reseña</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </motion.div>
          ) : (
            
            // ==================== 2. ADMINISTRATIVE INTEGRATED PANEL ====================
            <motion.div
              key="admin-desktop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              
              {/* ADMIN INNER MENU TABS */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setAdminTab("dashboard")}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      adminTab === "dashboard"
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Métricas y Dashboard</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("surveys")}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      adminTab === "surveys"
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Histórico de Encuestas ({totalReceived})</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("smtp")}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      adminTab === "smtp"
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configuración SMTP</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("maillogs")}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      adminTab === "maillogs"
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Bandeja Simulada / Logs ({mailLogs.length})</span>
                  </button>
                  <button
                    onClick={() => setAdminTab("automation")}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      adminTab === "automation"
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Automatización 24h</span>
                  </button>
                </div>

                {/* Database State Quick Re-setting */}
                <button
                  onClick={handleResetDatabase}
                  className="flex items-center gap-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                  title="Restablece las encuestas pre-cargadas para volver a testear limpio"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restaurar Base</span>
                </button>
              </div>

              {/* RENDER THE ACTIVE ADMINISTRATIVE VIEW */}
              <div className="bg-transparent">
                
                {/* -------------------- ADMIN TAB: 1. DASHBOARD -------------------- */}
                {adminTab === "dashboard" && (
                  <div className="space-y-6">
                    
                    {/* Row of KPI Summaries cards structured precisely */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      
                      {/* Metric 1 */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Respuestas</p>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-slate-800">{totalReceived}</span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">Acumulado</span>
                        </div>
                      </div>

                      {/* Metric 2 */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Satisfacción Trato</p>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-blue-600">{avgSelectionRating}<span className="text-xs text-slate-400">/10</span></span>
                          <span className={`text-[10px] font-bold px-1.5 rounded-sm ${
                            avgSelectionRating >= 8 ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
                          }`}>
                            Promedio
                          </span>
                        </div>
                      </div>

                      {/* Metric 3 */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Promoter Score (NPS)</p>
                        <div className="flex items-baseline justify-between">
                          <span className={`text-2xl font-black ${
                            npsCalculatedScore >= 50 ? "text-emerald-600" : npsCalculatedScore >= 0 ? "text-yellow-600" : "text-rose-600"
                          }`}>
                            {npsCalculatedScore > 0 ? `+${npsCalculatedScore}` : npsCalculatedScore}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Promotores - Detractores</span>
                        </div>
                      </div>

                      {/* Metric 4 */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Altas Críticas (&lt;=4)</p>
                        <div className="flex items-baseline justify-between">
                          <span className={`text-2xl font-black ${criticalIssuesCount > 0 ? "text-rose-600" : "text-slate-800"}`}>
                            {criticalIssuesCount}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                            criticalIssuesCount > 0 ? "bg-rose-50 text-rose-700 animate-pulse" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {criticalIssuesCount > 0 ? "Peligro" : "Cero Fallas"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CHARTS CONTAINER GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Chart 1: Attention rating distribution */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Distribución de Calificaciones de Atención (1-10)
                        </h4>
                        <div className="h-64">
                          {totalReceived === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                              Cargue datos o ingrese una encuesta para ver visualizaciones
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartScoreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="Calificación" tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ fontSize: 11 }} />
                                <Bar dataKey="Frecuencia" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* Chart 2: Officer/Agent Performances */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-500" /> Calificación Promedio por Oficial de Atención
                        </h4>
                        <div className="h-64">
                          {totalReceived === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                              Sin información individual de staff disponible
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartAgentData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" domain={[0, 10]} stroke="#94a3b8" />
                                <YAxis dataKey="Agente" type="category" width={110} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <Tooltip contentStyle={{ fontSize: 11 }} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Bar dataKey="Promedio" name="Calificación Promedio" fill="#10b981" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Encuestas" name="Total Reseñas" fill="#818cf8" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* Chart 3: Service speed & friendliness averages */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 md:col-span-2">
                        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <SlidersHorizontal className="w-4 h-4 text-emerald-500" /> Indicadores de Calidad Secundarios
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 space-y-2 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promedio de Velocidad del Servicio</span>
                            <div className="flex items-center justify-center gap-1 text-2xl font-black text-amber-500">
                              <span>★ {speedScoreAvg}</span>
                              <span className="text-slate-400 text-xs font-normal">/ 5 estrellas</span>
                            </div>
                            <p className="text-[11px] text-slate-500">Mide la fluidez técnica y el tiempo consumido</p>
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 space-y-2 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promedio de Amabilidad Técnico-Cliente</span>
                            <div className="flex items-center justify-center gap-1 text-2xl font-black text-purple-600">
                              <span>★ {friendScoreAvg}</span>
                              <span className="text-slate-400 text-xs font-normal">/ 5 estrellas</span>
                            </div>
                            <p className="text-[11px] text-slate-500">Mide el respeto, atención personalizada e interés</p>
                          </div>
                        </div>

                        {/* Visual chronological trend chart */}
                        {chartTrendData.length > 0 && (
                          <div className="space-y-2.5 pt-4 border-t border-slate-100">
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide block">Evolución Cronológica de las Últimas Atenciones</span>
                            <div className="h-44">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="Fecha" tick={{ fontSize: 9 }} />
                                  <YAxis domain={[0, 10]} ticks={[0,2,4,6,8,10]} tick={{ fontSize: 9 }} />
                                  <Tooltip contentStyle={{ fontSize: 11 }} />
                                  <Area type="monotone" dataKey="Calificación" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRating)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}
                        
                      </div>
                    </div>

                    {/* Operational high priority complaints warnings list inside Dashboard */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-4 h-5 text-rose-500 animate-bounce" /> Casos Críticos de Atención con Urgencia de Seguimiento
                      </h4>
                      {surveys.filter(s => s.attentionScore <= 4).length === 0 ? (
                        <p className="text-xs text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-100 font-semibold flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" /> ¡Estupendo! No se reportan fallas críticas inferiores a 4 puntos en el histórico del sistema.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {surveys.filter(s => s.attentionScore <= 4).slice(0, 3).map((crit) => (
                            <div key={crit.id} className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-rose-900">{crit.customerName}</span>
                                  <span className="text-[9px] bg-rose-650 text-white font-bold px-1.5 rounded-md">Atención: {crit.attentionScore}/10</span>
                                  <span className="text-[10px] text-slate-400 font-medium">Asignado: {crit.agentName}</span>
                                </div>
                                <p className="text-xs text-rose-800 italic leading-relaxed">
                                  "{crit.comments || 'El cliente optó por no ingresar comentarios escritos adicionales.'}"
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs shrink-0 font-bold text-rose-900">
                                <a href={`mailto:${crit.customerEmail}`} className="bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 hover:bg-rose-100/50 text-rose-700 transition-colors">
                                  ✉️ Contactar Cliente
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* -------------------- ADMIN TAB: 2. SURVEYS LIST -------------------- */}
                {adminTab === "surveys" && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                    
                    {/* Header bar and Filtering selectors */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <ListFilter className="w-4 h-4 text-blue-600" /> Registro General de Atenciones
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">Búsqueda avanzada, flujograma técnico y simulación rápida de reviews</p>
                        </div>
                        
                        {/* Rapid survey random generator demo tool */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleGenerateRandomDemoSurvey}
                            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Genera automáticamente una encuesta de servicio con comentarios realistas para auditar las alertas instantáneas y el módulo"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Simular Encuesta Demo</span>
                          </button>
                        </div>
                      </div>

                      {/* Filter sliders rows */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        
                        {/* Search keyword input */}
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                            <Search className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="Buscar cliente u observación..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs font-semibold py-2 pl-9 pr-3 border border-slate-200 rounded-lg bg-white text-slate-850 focus:outline-blue-500"
                          />
                        </div>

                        {/* User agent selection select */}
                        <select
                          value={agentFilter}
                          onChange={(e) => setAgentFilter(e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg p-2 bg-white font-semibold text-slate-700"
                        >
                          <option value="all">🔍 Todos los Oficiales de Servicio</option>
                          {AGENTS.map(a => (
                            <option key={a.name} value={a.name}>{a.name}</option>
                          ))}
                        </select>

                        {/* Rating levels select */}
                        <select
                          value={ratingFilter}
                          onChange={(e) => setRatingFilter(e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg p-2 bg-white font-semibold text-slate-700"
                        >
                          <option value="all">⭐ Todos los Niveles de Calificación</option>
                          <option value="high">🟢 Promotores Excelentes (8 pts o más)</option>
                          <option value="mid">🟡 Pasivos Neutrales (Rango 5 - 7 pts)</option>
                          <option value="low">🔴 Detractores Insatisfechos (4 pts o menos)</option>
                        </select>

                      </div>
                    </div>

                    {/* DATATABLE LIST */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                            <th className="p-4">Fecha / ID</th>
                            <th className="p-4">Detalle Cliente</th>
                            <th className="p-4">Oficial Evaluado</th>
                            <th className="p-4 text-center">Calificación</th>
                            <th className="p-4">Comentarios claves</th>
                            <th className="p-4 text-right">Controles</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredSurveys.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center p-8 text-slate-400 italic">
                                No se encontraron respuestas registradas que coincidan con sus filtros activos.
                              </td>
                            </tr>
                          ) : (
                            filteredSurveys.map((survey) => {
                              const ratingBadgeColor = survey.attentionScore >= 8 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : survey.attentionScore >= 5 
                                  ? "bg-amber-50 text-amber-700 border-amber-100" 
                                  : "bg-rose-50 text-rose-700 border-rose-100 border-rose-200";

                              return (
                                <tr key={survey.id} className="hover:bg-slate-50 transition-colors">
                                  
                                  {/* Col 1 */}
                                  <td className="p-4">
                                    <p className="font-bold text-slate-800">{new Date(survey.date).toLocaleDateString("es-ES")}</p>
                                    <p className="text-[10px] text-slate-400 font-mono tracking-tight">{survey.id}</p>
                                  </td>

                                  {/* Col 2 */}
                                  <td className="p-4 space-y-0.5">
                                    <p className="font-extrabold text-slate-800">{survey.customerName}</p>
                                    <p className="text-[10px] text-blue-600 font-medium hover:underline">
                                      <a href={`mailto:${survey.customerEmail}`}>{survey.customerEmail}</a>
                                    </p>
                                    {survey.customerPhone && (
                                      <p className="text-[9px] text-slate-400 font-medium">{survey.customerPhone}</p>
                                    )}
                                  </td>

                                  {/* Col 3 */}
                                  <td className="p-4 font-bold text-slate-700">
                                    👤 {survey.agentName}
                                  </td>

                                  {/* Col 4 */}
                                  <td className="p-4 text-center">
                                    <div className="inline-flex flex-col items-center">
                                      <span className={`px-2 py-1 font-black rounded-lg border text-sm ${ratingBadgeColor}`}>
                                        {survey.attentionScore}/10
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-bold mt-1">
                                        ⭐ {survey.speedScore} vel • ⭐ {survey.friendlinessScore} amab
                                      </span>
                                    </div>
                                  </td>

                                  {/* Col 5 */}
                                  <td className="p-4 max-w-xs">
                                    <p className="text-slate-600 leading-relaxed italic line-clamp-2" title={survey.comments}>
                                      "{survey.comments || "Sin explicación escrita."}"
                                    </p>
                                  </td>

                                  {/* Col 6 */}
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* View Simulated Email HTML block sent to administrative email */}
                                      <button
                                        onClick={() => {
                                          // Dynamically fetch the log for this survey or generate the alert HTML inline
                                          const alertHtml = `
                                            <div style="font-family: Arial, sans-serif; padding: 20px;">
                                              <p>Este es una simulación del email enviado automáticamente a <b>${mailConfig?.receiverAddress || 'joserobertoquirogasalvador@gmail.com'}</b> al responder:</p>
                                              <div style="border: 22px solid #2563eb; padding: 10px; background-color: #f8fafc;">
                                                <h3>Detalle de Atención:</h3>
                                                <p><b>Cliente:</b> ${survey.customerName}</p>
                                                <p><b>Email:</b> ${survey.customerEmail}</p>
                                                <p><b>Profesional:</b> ${survey.agentName}</p>
                                                <p><b>Calificación de la Atención:</b> ${survey.attentionScore}/10 (Promedio)</p>
                                                <p><b>Mensaje:</b> "${survey.comments || ''}"</p>
                                              </div>
                                            </div>
                                          `;
                                          setSelectedMailHtml({
                                            subject: `🚨 Alerta de Encuesta: ${survey.attentionScore}/10 de ${survey.customerName}`,
                                            body: alertHtml
                                          });
                                        }}
                                        className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg cursor-pointer transition-all"
                                        title="Ver Simulación de Notificación de Correo Enviada"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      {/* Delete action */}
                                      <button
                                        onClick={() => handleDeleteSurvey(survey.id)}
                                        className="bg-white border border-rose-150 hover:bg-rose-50 text-rose-500 p-1.5 rounded-lg cursor-pointer transition-all"
                                        title="Remover respuesta"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>

                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* -------------------- ADMIN TAB: 3. SMTP MAIL CONFIG -------------------- */}
                {adminTab === "smtp" && mailConfig && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left block form */}
                    <form onSubmit={handleMailConfigSubmit} className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-6">
                      
                      <div className="border-b border-slate-100 pb-3 flex justify-between items-center bg-white">
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Settings className="w-4 h-4 text-blue-600" /> Parámetros del Servidor de Correo
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">Configure las credenciales SMTP para enviar correos reales</p>
                        </div>
                      </div>

                      {/* Config notice feedback */}
                      {configNotice && (
                        <div className={`p-4 rounded-xl text-xs flex gap-3 leading-relaxed border ${
                          configNotice.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}>
                          {configNotice.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                          <p>{configNotice.text}</p>
                        </div>
                      )}

                      {/* Main variables inputs */}
                      <div className="space-y-4">
                        
                        {/* Simulation / Sandbox Mode choice */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mailConfig.sandboxMode}
                                onChange={(e) => setMailConfig(prev => ({ ...prev!, sandboxMode: e.target.checked }))}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              📍 Usar Simulador de Correo Local (Muy Recomendado)
                            </label>
                            <span className="bg-blue-200 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                              SEGURO
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-800 leading-normal">
                            Si está marcado, el sistema <b>procesará con éxito el envío de correos</b> internamente de modo rápido y seguro, guardando el HTML para que pueda verlo en la pestaña de logs, sin fallar si no tiene configuradas credenciales SMTP reales. Desmárquelo si desea realizar la entrega real de correos mediante un SMTP (ej: su cuenta de Gmail o Outlook).
                          </p>
                        </div>

                        {/* Connection host and Port */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Servidor Host SMTP</label>
                            <input
                              type="text"
                              disabled={mailConfig.sandboxMode}
                              placeholder="smtp.gmail.com"
                              value={mailConfig.smtpHost}
                              onChange={(e) => setMailConfig(prev => ({ ...prev!, smtpHost: e.target.value }))}
                              className="w-full text-xs font-semibold border border-slate-200 p-2.5 rounded-lg bg-slate-50 disabled:opacity-40 focus:bg-white focus:outline-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Puerto SMTP</label>
                            <input
                              type="number"
                              disabled={mailConfig.sandboxMode}
                              placeholder="587"
                              value={mailConfig.smtpPort}
                              onChange={(e) => setMailConfig(prev => ({ ...prev!, smtpPort: Number(e.target.value) }))}
                              className="w-full text-xs font-semibold border border-slate-200 p-2.5 rounded-lg bg-slate-50 disabled:opacity-40 focus:bg-white focus:outline-blue-500"
                            />
                          </div>
                        </div>

                        {/* Protocol & ssl toggle selection */}
                        <div className="flex gap-4">
                          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={mailConfig.sandboxMode}
                              checked={mailConfig.useSsl}
                              onChange={(e) => setMailConfig(prev => ({ ...prev!, useSsl: e.target.checked }))}
                              className="rounded text-blue-600 cursor-pointer disabled:opacity-40"
                            />
                            ¿Requiere SSL/TLS? (Puerto 465)
                          </label>
                        </div>

                        {/* User Credentials */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Usuario SMTP / Dirección Remitente</label>
                            <input
                              type="text"
                              disabled={mailConfig.sandboxMode}
                              placeholder="usuario.soporte@gmail.com"
                              value={mailConfig.username}
                              onChange={(e) => setMailConfig(prev => ({ ...prev!, username: e.target.value }))}
                              className="w-full text-xs font-semibold border border-slate-200 p-2.5 rounded-lg bg-slate-50 disabled:opacity-40 focus:bg-white focus:outline-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Contraseña SMTP / Clave</label>
                            <input
                              type="password"
                              disabled={mailConfig.sandboxMode}
                              placeholder="••••••••••••••••"
                              value={mailConfig.password || ""}
                              onChange={(e) => setMailConfig(prev => ({ ...prev!, password: e.target.value }))}
                              className="w-full text-xs font-semibold border border-slate-200 p-2.5 rounded-lg bg-slate-50 disabled:opacity-40 focus:bg-white focus:outline-blue-500"
                            />
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                            Destinatarios de Alertas y Reportes
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Alerta Instantánea Enviado A</label>
                              <input
                                type="email"
                                placeholder="alerta@atencion.com"
                                value={mailConfig.receiverAddress}
                                onChange={(e) => setMailConfig(prev => ({ ...prev!, receiverAddress: e.target.value }))}
                                className="w-full text-xs font-semibold border border-slate-200 p-2.5 rounded-lg bg-slate-50 focus:bg-white"
                              />
                              <p className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">
                                Recibe una alerta detallada en tiempo real por cada encuesta respondida por clientes.
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Resumen General Diario Enviado A</label>
                              <input
                                type="email"
                                placeholder="gerente@atencion.com"
                                value={mailConfig.summaryReceiverAddress}
                                onChange={(e) => setMailConfig(prev => ({ ...prev!, summaryReceiverAddress: e.target.value }))}
                                className="w-full text-xs font-semibold border border-slate-200 p-2.5 rounded-lg bg-slate-50 focus:bg-white"
                              />
                              <p className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">
                                Recibe el informe analítico de 24 horas y los insights de IA corporativa cotidianos.
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Submit action */}
                      <div className="border-t border-slate-100 pt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingConfig}
                          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-md transition-all cursor-pointer"
                        >
                          {submittingConfig ? "Guardando..." : "Guardar Configuración"}
                        </button>
                      </div>

                    </form>

                    {/* Right block: Immediate connection test execution */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 space-y-2">
                        <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                          🧪 Probar Conexión SMTP
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Dispare un correo formal de prueba inmediato a <b>{mailConfig.receiverAddress}</b> para evaluar que el servidor y los socket envíos funcionen correctamente sin demoras.
                        </p>
                      </div>

                      {testNotice && (
                        <div className={`p-3.5 rounded-xl text-xs flex gap-2 border leading-relaxed ${
                          testNotice.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}>
                          {testNotice.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-3.5 text-rose-600 shrink-0" />}
                          <p>{testNotice.text}</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleTestMailConfig}
                        disabled={testingConfig}
                        className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        {testingConfig ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Ejecutando Test SMTP...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-blue-600" />
                            <span>Enviar Email de Prueba</span>
                          </>
                        )}
                      </button>

                      <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 space-y-2 font-medium leading-normal">
                        <p>📍 <b>¿Usa Gmail?</b> Recuerde que para usar servidores públicos de Gmail requiere generar una "Contraseña de Aplicación" de 16 dígitos en las configuraciones de seguridad de su cuenta Google.</p>
                        <p>💡 <b>Truco</b>: Deje el 'Modo de simulación' encendido si desea probar todos los flujos de correo en vivo usando el visualizador integrado en la siguiente pestaña.</p>
                      </div>
                    </div>

                  </div>
                )}

                {/* -------------------- ADMIN TAB: 4. SIMULATED EMAIL LOGS -------------------- */}
                {adminTab === "maillogs" && (
                  <div className="space-y-4">
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md tracking-wider">
                          INBOX SIMULATOR & WORKFLOW OUTBOX
                        </span>
                        <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                          Registro Histórico de Mensajes Enviados
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Bandeja de auditoría interna de correos disparados (Individuales, Automáticos y Tests)</p>
                      </div>
                      
                      <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium select-none">
                        Total en cola ordinaria: <b>{mailLogs.length} correos</b>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                              <th className="p-3.5">Fecha Envío</th>
                              <th className="p-3.5">Destinatario / Recipient</th>
                              <th className="p-3.5">Asunto / Subject</th>
                              <th className="p-3.5">Tipo de Correo</th>
                              <th className="p-3.5 text-center">Estado Delivery</th>
                              <th className="p-3.5 text-right">Controles</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {mailLogs.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center p-8 text-slate-400 italic">
                                  No hay registros de envío en este canal de auditoría todavía.
                                </td>
                              </tr>
                            ) : (
                              mailLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3.5 text-slate-500 font-medium">
                                    {new Date(log.timestamp).toLocaleString("es-ES")}
                                  </td>
                                  <td className="p-3.5 font-bold text-slate-800">
                                    {log.recipient}
                                  </td>
                                  <td className="p-3.5 font-semibold text-slate-700">
                                    {log.subject}
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                                      log.emailType === "alert" ? "bg-rose-50 text-rose-700" : log.emailType === "report" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                                    }`}>
                                      {log.emailType === "alert" ? "🚨 Alerta Feedback" : log.emailType === "report" ? "📊 Reporte 24h" : "🧪 Test SMTP"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <div className="inline-flex  items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${log.isSuccess ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                                      <span className={`font-bold text-[10px] ${log.isSuccess ? "text-emerald-700" : "text-red-700"}`}>
                                        {log.isSuccess ? "Enviado / OK" : "Fallo SMTP"}
                                      </span>
                                    </div>
                                    {log.errorDetails && (
                                      <p className="text-[9px] text-rose-600 font-medium leading-none mt-1 max-w-44 truncate" title={log.errorDetails}>
                                        {log.errorDetails}
                                      </p>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => setSelectedMailHtml({ subject: log.subject, body: log.body })}
                                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Ver Email</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

                {/* -------------------- ADMIN TAB: 5. AUTOMATION -------------------- */}
                {adminTab === "automation" && (
                  <div className="space-y-6">
                    
                    {/* Core info card & executive trigger */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-8 space-y-3">
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2.5 py-0.5 rounded-md tracking-wider uppercase">
                          Cronómetro del Sistema de Calidad (Cada 24 Horas)
                        </span>
                        <h3 className="font-bold text-lg text-slate-850 tracking-tight">Reporte Ejecutivo de Desempeño Automatizado</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          La plataforma incluye un microservicio automatizado que calcula las métricas sumariadas en las últimas 24 horas (NPS general, promedios, alertas de fallos y comentarios) y le compila un reporte analítico.
                          Si tiene configurada su Clave <span className="text-blue-600 font-bold">Gemini API</span> en el servidor en la nube, la IA interpretará los comentarios críticos del público y redactará un resumen de contingencias inmediato con soluciones inteligentes.
                        </p>
                        
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600 leading-normal">
                          <Info className="w-5 h-5 text-blue-500 shrink-0" />
                          <span>
                            Con el botón de la derecha puede <b>gatillar y simular esta automatización ahora mismo</b> en lugar de esperar las 24 horas del ciclo cron regulado. Esto generará la llamada, el email formal y el log.
                          </span>
                        </div>
                      </div>

                      {/* Explicit execute action */}
                      <div className="md:col-span-4 bg-slate-50/50 p-4 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-center text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Test de Automatización</span>
                        
                        <button
                          onClick={handleTriggerAutomation}
                          disabled={triggeringAutomation}
                          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs py-3 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {triggeringAutomation ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>IA Model Generando...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Gatillar Automatización Ya</span>
                            </>
                          )}
                        </button>
                        
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Evalúa & envía a {mailConfig?.summaryReceiverAddress || 'joserobertoquirogasalvador@gmail.com'}
                        </span>
                      </div>
                    </div>

                    {automationNotice && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs font-semibold text-emerald-800 flex gap-3 leading-relaxed">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <p>{automationNotice.text}</p>
                      </div>
                    )}

                    {/* Report compilation histories */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3.5 p-5">
                      <div className="border-b border-slate-100 pb-2.5">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          📋 Historial de Resúmenes Ejecutivos Generados ({dailySummaries.length})
                        </h4>
                      </div>

                      {dailySummaries.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs italic">
                          No se han disparado reportes automáticos de 24 horas todavía en este servidor. Haga clic en "Gatillar de Automatización Ya" para compilar el primero.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {dailySummaries.map((summary) => (
                            <div key={summary.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 hover:shadow-xs transition-shadow">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                    REPORTE DIARIO DE CALIDAD
                                  </span>
                                  <span className="text-xs font-bold text-slate-700">
                                    Fecha: {new Date(summary.dateRun).toLocaleString("es-ES")}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {summary.id}</span>
                              </div>

                              {/* Executive Indicators table */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="bg-white border border-slate-150 rounded-lg p-2.5">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Respuestas Totales</p>
                                  <p className="text-lg font-extrabold text-slate-800">{summary.totalSurveysCount} encuestas</p>
                                </div>
                                <div className="bg-white border border-slate-150 rounded-lg p-2.5">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Atención Media</p>
                                  <p className="text-lg font-extrabold text-blue-600">{summary.averageAttention}/10</p>
                                </div>
                                <div className="bg-white border border-slate-150 rounded-lg p-2.5">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Nivel NPS</p>
                                  <p className="text-lg font-extrabold text-emerald-600">{summary.npsScore > 0 ? '+' : ''}{summary.npsScore}</p>
                                </div>
                                <div className="bg-white border border-slate-150 rounded-lg p-2.5">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Casos Críticos</p>
                                  <p className="text-lg font-extrabold text-rose-600">{summary.criticalAlertsCount} quejas</p>
                                </div>
                              </div>

                              {/* AI summary description block */}
                              <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-3.5 space-y-1.5">
                                <h5 className="text-[11px] font-extrabold text-blue-900 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-blue-600" /> RESUMEN DE COMPLIANCE / INTELIGENCIA OPERACIONAL:
                                </h5>
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                  {summary.aiInsightsText || "Análisis local procesado sin comentarios detallados."}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ==================== 3. EMAIL IFRAME PREVIEW POPUP MODAL ==================== */}
      <AnimatePresence>
        {selectedMailHtml && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedMailHtml(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Modal Header details */}
              <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold bg-blue-600 text-white rounded-md px-1.5 py-0.5 uppercase tracking-wider">
                    Fidelidad de Envío SMTP
                  </span>
                  <h4 className="font-bold text-xs truncate max-w-md" title={selectedMailHtml.subject}>
                    Asunto: {selectedMailHtml.subject}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedMailHtml(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold"
                >
                  Cerrar [X]
                </button>
              </div>

              {/* Scrollable Email Sandbox preview IFrame simulator */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center">
                <div 
                  className="bg-white w-full max-w-[620px] rounded-lg shadow-xs overflow-hidden border border-slate-200 p-1"
                  dangerouslySetInnerHTML={{ __html: selectedMailHtml.body }}
                />
              </div>

              {/* Footer detail */}
              <div className="bg-slate-50 border-t border-slate-200 p-3 text-center text-[10px] text-slate-400 font-medium">
                Esta es una representación exacta del HTML/CSS enviado de forma segura al buzón del Administrador.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER GENERAL CREDIT */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">
            SOPORTE TÉCNICO DE RESOLUCIÓN DE RESEÑAS • VERSIÓN 4.1
          </p>
          <p className="text-[11px] text-slate-400">
            Diseñado con React 18, Express, Nodemailer y Gemini AI Models. Almacenamiento local persistente por turnos.
          </p>
        </div>
      </footer>

    </div>
  );
}
