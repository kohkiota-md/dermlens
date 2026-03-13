import { DiseaseInfo } from "./types";

// ============================================================
// 疾患の臨床コンテキスト
// 皮膚科専門医としての知識をUIに組み込む — ポートフォリオの差別化の核
//
// v3a: HAM10000 7クラス（ダーモスコピー）
// v10: Fitzpatrick17k 腫瘍6クラス（臨床写真）
//
// ガイドライン検証: 2026-03-10
//   GL-1: メラノーマ診療ガイドライン2025（皮膚がん診療GL第4版）
//         https://www.dermatol.or.jp/dermatol/wp-content/uploads/xoops/files/guideline/melanoma2025.pdf
//   GL-2: 基底細胞癌診療ガイドライン2025（同上）
//         http://www.skincancer.jp/basal_cell_carcinoma2025.pdf
//   GL-3: 有棘細胞癌診療ガイドライン2025（同上）— 日光角化症・ボーエン病を含む
//         https://www.dermatol.or.jp/dermatol/wp-content/uploads/xoops/files/guideline/yuukyoku2025.pdf
//   GL-4: NICE NG12 Suspected cancer: recognition and referral — BCC referral urgency
//   GL-5: BAD Guidelines for management of adults with BCC 2021 (Nasr et al., BJD)
//   GL-6: AAD Guidelines of care for BCC 2018 (JAAD 78(3):540-559)
//   GL-7: 国立がん研究センター がん情報サービス — メラノーマ
//         https://ganjoho.jp/public/cancer/melanoma/index.html
// ============================================================

