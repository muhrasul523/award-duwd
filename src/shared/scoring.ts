import type {
  JudgeMatrixCell,
  JudgeScoreRecord,
  LeaderboardEntry,
  MasterIndicator,
  MasterJudge,
  MaterialItem,
  ParticipantSubmission,
  TieBreakerResolution,
} from './types.ts';

export function normalizeWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('8')) {
    return '0' + digits;
  }
  return digits;
}

export function extractJudgeAccessCode(whatsapp: string): string {
  const digits = normalizeWhatsApp(whatsapp).replace(/\D/g, '');
  if (digits.length < 6) return '';
  return digits.slice(-6);
}

export function getParticipantMaterials(participant: ParticipantSubmission): MaterialItem[] {
  if (Array.isArray(participant.materials) && participant.materials.length > 0) {
    return participant.materials.filter((m) => m && m.url && m.url.trim() !== '');
  }
  if (participant.materialUrl && participant.materialUrl.trim() !== '') {
    return [
      {
        id: `${participant.id}-mat-1`,
        type: participant.materialType,
        title: participant.uploadedFileName || `Bahan ${participant.materialType}`,
        url: participant.materialUrl,
        uploadedFileName: participant.uploadedFileName,
        uploadedFileSize: participant.uploadedFileSize,
      },
    ];
  }
  return [];
}

export function formatWhatsAppDisplay(wa: string): string {
  const norm = normalizeWhatsApp(wa);
  if (norm.length < 10) return wa;
  return `${norm.slice(0, 4)}-${norm.slice(4, 8)}-${norm.slice(8)}`;
}

