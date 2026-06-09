import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { SurveyResponse, MailConfig, MailLog, DailySummaryReport } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// File system database setup
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Ensure DB directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const defaultMailConfig: MailConfig = {
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  useSsl: false,
  username: "demo@gmail.com",
  password: "",
  senderAddress: "alertas.atencion@empresa.com",
  receiverAddress: "joserobertoquirogasalvador@gmail.com",
  summaryReceiverAddress: "joserobertoquirogasalvador@gmail.com",
  sandboxMode: true, // Recommended local simulator checked by default
};

const initialSurveys: SurveyResponse[] = [
  {
    id: "surv-1",
    date: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: "Juan Castro",
    customerEmail: "jcastro@gmail.com",
    customerPhone: "+54 9 11 4321-9876",
    agentName: "Sofía Ramos",
    attentionScore: 9,
    speedScore: 5,
    friendlinessScore: 5,
    recommend: "highly",
    comments: "Excelente atención de Sofía. Pudo solucionar mi problema de firmware en cuestión de minutos y fue sumamente agradable durante la llamada.",
  },
  {
    id: "surv-2",
    date: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: "Adriana Pérez",
    customerEmail: "adriperezz@yahoo.com",
    customerPhone: "+54 9 11 5011-2233",
    agentName: "Carlos Mendoza",
    attentionScore: 10,
    speedScore: 4,
    friendlinessScore: 5,
    recommend: "highly",
    comments: "Carlos fue muy paciente para explicarme los pasos de configuración del módem. El servicio fue sumamente claro e impecable.",
  },
  {
    id: "surv-3",
    date: new Date(Date.now() - 2.2 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: "Roberto Gómez",
    customerEmail: "rgomez@outlook.com",
    customerPhone: "+54 9 11 3900-4455",
    agentName: "Andrés Delgado",
    attentionScore: 3,
    speedScore: 2,
    friendlinessScore: 2,
    recommend: "no",
    comments: "Tuve que esperar más de 30 minutos a que me atendieran. La señal sigue fallando después del reinicio. Necesito que asista un técnico físico a mi domicilio.",
  },
  {
    id: "surv-4",
    date: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: "Lucía Martínez",
    customerEmail: "lucia.mtz@gmail.com",
    customerPhone: "+54 9 11 6788-0099",
    agentName: "Lucia Fernández",
    attentionScore: 8,
    speedScore: 5,
    friendlinessScore: 4,
    recommend: "highly",
    comments: "Muy rápido el trámite de cambio de titular. Las chicas de atención fueron súper eficientes.",
  },
  {
    id: "surv-5",
    date: new Date(Date.now() - 0.9 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: "Mariano Soler",
    customerEmail: "msoler33@gmail.com",
    customerPhone: "+54 9 11 8899-7711",
    agentName: "Carlos Mendoza",
    attentionScore: 5,
    speedScore: 3,
    friendlinessScore: 3,
    recommend: "maybe",
    comments: "El trámite es un poco lento pero finalmente se resolvió. Carlos fue bien predispuesto pero el sistema interno de la empresa andaba caído.",
  },
  {
    id: "surv-6",
    date: new Date(Date.now() - 0.2 * 24 * 60 * 60 * 1000).toISOString(),
    customerName: "Gabriela Rossi",
    customerEmail: "gabriela.rossi@outlook.com.ar",
    customerPhone: "+54 9 11 5566-1212",
    agentName: "Sofía Ramos",
    attentionScore: 10,
    speedScore: 5,
    friendlinessScore: 5,
    recommend: "highly",
    comments: "Increíble amabilidad de Sofía Ramos. Me dio un descuento del 20% para el mes siguiente por los inconvenientes técnicos previos.",
  }
];

// Load Database from disk
function loadDb(): { surveys: SurveyResponse[]; mailConfig: MailConfig; mailLogs: MailLog[]; dailySummaries: DailySummaryReport[] } {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        surveys: parsed.surveys || initialSurveys,
        mailConfig: parsed.mailConfig || defaultMailConfig,
        mailLogs: parsed.mailLogs || [],
        dailySummaries: parsed.dailySummaries || []
      };
    }
  } catch (e) {
    console.error("Error reading db file, falling back to initial data:", e);
  }
  return {
    surveys: initialSurveys,
    mailConfig: defaultMailConfig,
    mailLogs: [],
    dailySummaries: []
  };
}

