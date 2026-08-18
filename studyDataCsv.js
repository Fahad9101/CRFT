const EXPORT_DOMAINS = [
  "problemFraming",
  "syndromeIdentification",
  "differentialDiagnosis",
  "dataInterpretation",
  "anticipation",
  "reassessment",
];

const GLOBAL_RATINGS = [
  { min: 0, max: 5, label: "Junior" },
  { min: 6, max: 11, label: "Early Developing" },
  { min: 12, max: 17, label: "Advanced Junior" },
  { min: 18, max: 21, label: "Senior-like" },
  { min: 22, max: 24, label: "Near Consultant" },
];

const COGNITIVE_BIAS_LABELS = {
  anchoring: "Anchoring Bias",
  prematureClosure: "Premature Closure",
  confirmationBias: "Confirmation Bias",
  availabilityBias: "Availability Bias",
  representativenessError: "Representativeness Error",
  failureToUpdate: "Failure to Update",
  wrongQuestionFraming: "Wrong-Question Framing",
};

const REASONING_ERROR_LABELS = {
  missedLifeThreatening: "Missed Life-Threatening Diagnosis",
  poorProblemRepresentation: "Poor Problem Representation",
  weakDifferentialPrioritization: "Weak Differential Prioritization",
  incorrectDataInterpretation: "Incorrect Data Interpretation",
  failureToAnticipate: "Failure To Anticipate",
  unsafeIncompleteManagement: "Unsafe / Incomplete Management",
  noReassessmentStrategy: "No Reassessment Strategy",
  overconfidenceMismatch: "Overconfidence Mismatch",
};

function hasScores(scores) {
  return !!scores && Object.keys(scores).length > 0;
}

function sumScores(scores) {
  return EXPORT_DOMAINS.reduce((total, domain) => total + (Number(scores?.[domain]) || 0), 0);
}

function ratingForTotal(total) {
  return GLOBAL_RATINGS.find((rating) => total >= rating.min && total <= rating.max)?.label || "Unclassified";
}

function listValue(values) {
  return JSON.stringify(Array.isArray(values) ? values : []);
}

function listLabels(values, labels) {
  return listValue((Array.isArray(values) ? values : []).map((value) => labels[value] || value));
}

