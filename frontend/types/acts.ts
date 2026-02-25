export type ActType = "sdacha" | "vydacha";

export type ActCondition = "ok" | "defective" | "absent" | "cosmetic";

export interface ActKitItem {
  name:       string;
  condition:  ActCondition;
  defectNote?: string | null;
}

/**
 * Payload для POST /api/acts/generate
 *
 * Изменение vs предыдущей версии:
 *   - поле `kit: string` удалено
 *   - добавлено `kitItems: ActKitItem[]` — полная матрица состояний
 */
export interface ActPayload {
  actType:       ActType;
  year:          string;
  commanderRank: string;
  commanderSign: string;
  equipmentName: string;
  serialNumber:  string;
  /** Массив позиций комплекта с состоянием каждого элемента */
  kitItems: ActKitItem[];
  /** Свободное описание дефектов (дополнительно к матрице) */
  defects?:              string | null;
  flashDriveNumbers?:    string | null;
  passNumbers?:          string | null;
  // sdacha
  surrendererRank?:      string;
  surrendererName?:      string;
  // shared
  receiverRank?:         string;
  receiverName?:         string;
  // vydacha
  issuerRank?:           string;
  issuerName?:           string;
  receiverRankShort?:    string;
  receiverLastNameInitials?: string;
}