export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function roundToFour(num: number): number {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

export function computeWeightedScore(rawScore: number, weightPercent: number): number {
  const clamped = Math.max(0, Math.min(100, rawScore));
  return roundToTwo(clamped * (weightPercent / 100));
}

export function computeJudgeTotalWeighted(
  rawScores: Record<string, number>,
  indicators: MasterIndicator[]
): number {
  let sum = 0;
  for (const ind of indicators) {
    const raw = rawScores[ind.id] ?? 0;
    sum += Math.max(0, Math.min(100, raw)) * (ind.weight / 100);
  }
  return roundToTwo(sum);
}

export function computeLeaderboard(
  participants: ParticipantSubmission[],
  judges: MasterJudge[],
  indicators: MasterIndicator[],
  scores: JudgeScoreRecord[]
): LeaderboardEntry[] {
  const sortedIndicators = [...indicators].sort((a, b) => a.order - b.order);
  const highestIndicator =
    [...sortedIndicators].sort((a, b) => b.weight - a.weight || a.order - b.order)[0] ??
    sortedIndicators[0];

  const entries: LeaderboardEntry[] = participants.map((participant) => {
    const participantScores = scores.filter((s) => s.participantId === participant.id);

    const judgeMatrix: JudgeMatrixCell[] = judges.map((judge) => {
      const record = participantScores.find((s) => s.judgeId === judge.id);
      const rawScores: Record<string, number | null> = {};
      const weightedScores: Record<string, number | null> = {};

      if (!record) {
        for (const ind of sortedIndicators) {
          rawScores[ind.id] = null;
          weightedScores[ind.id] = null;
        }
        return {
          judgeId: judge.id,
          judgeCode: judge.code,
          judgeName: judge.name,
          hasScored: false,
          rawScores,
          weightedScores,
          judgeTotalWeighted: null,
          notes: '',
          updatedAt: null,
        };
      }

      let judgeTotalExact = 0;
      for (const ind of sortedIndicators) {
        const rawVal = typeof record.scores[ind.id] === 'number' ? record.scores[ind.id] : 0;
        const clamped = Math.max(0, Math.min(100, rawVal));
        const weighted = clamped * (ind.weight / 100);
        rawScores[ind.id] = clamped;
        weightedScores[ind.id] = roundToTwo(weighted);
        judgeTotalExact += weighted;
      }

      return {
        judgeId: judge.id,
        judgeCode: judge.code,
        judgeName: judge.name,
        hasScored: true,
        rawScores,
        weightedScores,
        judgeTotalWeighted: roundToTwo(judgeTotalExact),
        notes: record.notes || '',
        updatedAt: record.updatedAt,
      };
    });

    const scoredCells = judgeMatrix.filter((j) => j.hasScored);
    const judgesScoredCount = scoredCells.length;
    const scoredJudgeCodes = scoredCells.map((j) => j.judgeCode);

    const indicatorAveragesRaw: Record<string, number | null> = {};
    const indicatorAveragesWeighted: Record<string, number | null> = {};

    for (const ind of sortedIndicators) {
      if (judgesScoredCount === 0) {
        indicatorAveragesRaw[ind.id] = null;
        indicatorAveragesWeighted[ind.id] = null;
      } else {
        const sumRaw = scoredCells.reduce(
          (acc, cell) => acc + (cell.rawScores[ind.id] ?? 0),
          0
        );
        const avgRaw = sumRaw / judgesScoredCount;
        indicatorAveragesRaw[ind.id] = roundToTwo(avgRaw);
        indicatorAveragesWeighted[ind.id] = roundToTwo(avgRaw * (ind.weight / 100));
      }
    }

    let finalScore = 0;
    if (judgesScoredCount > 0) {
      const exactTotalAcrossJudges = scoredCells.reduce((acc, cell) => {
        let cellExact = 0;
        for (const ind of sortedIndicators) {
          cellExact += (cell.rawScores[ind.id] ?? 0) * (ind.weight / 100);
        }
        return acc + cellExact;
      }, 0);
      finalScore = roundToTwo(exactTotalAcrossJudges / judgesScoredCount);
    }

    const highestIndicatorWeightedScore =
      judgesScoredCount > 0 && highestIndicator
        ? roundToTwo(
            scoredCells.reduce(
              (acc, cell) =>
                acc + (cell.rawScores[highestIndicator.id] ?? 0) * (highestIndicator.weight / 100),
              0
            ) / judgesScoredCount
          )
        : 0;

    // Rule 3: Rata-rata nilai murni seluruh juri (dividing by total master judges) on highest-weight indicator
    const highestIndicatorAvgRawAllJudges =
      judges.length > 0 && highestIndicator
        ? roundToFour(
            scoredCells.reduce(
              (acc, cell) => acc + (cell.rawScores[highestIndicator.id] ?? 0),
              0
            ) / judges.length
          )
        : 0;

    return {
      rank: 0,
      isTiedForRank: false,
      tieBreakerRule: 'NONE' as TieBreakerResolution,
      tieBreakerNote: null,
      participant,
      judgesScoredCount,
      totalJudgesCount: judges.length,
      scoredJudgeCodes,
      finalScore,
      highestIndicatorId: highestIndicator?.id ?? '',
      highestIndicatorName: highestIndicator?.name ?? '',
      highestIndicatorWeight: highestIndicator?.weight ?? 0,
      highestIndicatorWeightedScore,
      highestIndicatorAvgRawAllJudges,
      indicatorAveragesRaw,
      indicatorAveragesWeighted,
      judgeMatrix,
    };
  });

  // Sort using the 4-tier tie-breaker rules
  entries.sort((a, b) => {
    // 1. Nilai akhir tertinggi
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    // 2. Bandingkan nilai pada indikator dengan bobot tertinggi
    if (b.highestIndicatorWeightedScore !== a.highestIndicatorWeightedScore) {
      return b.highestIndicatorWeightedScore - a.highestIndicatorWeightedScore;
    }
    // 3. Bandingkan rata-rata nilai murni seluruh juri pada indikator tersebut
    if (b.highestIndicatorAvgRawAllJudges !== a.highestIndicatorAvgRawAllJudges) {
      return b.highestIndicatorAvgRawAllJudges - a.highestIndicatorAvgRawAllJudges;
    }
    // 4. Seri mutlak -> musyawarah dewan juri (stable sort by submittedAt)
    return a.participant.submittedAt.localeCompare(b.participant.submittedAt);
  });

  // Assign ranks and annotate tie-breaker metadata transparently
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    const curr = entries[i];
    if (i === 0) {
      curr.rank = 1;
    } else {
      const prev = entries[i - 1];
      const exactTieAllMetrics =
        curr.finalScore === prev.finalScore &&
        curr.highestIndicatorWeightedScore === prev.highestIndicatorWeightedScore &&
        curr.highestIndicatorAvgRawAllJudges === prev.highestIndicatorAvgRawAllJudges &&
        curr.judgesScoredCount > 0 &&
        prev.judgesScoredCount > 0;

      if (exactTieAllMetrics) {
        curr.rank = prev.rank;
        curr.isTiedForRank = true;
        prev.isTiedForRank = true;
        curr.tieBreakerRule = 'DELIBERATION_REQUIRED';
        prev.tieBreakerRule = 'DELIBERATION_REQUIRED';
        curr.tieBreakerNote = 'Seri mutlak · Memerlukan Musyawarah Dewan Juri';
        prev.tieBreakerNote = 'Seri mutlak · Memerlukan Musyawarah Dewan Juri';
      } else {
        currentRank = i + 1;
        curr.rank = currentRank;
      }
    }
  }

  // Mark pairs that shared the same finalScore (> 0) and were separated by Rule 2 or Rule 3
  for (let i = 0; i < entries.length; i++) {
    const curr = entries[i];
    if (curr.finalScore <= 0 || curr.tieBreakerRule === 'DELIBERATION_REQUIRED') continue;

    const sameFinalPeers = entries.filter(
      (e) => e.participant.id !== curr.participant.id && e.finalScore === curr.finalScore
    );
    if (sameFinalPeers.length > 0) {
      const higherPeer = sameFinalPeers.find((p) => p.rank < curr.rank);
      const lowerPeer = sameFinalPeers.find((p) => p.rank > curr.rank);

      if (lowerPeer) {
        if (curr.highestIndicatorWeightedScore > lowerPeer.highestIndicatorWeightedScore) {
          curr.tieBreakerRule = 'HIGHEST_WEIGHT_INDICATOR';
          curr.tieBreakerNote = `Unggul Tie-Breaker · Nilai Indikator ${curr.highestIndicatorWeight}% (${curr.highestIndicatorWeightedScore.toFixed(2)} vs ${lowerPeer.highestIndicatorWeightedScore.toFixed(2)})`;
        } else if (curr.highestIndicatorAvgRawAllJudges > lowerPeer.highestIndicatorAvgRawAllJudges) {
          curr.tieBreakerRule = 'HIGHEST_WEIGHT_AVG_RAW_ALL_JUDGES';
          curr.tieBreakerNote = `Unggul Tie-Breaker · Rata-rata Murni Seluruh Juri (${curr.highestIndicatorAvgRawAllJudges.toFixed(2)} vs ${lowerPeer.highestIndicatorAvgRawAllJudges.toFixed(2)})`;
        }
      } else if (higherPeer) {
        if (higherPeer.highestIndicatorWeightedScore > curr.highestIndicatorWeightedScore) {
          curr.tieBreakerRule = 'HIGHEST_WEIGHT_INDICATOR';
          curr.tieBreakerNote = `Skor akhir seri (${curr.finalScore.toFixed(2)}) · Kalah Tie-Breaker Indikator ${curr.highestIndicatorWeight}% (${curr.highestIndicatorWeightedScore.toFixed(2)} vs ${higherPeer.highestIndicatorWeightedScore.toFixed(2)})`;
        } else if (higherPeer.highestIndicatorAvgRawAllJudges > curr.highestIndicatorAvgRawAllJudges) {
          curr.tieBreakerRule = 'HIGHEST_WEIGHT_AVG_RAW_ALL_JUDGES';
          curr.tieBreakerNote = `Skor akhir seri (${curr.finalScore.toFixed(2)}) · Kalah Tie-Breaker Rata-rata Murni Juri (${curr.highestIndicatorAvgRawAllJudges.toFixed(2)} vs ${higherPeer.highestIndicatorAvgRawAllJudges.toFixed(2)})`;
        }
      }
    }
  }

  return entries;
}