// Save Database to disk
function saveDb(data: { surveys: SurveyResponse[]; mailConfig: MailConfig; mailLogs: MailLog[]; dailySummaries: DailySummaryReport[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing data to database file:", e);
  }
}

// Setup Gemini Client lazy loaders
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && geminiApiKey) {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  }
  return aiClient;
}

// Generate elegant HTML Email Body for real-time alert
function buildAlertEmailHtml(survey: SurveyResponse): string {
  const scoreColor = survey.attentionScore >= 8 ? "#16a34a" : survey.attentionScore >= 5 ? "#ca8a04" : "#dc2626";
  const recommendLabel = survey.recommend === "highly" ? "✅ Sí, Altamente" : survey.recommend === "maybe" ? "⚠️ Podría ser" : "❌ No, Insatisfecho";
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold; tracking-tight">Nueva Reseña de Atención Recibida</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Notificación Automática del Sistema</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.05em;">Calificación Promedio</p>
          <div style="font-size: 48px; font-weight: 800; color: ${scoreColor}; margin: 8px 0;">${survey.attentionScore}<span style="font-size: 20px; color: #94a3b8;">/10</span></div>
          <span style="background-color: ${scoreColor}15; color: ${scoreColor}; padding: 6px 12px; rounded: 9999px; font-size: 11px; font-weight: bold; border-radius: 100px;">
            ${survey.attentionScore >= 8 ? "PROMOTER / EXCELENTE" : survey.attentionScore >= 5 ? "PASSIVE / ACEPTABLE" : "DETRACTOR / CRÍTICO"}
          </span>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500; width: 40%;">👤 Cliente:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: bold; text-align: right;">${survey.customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">✉️ Email Cliente:</td>
            <td style="padding: 10px 0; color: #2563eb; text-align: right;"><a href="mailto:${survey.customerEmail}" style="text-decoration: none; color: #2563eb;">${survey.customerEmail}</a></td>
          </tr>
          ${survey.customerPhone ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">📞 Teléfono:</td>
            <td style="padding: 10px 0; color: #0f172a; text-align: right;">${survey.customerPhone}</td>
          </tr>` : ""}
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">👨‍💼 Oficial de Atención:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: bold; text-align: right;">${survey.agentName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">⚡ Velocidad de Servicio:</td>
            <td style="padding: 10px 0; color: #ca8a04; text-align: right; font-weight: bold;">${"★".repeat(survey.speedScore)}${"☆".repeat(5-survey.speedScore)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">🤝 Amabilidad percibida:</td>
            <td style="padding: 10px 0; color: #ca8a04; text-align: right; font-weight: bold;">${"★".repeat(survey.friendlinessScore)}${"☆".repeat(5-survey.friendlinessScore)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">📢 ¿Recomendaría:</td>
            <td style="padding: 10px 0; text-align: right; font-weight: bold;">${recommendLabel}</td>
          </tr>
        </table>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #475569; text-transform: uppercase;">Comentarios y Feedback adicional:</h4>
          <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #334155; font-style: italic;">
            "${survey.comments || "Sin comentarios adicionales por el cliente."}"
          </p>
        </div>
        
        <div style="font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          Recibido el ${new Date(survey.date).toLocaleString("es-ES")} • ID: ${survey.id}
        </div>
      </div>
    </div>
  `;
}

// Generate the complex Daily executive summary email
function buildDailySummaryEmailHtml(
  reportDate: string, 
  surveys: SurveyResponse[], 
  stats: any, 
  aiInsights: string
): string {
  // Build table list of the surveys
  let surveyRowsHtml = "";
  surveys.forEach((s) => {
    const emotionColor = s.attentionScore >= 8 ? "#16a34a" : s.attentionScore >= 5 ? "#ca8a04" : "#dc2626";
    surveyRowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
        <td style="padding: 10px 8px; color: #475569; font-weight: bold;">${s.customerName}</td>
        <td style="padding: 10px 8px; color: #334155;">${s.agentName}</td>
        <td style="padding: 10px 8px; text-align: center; color: ${emotionColor}; font-weight: bold;">${s.attentionScore}/10</td>
        <td style="padding: 10px 8px; color: #64748b; font-style: italic; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.comments}">
          ${s.comments || "<i>Sin comentarios</i>"}
        </td>
      </tr>
    `;
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background-color: #0f172a; color: white; padding: 30px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8;">Resumen Ejecutivo de Atención de Servicio</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">Reporte General de Desempeño Técnico y Satisfacción de Encuestas</p>
        <span style="display: inline-block; margin-top: 12px; background-color: #334155; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
          Periodo 24 Horas: ${reportDate}
        </span>
      </div>

      <div style="padding: 24px; background-color: #f8fafc;">
        <!-- KPI Block -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px; justify-content: space-between;">
          <div style="flex: 1; min-width: 100px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Encuestas</p>
            <p style="margin: 6px 0 0 0; font-size: 28px; font-weight: 800; color: #0f172a;">${stats.totalCount}</p>
          </div>
          <div style="flex: 1; min-width: 100px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Atención Promedio</p>
            <div style="margin: 6px 0 0 0; font-size: 28px; font-weight: 800; color: #2563eb;">${stats.avgAttention}<span style="font-size: 14px; text-align: center; color: #94a3b8;">/10</span></div>
          </div>
          <div style="flex: 1; min-width: 100px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Net Promoter (NPS)</p>
            <p style="margin: 6px 0 0 0; font-size: 28px; font-weight: 800; color: ${stats.nps >= 50 ? '#16a34a' : stats.nps >= 0 ? '#ca8a04' : '#dc2626'};">${stats.nps > 0 ? '+' : ''}${stats.nps}</p>
          </div>
        </div>

        <!-- AI Insights -->
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #1e40af; display: flex; align-items: center; gap: 6px;">
            🤖 Análisis Inteligente de Satisfacción (Gemini AI Insights)
          </h2>
          <div style="font-size: 13.5px; color: #1e3a8a; line-height: 1.6; white-space: pre-line;">
            ${aiInsights}
          </div>
        </div>

        <!-- Surveys Datatable list -->
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <h3 style="margin: 0; padding: 16px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: bold; color: #1e293b;">
            📋 Desglose de Encuestas Recibidas en las Últimas 24 Horas (${surveys.length})
          </h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569;">
                  <th style="padding: 12px 8px;">Cliente</th>
                  <th style="padding: 12px 8px;">Asesora/Técnico</th>
                  <th style="padding: 12px 8px; text-align: center;">Atención</th>
                  <th style="padding: 12px 8px;">Comentarios</th>
                </tr>
              </thead>
              <tbody>
                ${surveys.length === 0 ? `
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
                      No se registraron nuevas encuestas en este periodo de 24 horas.
                    </td>
                  </tr>
                ` : surveyRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Important business signals (Under 5 score warning) -->
        ${stats.criticalAlertsCount > 0 ? `
          <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; font-size: 13.5px; font-weight: bold; color: #991b1b;">
              🚨 Alertas con Calificación Críticamente Baja (&lt; 5 puntos)
            </h3>
            <p style="margin: 0; font-size: 12px; color: #7f1d1d; line-height: 1.5;">
              Se han detectado <b>${stats.criticalAlertsCount} encuestas insatisfechas</b> en este informe. Le sugerimos al área de operaciones de atención ponerse en contacto presencial o telefónico con estos clientes urgentemente para resolver estas contingencias.
            </p>
          </div>
        ` : ""}

        <!-- Footer -->
        <div style="border-top: 1px solid #cbd5e1; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; font-style: italic;">
          Automatización de Resumen Ejecutivo • Enviado de forma segura desde el Servidor de Atenciones.
        </div>
      </div>
    </div>
  `;
}

// Nodemailer real SMTP sending wrap logic
async function sendEmail(config: MailConfig, recipient: string, subject: string, htmlBody: string, emailType: "alert" | "report" | "test"): Promise<MailLog> {
  const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();

  // If Sandbox mode is active, do not attempt to establish real connection to socket. Save to local State block
  if (config.sandboxMode) {
    return {
      id: logId,
      timestamp,
      recipient,
      subject,
      body: htmlBody,
      isSuccess: true,
      emailType,
      errorDetails: "Modo simulador local activado. El correo se procesó con éxito y se puede ver directamente en el panel de logs."
    };
  }

  try {
    if (!config.smtpHost || !config.username) {
      throw new Error("No se han configurado los parámetros mínimos para el servidor SMTP (Servidor u Usuario vacíos).");
    }

    // Configure the real transporter dynamically
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort),
      secure: Boolean(config.useSsl), // true for port 465, false for 587 or other ports
      auth: {
        user: config.username,
        pass: config.password || "",
      },
      tls: {
        rejectUnauthorized: false // Avoid blocking self-signed or standard free mail hosts
      }
    });

    console.log(`Intentando enviar correo real a ${recipient} desde ${config.senderAddress}...`);
    
    await transporter.sendMail({
      from: `"${config.senderAddress || 'Servidor de Alertas'}" <${config.username}>`,
      to: recipient,
      subject: subject,
      html: htmlBody,
    });

    console.log(`Correo enviado exitosamente a ${recipient}!`);

    return {
      id: logId,
      timestamp,
      recipient,
      subject,
      body: htmlBody,
      isSuccess: true,
      emailType
    };
  } catch (error: any) {
    console.error("Error al enviar correo SMTP real:", error);
    return {
      id: logId,
      timestamp,
      recipient,
      subject,
      body: htmlBody,
      isSuccess: false,
      emailType,
      errorDetails: error.message || "Fallo genérico de autenticación SMTP."
    };
  }
}

// Automated 24h calculations
async function executeDailyAutomation(db: any): Promise<{ summaryReport: DailySummaryReport; mailLog: MailLog }> {
  const now = new Date();
  
  // Calculate average rating list in the last 24h
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const surveysToday = db.surveys.filter((s: SurveyResponse) => new Date(s.date) >= last24h);

  // Calculate statistics
  const totalCount = surveysToday.length;
  let avgAttention = 0;
  let promoters = 0;
  let detractors = 0;
  let criticalAlertsCount = 0;

  if (totalCount > 0) {
    const sum = surveysToday.reduce((acc: number, s: SurveyResponse) => acc + s.attentionScore, 0);
    avgAttention = parseFloat((sum / totalCount).toFixed(1));

    surveysToday.forEach((s: SurveyResponse) => {
      if (s.attentionScore >= 9) promoters++;
      if (s.attentionScore <= 6) detractors++;
      if (s.attentionScore <= 4) criticalAlertsCount++;
    });
  }

  // NPS = % Promoters - % Detractors
  const nps = totalCount > 0 ? Math.round(((promoters - detractors) / totalCount) * 100) : 0;

  const stats = {
    totalCount,
    avgAttention,
    nps,
    criticalAlertsCount
  };

  // Generate Gemini custom smart executive insights if API key is active
  let aiInsightsText = "";
  const ai = getAi();
  if (ai) {
    try {
      console.log("Generando reporte de IA con Gemini...");
      const textComments = surveysToday.map((s: SurveyResponse) => `- Cliente ${s.customerName} atendido por ${s.agentName}: Calificación ${s.attentionScore}/10. Comentarios: "${s.comments}"`).join("\n");
      
      const prompt = `Analiza las siguientes encuestas de la jornada y redacta un resumen ejecutivo formal de satisfacción de atención en español para la gerencia general de la empresa.
Estructura el resumen con tres partes claras de tono analítico y propositivo:
1. Resumen general de la opinión de los usuarios el día de hoy (fortalezas encontradas).
2. Puntos críticos descubiertos o quejas a subsanar de forma prioritaria.
3. Propuesta rápida de mejora operativa basada exclusivamente en los comentarios recopilados.

Encuestas del día:
${textComments || "No se recibieron nuevas encuestas en las últimas 24 horas."}

Sé conciso (máximo 250 palabras). Evita formalismos inútiles o textos de relleno corporativo.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.6,
        }
      });

      aiInsightsText = response.text?.trim() || "Insights de IA vacíos del modelo.";
    } catch (e: any) {
      console.error("Fallo al llamar a Gemini API en la automatización, usando plantilla analítica local:", e);
      aiInsightsText = generateLocalFallbackInsights(surveysToday, stats);
    }
  } else {
    aiInsightsText = generateLocalFallbackInsights(surveysToday, stats);
  }

  const reportDateStr = now.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const htmlReport = buildDailySummaryEmailHtml(reportDateStr, surveysToday, stats, aiInsightsText);
  
  // Create and add report logic
  const reportObj: DailySummaryReport = {
    id: `rep-${Date.now()}`,
    dateRun: now.toISOString(),
    totalSurveysCount: totalCount,
    averageAttention: avgAttention,
    npsScore: nps,
    criticalAlertsCount,
    aiInsightsText
  };

  const mailLog = await sendEmail(
    db.mailConfig,
    db.mailConfig.summaryReceiverAddress,
    `📊 Resumen Diario Ejecutivo de Atenciones - ${reportDateStr}`,
    htmlReport,
    "report"
  );

  return {
    summaryReport: reportObj,
    mailLog
  };
}

// Generate static smart insights in case Gemini is not configured
function generateLocalFallbackInsights(surveys: SurveyResponse[], stats: any): string {
  if (surveys.length === 0) {
    return "No se ha registrado ninguna encuesta en las últimas 24 horas. La interacción de los clientes permanece estable sin llamadas ni informes reportados. Se recomienda verificar los canales de distribución públicos para invitar a los clientes a dejar sus reseñas.";
  }

  let insights = `<b>Estado de Satisfacción:</b> Con un promedio global de atención de ${stats.avgAttention}/10 y un índice NPS de ${stats.nps}, el desempeño de la jornada muestra estabilidad.
  
<b>Puntos a destacar:</b>
`;

  // Filter good agents
  const highRatings = surveys.filter(s => s.attentionScore >= 8);
  if (highRatings.length > 0) {
    const agents = highRatings.map(s => s.agentName);
    const uniqueAgents = [...new Set(agents)];
    insights += `- Excelente respuesta del cliente hacia la atención brindada por ${uniqueAgents.join(", ")}, destacando amabilidad e interés.\n`;
  }

  const criticalRatings = surveys.filter(s => s.attentionScore <= 5);
  if (criticalRatings.length > 0) {
    insights += `\n<b>Áreas de Atención Crítica:</b>\n`;
    criticalRatings.forEach(s => {
      insights += `- Alerta con ${s.customerName} (atendido por ${s.agentName}): Calificación ${s.attentionScore}/10. Detalle: "${s.comments || 'Sin comentarios'}"\n`;
    });
    insights += `\n<b>Recomendación Inmediata:</b> Se sugiere que el líder de área se contacte presencialmente con el equipo técnico para revisar las demoras en el flujo del servicio y capacitar en tiempos de respuesta.`;
  } else {
    insights += `\n<b>Evaluación de contingencias:</b> No se registran alertas críticas de baja calificación en el día. Se sugiere seguir manteniendo el protocolo y motivar al staff.`;
  }

  return insights;
}

// Set up 24 hour interval trigger
function startBackgroundAutomationTimer() {
  const INTERVAL_24H = 24 * 60 * 60 * 1000;
  console.log("Activando cronómetro de automatización en segundo plano (Frecuencia: Cada 24 horas y al iniciar)");
  
  setInterval(async () => {
    try {
      console.log("Iniciando ciclo automático programado cada 24 horas...");
      const db = loadDb();
      const result = await executeDailyAutomation(db);
      
      db.dailySummaries.unshift(result.summaryReport);
      db.mailLogs.unshift(result.mailLog);
      
      saveDb(db);
      console.log("Servicio automático diario completado y guardado en disco con éxito.");
    } catch (e) {
      console.error("Excepción crítica en la automatización diaria en segundo plano:", e);
    }
  }, INTERVAL_24H);
}

// Start Background Automation Scheduler on boot
startBackgroundAutomationTimer();

// ---------------- API ENDPOINTS ----------------

// GET ALL SURVEYS
app.get("/api/surveys", (req, res) => {
  const db = loadDb();
  res.json(db.surveys);
});

// SUBMIT NEW SURVEY (CUSTOMER SIDE)
app.post("/api/surveys", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, agentName, attentionScore, speedScore, friendlinessScore, recommend, comments } = req.body;

    if (!customerName || !customerEmail || !agentName || !attentionScore) {
      return res.status(400).json({ error: "Faltan requerimientos obligatorios (Nombre, Email, Agente, Calificación de Atención)." });
    }

    const db = loadDb();

    const newSurvey: SurveyResponse = {
      id: `surv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      customerName: String(customerName).trim(),
      customerEmail: String(customerEmail).trim().toLowerCase(),
      customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
      agentName: String(agentName).trim(),
      attentionScore: Number(attentionScore),
      speedScore: Number(speedScore),
      friendlinessScore: Number(friendlinessScore),
      recommend: recommend || "maybe",
      comments: comments ? String(comments).trim() : "",
    };

    // Save Survey to database list
    db.surveys.unshift(newSurvey);

    // Build immediate alarm email notification body
    const emailSubject = `🚨 Reseña de Atención Recibida: ${newSurvey.attentionScore}/10 de ${newSurvey.customerName} (${newSurvey.agentName})`;
    const emailHtmlBody = buildAlertEmailHtml(newSurvey);

    // Send immediate email notification to configured alert receiver
    const mailLog = await sendEmail(
      db.mailConfig,
      db.mailConfig.receiverAddress,
      emailSubject,
      emailHtmlBody,
      "alert"
    );

    // Add log entry to list
    db.mailLogs.unshift(mailLog);

    saveDb(db);

    return res.status(201).json({
      success: true,
      survey: newSurvey,
      emailSent: mailLog.isSuccess,
      simulated: db.mailConfig.sandboxMode,
      log: mailLog
    });
  } catch (error: any) {
    console.error("Error submitting survey response:", error);
    res.status(500).json({ error: "Fallo al almacenar la encuesta", details: error.message });
  }
});

