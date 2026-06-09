export interface SurveyResponse {
  id: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  agentName: string;            // The staff member being rated
  attentionScore: number;       // 1 - 10
  speedScore: number;           // 1 - 5
  friendlinessScore: number;     // 1 - 5
  recommend: "highly" | "maybe" | "no"; // Promoter, Passive, Detractor
  comments: string;
}

export interface MailConfig {
  smtpHost: string;
  smtpPort: number;
  useSsl: boolean;
  username: string;
  password?: string;
  senderAddress: string;
  receiverAddress: string;      // Receives real-time alerts
  summaryReceiverAddress: string; // Receives the 24h reports
  sandboxMode: boolean;         // If true, just log emails to local state instead of failing real connection
}

export interface MailLog {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  body: string;                 // HTML string representing email content
  isSuccess: boolean;
  errorDetails?: string;
  emailType: "alert" | "report" | "test";
}

export interface DailySummaryReport {
  id: string;
  dateRun: string;
  totalSurveysCount: number;
  averageAttention: number;
  npsScore: number;
  criticalAlertsCount: number;
  aiInsightsText?: string;
}
