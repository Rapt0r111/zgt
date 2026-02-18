export type ActType = "sdacha" | "vydacha";

export interface ActPayload {
  actType: ActType;
  year: string;
  commanderRank: string;
  commanderSign: string;
  equipmentName: string;
  serialNumber: string;
  /** Comma-separated kit items */
  kit: string;
  defects?: string | null;
  // Флешки и пропуска (номера/серийники через запятую, уже отформатированные)
  flashDriveNumbers?: string | null;
  passNumbers?: string | null;
  // sdacha
  surrendererRank?: string;
  surrendererName?: string;
  // shared
  receiverRank?: string;
  receiverName?: string;
  // vydacha
  issuerRank?: string;
  issuerName?: string;
  receiverRankShort?: string;
  receiverLastNameInitials?: string;
}