// DELETE INDIVIDUAL SURVEY RESPONSE
app.delete("/api/surveys/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = loadDb();
    
    const originalLength = db.surveys.length;
    db.surveys = db.surveys.filter((s) => s.id !== id);

    if (db.surveys.length === originalLength) {
      return res.status(404).json({ error: "No se encontró enlace con el ID provisto." });
    }

    saveDb(db);
    res.json({ success: true, message: "Encuesta eliminada correctamente de los historiales." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET MAIL CONFIGURATION
app.get("/api/mail-config", (req, res) => {
  const db = loadDb();
  // Don't leak raw password entirely for safety if needed, but since it's a closed config page, return masked or clear. Let's return clear for direct editing.
  res.json(db.mailConfig);
});

// POST AND SAVE MAIL CONFIGURATION
app.post("/api/mail-config", (req, res) => {
  try {
    const db = loadDb();
    db.mailConfig = {
      ...db.mailConfig,
      ...req.body
    };
    saveDb(db);
    res.json({ success: true, config: db.mailConfig });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// TEST EMAIL TRANSPORT CONFIGURATION INSTANTLY
app.post("/api/mail-config/test", async (req, res) => {
  try {
    const db = loadDb();
    const testConfig: MailConfig = {
      ...db.mailConfig,
      ...req.body
    };

    const testSubject = "🧪 Conexión de Prueba: Escritor de Atenciones Word/Surveys";
    const testBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px dashed #3b82f6; border-radius: 8px; padding: 24px; text-align: center;">
        <h2 style="color: #2563eb; margin: 0 0 10px 0;">¡Conexión Exitosa con el Servidor!</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Has configurado exitosamente tus políticas SMTP de correos. Las alertas instantáneas por comentarios de clientes y los resúmenes de 24 horas se enviarán de forma segura a partir de este momento.
        </p>
        <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin-top: 10px; font-weight: bold;">
          Soporte Técnico de Solución de Reseñas
        </span>
      </div>
    `;

    const log = await sendEmail(testConfig, testConfig.receiverAddress, testSubject, testBody, "test");
    
    // Log the test mail
    db.mailLogs.unshift(log);
    saveDb(db);

    res.json({
      success: log.isSuccess,
      log: log
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET MAIL SENT LOGS
app.get("/api/mail-logs", (req, res) => {
  const db = loadDb();
  res.json(db.mailLogs);
});

// GET DAILY SUMMARIES HISTORY
app.get("/api/daily-summaries", (req, res) => {
  const db = loadDb();
  res.json(db.dailySummaries);
});

// TRIGGER THE 24-HOUR AUTOMATION EXECUTIVELY ON-DEMAND
app.post("/api/automation/trigger", async (req, res) => {
  try {
    const db = loadDb();
    console.log("Gatillando automatización premium en demanda por el Administrador...");
    
    const result = await executeDailyAutomation(db);
    
    db.dailySummaries.unshift(result.summaryReport);
    db.mailLogs.unshift(result.mailLog);
    
    saveDb(db);

    res.json({
      success: true,
      report: result.summaryReport,
      log: result.mailLog
    });
  } catch (error: any) {
    console.error("Fallo al gatillar la automatización bajo demanda:", error);
    res.status(500).json({ error: "Fallo de ejecución automática", details: error.message });
  }
});

// SEED / RESET DB TO DUMMY VALUES FOR RE-TESTING
app.post("/api/surveys/reset", (req, res) => {
  try {
    const data = {
      surveys: initialSurveys,
      mailConfig: defaultMailConfig,
      mailLogs: [],
      dailySummaries: []
    };
    saveDb(data);
    res.json({ success: true, message: "Base de datos restaurada al modo inicial." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Setup Vite Dev Server / Static Asset delivery
async function init() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Serving application in development mode with active proxies");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static product assets from production build folder");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express customer review server running on port ${PORT}`);
  });
}

init().catch((err) => {
  console.error("Failed to bootstrap fullstack Express server:", err);
});
