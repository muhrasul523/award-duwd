export type EntityType = 'DPW' | 'DPD';

export type MaterialType = 'Link' | 'Video' | 'PDF/PPT';

export interface MasterEntity {
  id: string;
  code: string;
  type: EntityType;
  name: string;
  province: string;
}

export interface MasterJudge {
  id: string;
  code: 'A' | 'B' | 'C';
  label: string;
  name: string;
  title: string;
  whatsapp: string;
}

export interface MasterIndicator {
  id: string;
  order: number;
  name: string;
  description: string;
  weight: number;
}

export interface MaterialItem {
  id: string;
  type: MaterialType;
  title: string;
  url: string;
  driveFileId?: string;
  uploadedFileName?: string;
  uploadedFileSize?: number;
}

export interface ParticipantSubmission {
  id: string;
  entityId: string;
  entityType: EntityType;
  entityName: string;
  province: string;
  innovationTitle: string;
  materialType: MaterialType;
  materialUrl: string;
  uploadedFileName?: string;
  uploadedFileSize?: number;
  materials?: MaterialItem[];
  notes: string;
  submittedAt: string;
  updatedAt: string;
}

export interface JudgeScoreRecord {
  id: string;
  participantId: string;
  judgeId: string;
  scores: Record<string, number>;
  notes: string;
  updatedAt: string;
}

export interface JudgeMatrixCell {
  judgeId: string;
  judgeCode: 'A' | 'B' | 'C';
  judgeName: string;
  hasScored: boolean;
  rawScores: Record<string, number | null>;
  weightedScores: Record<string, number | null>;
  judgeTotalWeighted: number | null;
  notes: string;
  updatedAt: string | null;
}

export type TieBreakerResolution =
  | 'NONE'
  | 'HIGHEST_WEIGHT_INDICATOR'
  | 'HIGHEST_WEIGHT_AVG_RAW_ALL_JUDGES'
  | 'DELIBERATION_REQUIRED';

export interface LeaderboardEntry {
  rank: number;
  isTiedForRank: boolean;
  tieBreakerRule: TieBreakerResolution;
  tieBreakerNote: string | null;
  participant: ParticipantSubmission;
  judgesScoredCount: number;
  totalJudgesCount: number;
  scoredJudgeCodes: string[];
  finalScore: number;
  highestIndicatorId: string;
  highestIndicatorName: string;
  highestIndicatorWeight: number;
  highestIndicatorWeightedScore: number;
  highestIndicatorAvgRawAllJudges: number;
  indicatorAveragesRaw: Record<string, number | null>;
  indicatorAveragesWeighted: Record<string, number | null>;
  judgeMatrix: JudgeMatrixCell[];
}

export interface AwardDatabase {
  entities: MasterEntity[];
  judges: MasterJudge[];
  indicators: MasterIndicator[];
  participants: ParticipantSubmission[];
  scores: JudgeScoreRecord[];
}

export interface BootstrapResponse extends AwardDatabase {
  leaderboard: LeaderboardEntry[];
  driveFolderConfigured?: boolean;
}
