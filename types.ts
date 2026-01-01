
export interface UnitData {
  id: string;
  name: string;
  loadPercent: number;
  realDispMW: number;
  inRPF: boolean;
  rpfMarginMW: number;
  inRSF: boolean;
  rsfMarginMW: number;
  totalMarginMW: number;
}

export interface AppState {
  units: UnitData[];
  globalRPFPercent: number;
  globalRSFPercent: number;
  programmedPowerMW: number;
}

export interface ExtractionResult {
  units: { name: string; loadPercent: number }[];
  globalRPF: number;
  globalRSF: number;
  programmedMW: number;
}