// ── v3a: HAM10000 7クラス ───────────────────────────
export const DISEASES: Record<string, DiseaseInfo> = {
  // ── akiec ──
  // severity: premalignant — GL-3: 日光角化症は「上皮内癌」、SCC前駆病変
  // urgency: soon — GL-3: SCC進展率5年で約2.5%、生命予後良好だが計画的治療推奨
  //   「浸潤の触知、炎症、出血 → 有棘細胞癌への進展を疑う（推奨度1）」
  akiec: {
    key: "akiec",
    nameEn: "Actinic Keratosis / Intraepithelial Carcinoma",
    nameJa: "日光角化症 / 表皮内癌（ボーエン病）",
    description:
      "紫外線による慢性障害で生じる表皮内腫瘍です。日光角化症は扁平上皮癌（SCC）の前駆病変とされ、未治療の場合5〜10%がSCCに進行するとの報告があります。ボーエン病（SCC in situ）は全層性の異型を示します。",
    severity: "premalignant",
    urgency: "soon",
    recommendation:
      "前癌病変の可能性があります。数週間以内に皮膚科を受診し、ダーモスコピー検査および必要に応じて生検を受けてください。",
    differentialNote:
      "脂漏性角化症（bkl）との鑑別が臨床的に重要です。ダーモスコピーでstrawberry patternやrosette signの有無が鑑別の手がかりとなります。",
  },

  // ── bcc ──
  // severity: malignant — GL-2: 皮膚悪性腫瘍として扱われる
  // urgency: soon（urgentではない）— GL-2: 「原則として転移しない」
  //   GL-4 (NICE): BCC は 2-week urgent pathway の対象外
  //   GL-5 (BAD 2021): メラノーマと明確に紹介緊急度を区別
  //   Telfer et al. (BJD 2000): 2週間の遅延 = BCC 0.7mm差、治療上無意味
  bcc: {
    key: "bcc",
    nameEn: "Basal Cell Carcinoma",
    nameJa: "基底細胞癌",
    description:
      "最も頻度の高い皮膚悪性腫瘍です。遠隔転移は極めてまれですが、局所浸潤性に増大し周囲組織を破壊します。顔面（特に鼻周囲）に好発し、結節型・表在型・浸潤型などの亜型があります。",
    severity: "malignant",
    urgency: "soon",
    recommendation:
      "悪性腫瘍の可能性があります。早めに皮膚科を受診してください。基底細胞癌は早期治療で完治が期待できますが、放置すると周囲組織への浸潤が進行します。",
    differentialNote:
      "ダーモスコピーでarborizing vessels、blue-gray ovoid nests、leaf-like structuresが特徴的です。色素性BCCはメラノーマとの鑑別が重要です。",
  },

  // ── bkl ──
  // severity: benign — 良性腫瘍、悪性腫瘍GLの対象外
  // urgency: routine — GL-2: BCC鑑別診断として言及されるのみ
  bkl: {
    key: "bkl",
    nameEn: "Benign Keratosis-like Lesions",
    nameJa: "良性角化性病変（脂漏性角化症など）",
    description:
      "脂漏性角化症、日光性黒子、扁平苔癬様角化症を含むカテゴリーです。脂漏性角化症は中年以降に極めて高頻度に見られる良性腫瘍で、表皮の老化現象の一つです。",
    severity: "benign",
    urgency: "routine",
    recommendation:
      "良性病変の可能性が高いですが、変化が気になる場合や急速に増大する場合は皮膚科への相談をお勧めします。",
    differentialNote:
      "脂漏性角化症は「貼り付けたような」外観が典型的です。ダーモスコピーではcomedo-like openingsやmilia-like cystsが特徴ですが、irritated typeではメラノーマとの鑑別が困難になることがあります。",
  },

  // ── df ──
  // severity: benign — 良性線維性腫瘍、悪性腫瘍GLの対象外
  // urgency: routine — 治療不要が原則
  df: {
    key: "df",
    nameEn: "Dermatofibroma",
    nameJa: "皮膚線維腫",
    description:
      "四肢（特に下腿）に好発する良性の線維性腫瘍です。虫刺されや外傷後に生じることがあります。硬い結節として触れ、皮膚をつまむと陥凹する「dimple sign」が特徴的です。",
    severity: "benign",
    urgency: "routine",
    recommendation:
      "良性腫瘍であり、通常は治療不要です。整容的に気になる場合や疼痛がある場合は皮膚科にご相談ください。",
    differentialNote:
      "ダーモスコピーでは中心部のwhite scar-like patchと辺縁のpigment networkが特徴的です。まれにDFSP（隆起性皮膚線維肉腫）との鑑別が問題となります。",
  },

  // ── nv ──
  // severity: benign — 良性メラノサイト腫瘍
  // urgency: routine — GL-1/GL-7: ABCDE基準該当時のみ専門医紹介
  nv: {
    key: "nv",
    nameEn: "Melanocytic Nevi",
    nameJa: "色素性母斑（ほくろ）",
    description:
      "メラノサイト由来の良性腫瘍で、最も一般的な皮膚腫瘍です。接合部型・複合型・真皮内型に分類されます。ABCDEルール（Asymmetry、Border、Color、Diameter、Evolution）でメラノーマとの鑑別が重要です。",
    severity: "benign",
    urgency: "routine",
    recommendation:
      "良性のほくろの可能性が高いです。ただし、非対称性・辺縁不整・色調不均一・径6mm以上・経時変化がある場合はメラノーマの可能性を考慮し、皮膚科受診を推奨します。",
    differentialNote:
      "HAM10000では最大クラス（6,705枚）。ダーモスコピーで規則的なpigment network、globules、dotsのパターンが良性を示唆します。dysplastic nevusはメラノーマとの連続体として議論されています。",
  },

  // ── vasc ──
  // severity: benign — 血管腫・被角血管腫・化膿性肉芽腫はいずれも良性
  // urgency: routine — 悪性腫瘍GLの対象外（皮膚血管肉腫は別疾患）
  vasc: {
    key: "vasc",
    nameEn: "Vascular Lesions",
    nameJa: "血管性病変",
    description:
      "血管腫、被角血管腫、化膿性肉芽腫などを含むカテゴリーです。血管腫は乳児期に多く見られ、自然退縮するものもあります。被角血管腫は中年以降の体幹に好発します。",
    severity: "benign",
    urgency: "routine",
    recommendation:
      "多くは良性ですが、出血を繰り返す場合や急速に増大する場合は皮膚科への受診をお勧めします。",
    differentialNote:
      "ダーモスコピーでlacunae（赤〜暗赤色の円形構造）が特徴的です。無色素性メラノーマ（amelanotic melanoma）が血管性病変に類似することがあり、注意が必要です。",
  },

  // ── mel ──
  // severity: malignant — GL-1: 皮膚癌の中で最も予後不良
  // urgency: urgent — GL-1: 病期IV 5年生存率 9–13%、病期I（≤2mm, N0）なら90%以上
  //   GL-6: incisional biopsy 後は2週間以内の手術予約を推奨
  //   GL-7: メラノーマ疑い → 速やかなダーモスコピー検査が前提
  mel: {
    key: "mel",
    nameEn: "Melanoma",
    nameJa: "悪性黒色腫（メラノーマ）",
    description:
      "メラノサイト由来の悪性腫瘍で、皮膚癌の中で最も予後不良です。早期発見・早期治療が生命予後を左右します。表在拡大型・結節型・悪性黒子型・末端黒子型の4亜型があり、日本人では足底の末端黒子型が最多です。",
    severity: "malignant",
    urgency: "urgent",
    recommendation:
      "悪性黒色腫の可能性を否定できません。速やかに皮膚科専門医を受診してください。メラノーマは早期（Breslow厚1mm未満）であれば5年生存率90%以上ですが、進行すると急速に予後が悪化します。",
    differentialNote:
      "ダーモスコピーでatypical pigment network、irregular dots/globules、blue-white veil、regression structuresが見られます。HAM10000のデータは欧州のフィッツパトリックI〜III型に偏っており、日本人（IV〜V型）の末端黒子型メラノーマの検出精度は保証されません。",
  },
};

