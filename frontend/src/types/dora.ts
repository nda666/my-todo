export interface DoraMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DoraSuggestedAction {
  type: string;
  title: string;
  description: string;
  targetUserKode: string;
  startDate?: string;
  endDate?: string;
}

export interface DoraResponse {
  reply: string;
  suggestedAction: DoraSuggestedAction | null;
}