function timestampValue(value) {
  if (value === null || value === undefined || value === "") return "";

  let date;
  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (typeof value?.seconds === "number") {
    date = new Date((value.seconds * 1000) + Math.floor((value.nanoseconds || 0) / 1000000));
  } else {
    date = value instanceof Date ? value : new Date(value);
  }

  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function calibrationFor(record, manualTotal) {
  if (record.calibration) return record.calibration;
  if (!hasScores(record.manualDomainScores)) return {};

  const domainDifferences = Object.fromEntries(
    EXPORT_DOMAINS.map((domain) => [
      domain,
      Math.abs((Number(record.autoDomainScores?.[domain]) || 0) - (Number(record.manualDomainScores?.[domain]) || 0)),
    ])
  );
  const totalDifference = Math.abs((Number(record.autoTotal) || 0) - manualTotal);

  return {
    totalDifference,
    domainDifferences,
    exactMatchDomains: EXPORT_DOMAINS.filter((domain) => domainDifferences[domain] === 0).length,
    agreementClass: totalDifference <= 2 ? "high" : totalDifference <= 5 ? "moderate" : "low",
  };
}

function rowForRecord(record) {
  const hasManualScores = hasScores(record.manualDomainScores);
  const manualTotal = hasManualScores
    ? (record.manualTotal ?? sumScores(record.manualDomainScores))
    : "";
  const manualGlobalRating = hasManualScores
    ? (record.manualGlobalRating || ratingForTotal(manualTotal))
    : "";
  const calibration = calibrationFor(record, manualTotal);

  return {
    submission_id: record.submissionId || record.id || "",
    firestore_document_id: record.id || "",
    session_code: record.sessionCode || "",
    session_day: record.sessionDay ?? "",
    phase: record.phase || "",
    case_id: record.caseId || "",
    case_title: record.caseTitle || "",
    resident_id: record.residentId || "",
    resident_auth_uid: record.residentAuthUid || "",
    activation_access_id: record.activationAccessId || "",
    resident_role: record.role || "",
    pgy: record.pgy || "",
    leading_diagnosis: record.leadingDiagnosis || "",
    resident_response: record.freeText || "",
    confidence_percent: record.confidence ?? "",
    time_seconds: record.timeSeconds ?? "",
    auto_problem_framing: record.autoDomainScores?.problemFraming ?? "",
    auto_syndrome_identification: record.autoDomainScores?.syndromeIdentification ?? "",
    auto_differential_diagnosis: record.autoDomainScores?.differentialDiagnosis ?? "",
    auto_data_interpretation: record.autoDomainScores?.dataInterpretation ?? "",
    auto_anticipation: record.autoDomainScores?.anticipation ?? "",
    auto_reassessment: record.autoDomainScores?.reassessment ?? "",
    auto_total: record.autoTotal ?? "",
    auto_global_rating: record.autoGlobalRating || "",
    auto_dangerous_miss: record.dangerousMiss ?? "",
    auto_bias_tag_codes: listValue(record.autoBiasTags),
    auto_bias_tag_labels: listLabels(record.autoBiasTags, COGNITIVE_BIAS_LABELS),
    auto_error_tag_codes: listValue(record.autoErrorTags),
    auto_error_tag_labels: listLabels(record.autoErrorTags, REASONING_ERROR_LABELS),
    auto_feedback: record.feedbackText || "",
    benchmark_percent: record.benchmark?.benchmarkPercent ?? "",
    benchmark_competency_level: record.benchmark?.competencyLevel || "",
    benchmark_leading_dx_accepted: record.benchmark?.leadingDxAccepted ?? "",
    benchmark_missed_must_hits: listValue(record.benchmark?.missedMustHits),
    manual_problem_framing: hasManualScores ? (record.manualDomainScores?.problemFraming ?? "") : "",
    manual_syndrome_identification: hasManualScores ? (record.manualDomainScores?.syndromeIdentification ?? "") : "",
    manual_differential_diagnosis: hasManualScores ? (record.manualDomainScores?.differentialDiagnosis ?? "") : "",
    manual_data_interpretation: hasManualScores ? (record.manualDomainScores?.dataInterpretation ?? "") : "",
    manual_anticipation: hasManualScores ? (record.manualDomainScores?.anticipation ?? "") : "",
    manual_reassessment: hasManualScores ? (record.manualDomainScores?.reassessment ?? "") : "",
    manual_total: manualTotal,
    manual_global_rating: manualGlobalRating,
    manual_bias_tag_codes: listValue(record.manualBiasTags),
    manual_bias_tag_labels: listLabels(record.manualBiasTags, COGNITIVE_BIAS_LABELS),
    manual_error_tag_codes: listValue(record.manualErrorTags),
    manual_error_tag_labels: listLabels(record.manualErrorTags, REASONING_ERROR_LABELS),
    manual_comments: record.manualComments || "",
    calibration_total_difference: calibration.totalDifference ?? "",
    calibration_problem_framing_difference: calibration.domainDifferences?.problemFraming ?? "",
    calibration_syndrome_identification_difference: calibration.domainDifferences?.syndromeIdentification ?? "",
    calibration_differential_diagnosis_difference: calibration.domainDifferences?.differentialDiagnosis ?? "",
    calibration_data_interpretation_difference: calibration.domainDifferences?.dataInterpretation ?? "",
    calibration_anticipation_difference: calibration.domainDifferences?.anticipation ?? "",
    calibration_reassessment_difference: calibration.domainDifferences?.reassessment ?? "",
    calibration_exact_match_domains: calibration.exactMatchDomains ?? "",
    calibration_agreement_class: calibration.agreementClass || "",
    started_at: timestampValue(record.startedAt),
    submitted_at: timestampValue(record.submittedAt),
    created_at: timestampValue(record.createdAt),
    manual_updated_at: timestampValue(record.manualUpdatedAt),
  };
}

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildStudyDataCsv(records) {
  const rows = (records || []).map(rowForRecord);
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\r\n");
}

export function downloadStudyDataCsv(records, sessionCode = "CRFT") {
  const csv = buildStudyDataCsv(records);
  if (!csv) return;

  const safeSessionCode = String(sessionCode || "CRFT").replace(/[^a-z0-9_-]+/gi, "-");
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeSessionCode}-study-data-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