// ── v10: Fitzpatrick17k 腫瘍6クラス ─────────────────
// v10 はカテゴリレベルの集約。個別疾患ではなく代表的疾患のGLに基づく。
export const DISEASES_V10: Record<string, DiseaseInfo> = {
  // ── benign_dermal ──
  // severity: benign — 皮膚線維腫・脂肪腫・神経線維腫等、悪性腫瘍GLの対象外
  // urgency: routine
  benign_dermal: {
    key: "benign_dermal",
    nameEn: "Benign Dermal Tumor",
    nameJa: "良性真皮腫瘍",
    description:
      "皮膚線維腫、脂肪腫、神経線維腫など真皮由来の良性腫瘍を含むカテゴリーです。多くは緩徐に増大し、悪性化はまれです。",
    severity: "benign",
    urgency: "routine",
    recommendation:
      "良性腫瘍の可能性が高いです。急速な増大や疼痛がある場合は皮膚科への相談をお勧めします。",
    differentialNote:
      "真皮肉腫（DFSP、皮膚平滑筋肉腫など）との鑑別が臨床的に重要です。硬結を伴う急速増大例では生検を考慮してください。",
  },

  // ── benign_epidermal ──
  // severity: benign — 脂漏性角化症・表皮嚢腫・疣贅等
  // urgency: routine — GL-2: BCC鑑別対象として言及されるのみ
  benign_epidermal: {
    key: "benign_epidermal",
    nameEn: "Benign Epidermal Tumor",
    nameJa: "良性表皮腫瘍",
    description:
      "脂漏性角化症、表皮嚢腫、疣贅（いぼ）など表皮由来の良性腫瘍を含むカテゴリーです。脂漏性角化症は中年以降に極めて高頻度に見られます。",
    severity: "benign",
    urgency: "routine",
    recommendation:
      "良性病変の可能性が高いです。整容的に気になる場合や炎症を繰り返す場合は皮膚科にご相談ください。",
    differentialNote:
      "日光角化症（AK）や表在型基底細胞癌との鑑別が重要です。特に高齢者の顔面・手背では前癌病変の可能性も考慮してください。",
  },

  // ── benign_melanocyte ──
  // severity: benign — 色素性母斑・青色母斑・Spitz母斑等
  // urgency: routine — GL-1/GL-7: ABCDE基準該当時のみ専門医紹介
  benign_melanocyte: {
    key: "benign_melanocyte",
    nameEn: "Benign Melanocytic Tumor",
    nameJa: "良性メラノサイト腫瘍",
    description:
      "色素性母斑（ほくろ）、青色母斑、Spitz母斑などメラノサイト由来の良性腫瘍を含むカテゴリーです。大部分は経過観察のみで問題ありません。",
    severity: "benign",
    urgency: "routine",
    recommendation:
      "良性のほくろの可能性が高いです。ABCDEルール（非対称・辺縁不整・色調不均一・径6mm以上・経時変化）に該当する場合はメラノーマの鑑別のため皮膚科受診を推奨します。",
    differentialNote:
      "異型母斑（dysplastic nevus）はメラノーマとの鑑別が困難な場合があります。臨床写真のみでは判断が難しく、ダーモスコピーや生検が必要になることがあります。",
  },

  // ── malignant_dermal ──
  // severity: malignant — DFSP・皮膚平滑筋肉腫・血管肉腫等
  // urgency: urgent — 皮膚血管肉腫は予後極めて不良（GL第4版に専用GL）
  //   DFSPは局所再発率が高く速やかな専門医紹介が必要
  malignant_dermal: {
    key: "malignant_dermal",
    nameEn: "Malignant Dermal Tumor",
    nameJa: "悪性真皮腫瘍",
    description:
      "隆起性皮膚線維肉腫（DFSP）、皮膚平滑筋肉腫、血管肉腫など真皮由来の悪性腫瘍を含むカテゴリーです。発生頻度は低いですが、局所再発や転移のリスクがあります。",
    severity: "malignant",
    urgency: "urgent",
    recommendation:
      "悪性腫瘍の可能性があります。速やかに皮膚科専門医を受診し、生検・画像検査を受けてください。",
    differentialNote:
      "良性の皮膚線維腫やケロイドとの鑑別が重要です。急速増大、硬結、潰瘍形成は悪性を示唆する所見です。",
  },

  // ── malignant_epidermal ──
  // severity: malignant — SCC + BCC を含むカテゴリ
  // urgency: urgent — GL-3: SCCは転移リスクあり早期切除推奨
  //   モデルがSCC/BCCを区別できないため安全側（urgent）に倒す判断
  //   BCCのみならsoonだが、SCCが含まれるためurgentが正当
  malignant_epidermal: {
    key: "malignant_epidermal",
    nameEn: "Malignant Epidermal Tumor",
    nameJa: "悪性表皮腫瘍",
    description:
      "扁平上皮癌（SCC）、基底細胞癌（BCC）など表皮由来の悪性腫瘍を含むカテゴリーです。紫外線曝露が主要なリスク因子であり、顔面・手背などの露光部に好発します。",
    severity: "malignant",
    urgency: "urgent",
    recommendation:
      "悪性腫瘍の可能性があります。速やかに皮膚科を受診してください。SCCは転移リスクがあり、早期の切除が重要です。BCCは局所浸潤性ですが、早期治療で完治が期待できます。",
    differentialNote:
      "日光角化症からSCCへの移行は連続的です。潰瘍形成、角化、出血を伴う結節は悪性を強く示唆します。",
  },

  // ── malignant_melanoma ──
  // severity/urgency: mel（v3a）と同一根拠 — GL-1/GL-7 参照
  malignant_melanoma: {
    key: "malignant_melanoma",
    nameEn: "Malignant Melanoma",
    nameJa: "悪性黒色腫（メラノーマ）",
    description:
      "メラノサイト由来の悪性腫瘍で、皮膚癌の中で最も予後不良です。早期発見・早期治療が生命予後を左右します。臨床写真での判断はダーモスコピーと比べて精度が低く、生検による確定診断が不可欠です。",
    severity: "malignant",
    urgency: "urgent",
    recommendation:
      "悪性黒色腫の可能性を否定できません。速やかに皮膚科専門医を受診してください。メラノーマは早期（Breslow厚1mm未満）であれば5年生存率90%以上ですが、進行すると急速に予後が悪化します。",
    differentialNote:
      "臨床写真のみでの診断精度には限界があります。本モデル（v10）のDDI外部評価AUC=0.675は研究段階の精度であり、特にFST V–VI（濃色肌）ではAUC=0.572（chance level付近）です。ダーモスコピー検査が強く推奨されます。",
  },
};

// ============================================================
// ユーティリティ関数
// ============================================================

/** モデルタイプに応じた疾患辞書を取得 */
export function getDiseaseDict(
  model: "v3a" | "v10",
): Record<string, DiseaseInfo> {
  return model === "v10" ? DISEASES_V10 : DISEASES;
}

/** 悪性疑い判定（v3a: mel / bcc / akiec, v10: malignant_*） */
export function isMalignantSuspected(
  diseaseKey: string,
  model: "v3a" | "v10" = "v3a",
): boolean {
  const dict = getDiseaseDict(model);
  const info = dict[diseaseKey];
  return info?.severity === "malignant" || info?.severity === "premalignant";
}

/** 緊急度に応じたUI色 */
export function getUrgencyColor(urgency: DiseaseInfo["urgency"]): string {
  switch (urgency) {
    case "urgent":
      return "text-red-700 bg-red-50 border-red-200";
    case "soon":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "routine":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }
}

/** 悪性度に応じたバッジ色 */
export function getSeverityBadge(severity: DiseaseInfo["severity"]): {
  label: string;
  className: string;
} {
  switch (severity) {
    case "malignant":
      return { label: "悪性", className: "bg-red-600 text-white" };
    case "premalignant":
      return { label: "前癌病変", className: "bg-amber-500 text-white" };
    case "benign":
      return { label: "良性", className: "bg-emerald-600 text-white" };
  }
}

/** 確率値を降順でソート */
export function sortConfidences(
  confidences: Record<string, number>,
): [string, number][] {
  return Object.entries(confidences).sort(([, a], [, b]) => b - a);
}
