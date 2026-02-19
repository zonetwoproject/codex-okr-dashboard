const HALF_VALUES = new Set(['H1', 'H2']);
const AARRR_VALUES = new Set(['-', 'Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral', 'Acqusition']);
const DOMAIN_VALUES = new Set(['Food', 'QC', 'Food + QC', 'Partner', 'Delivery', 'Rider']);
const DIVISION_VALUES = new Set([
  '푸드프로덕트실',
  '신규성장추진실',
  '커머스고객확장프로덕트실',
  '커머스거래성장프로덕트실',
  '오더프로덕트실',
  '그로스프로덕트실',
  '결제정산프로덕트실',
  '파트너프로덕트실',
  '배민상회실',
  '파트너성장서비스실',
  '코어프로덕트실',
  '딜리버리서비스실',
  'DF서비스실',
  '중계플랫폼실'
]);
const SOURCE_TYPES = new Set(['manual', 'synced', 'calculated']);
const TARGET_TYPES = new Set(['objective', 'kr', 'sub_kr', 'initiative']);
const INPUT_CLASSIFICATION_OPTIONS = new Set(['Problem', 'Opportunity', 'Needs']);
const INPUT_PRODUCT_OPTIONS = new Set(['Food', 'QC', 'Order', 'Core', 'Membership', 'Delivery', 'CS']);
const INPUT_SOURCE_OPTIONS = new Set([
  'NPS',
  'VOC',
  'Team',
  'Internal Stakeholders',
  'DH-TOP Experiments/Playbook',
  'DH-Subscription Recommended Feature List',
  'DH-Key Feature List',
  'DH-etc'
]);
const INPUT_TARGET_TYPES = new Set(['kr', 'sub_kr', 'initiative']);
const INPUT_SOURCE_STATUS_VALUES = new Set(['registered', 'converted', 'rejected']);

function valueSet(values, fallbackSet) {
  if (!Array.isArray(values) || values.length === 0) return fallbackSet;
  return new Set(values.map((item) => String(item || '').trim()).filter(Boolean));
}

function required(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null;
}

function validateObjective(body, options = {}) {
  const organizationValue = body.division || body.team || body.teamId;
  const message = required({ ...body, organization: organizationValue }, ['half', 'year', 'title', 'organization', 'domain', 'actor', 'reason']);
  if (message) return message;
  const organizationValues = valueSet(options.organizations || options.divisions, DIVISION_VALUES);
  const domainValues = valueSet(options.domains, DOMAIN_VALUES);
  if (!HALF_VALUES.has(body.half)) return 'half must be H1 or H2';
  if (!organizationValues.has(organizationValue)) return 'organization must be one of configured organizations';
  if (!domainValues.has(body.domain)) return 'domain must be one of configured domains';
  return null;
}

function validateKR(body) {
  const message = required(body, ['objectiveId', 'title', 'targetValue', 'actor', 'reason']);
  if (message) return message;
  if (!Number.isFinite(Number(body.targetValue)) || Number(body.targetValue) <= 0) {
    return 'targetValue must be a positive number';
  }
  return null;
}

function validateExperiment(body) {
  const message = required(body, ['title', 'aarrrTag', 'actor', 'reason']);
  if (message) return message;
  const normalizedAarrr = body.aarrrTag === 'Acqusition' ? 'Acquisition' : body.aarrrTag;
  if (!AARRR_VALUES.has(body.aarrrTag)) {
    return 'aarrrTag must be one of -, Acquisition, Activation, Retention, Revenue, Referral';
  }
  body.aarrrTag = normalizedAarrr;
  return null;
}

function validateKRExperimentLink(body) {
  const message = required(body, ['krId', 'experimentId', 'actor', 'reason']);
  if (message) return message;
  if (body.weight !== undefined) {
    const weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      return 'weight must be between 0 and 100';
    }
  }
  return null;
}

function validateInitiativeExperimentLink(body) {
  return required(body, ['initiativeId', 'experimentId', 'actor', 'reason']);
}

function validateMonthlyUpsert(body) {
  const message = required(body, ['targetType', 'targetId', 'yearMonth', 'actualValue', 'actor', 'reason']);
  if (message) return message;
  if (!TARGET_TYPES.has(body.targetType)) return 'targetType must be objective|kr|sub_kr|initiative';
  if (body.sourceType !== undefined && !SOURCE_TYPES.has(body.sourceType)) return 'sourceType must be manual|synced|calculated';
  if (!/^\d{4}-\d{2}$/.test(body.yearMonth)) return 'yearMonth must be YYYY-MM';
  const [yearText, monthText] = String(body.yearMonth).split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
    return 'yearMonth must be YYYY-MM';
  }
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return 'yearMonth cannot be in the future';
  }
  if (!Number.isFinite(Number(body.actualValue))) return 'actualValue must be a number';
  return null;
}

function validateSubKR(body) {
  const message = required(body, ['krId', 'title', 'targetValue', 'actor', 'reason']);
  if (message) return message;
  if (!Number.isFinite(Number(body.targetValue)) || Number(body.targetValue) <= 0) {
    return 'targetValue must be a positive number';
  }
  return null;
}

function validateInitiative(body) {
  const message = required(body, ['title', 'actor', 'reason']);
  if (message) return message;
  const hasSubKrId = body.subKrId !== undefined && body.subKrId !== null && body.subKrId !== '';
  const hasObjectiveId = body.objectiveId !== undefined && body.objectiveId !== null && body.objectiveId !== '';
  if (!hasSubKrId && !hasObjectiveId) {
    return 'subKrId or objectiveId is required';
  }
  if (
    body.progressQuant !== undefined &&
    (!Number.isFinite(Number(body.progressQuant)) || Number(body.progressQuant) < 0 || Number(body.progressQuant) > 100)
  ) {
    return 'progressQuant must be a number between 0 and 100';
  }
  return null;
}

function validateDecisionLog(body) {
  const message = required(body, ['title', 'context', 'decision', 'actor']);
  if (message) return message;
  return null;
}

function validateInputSource(body, options = {}) {
  const message = required(body, [
    'title',
    'detail',
    'team',
    'classification',
    'product',
    'source',
    'actor',
    'reason'
  ]);
  if (message) return message;

  const inputClassificationValues = valueSet(options.inputClassifications, INPUT_CLASSIFICATION_OPTIONS);
  const inputProductValues = valueSet(options.inputProducts, INPUT_PRODUCT_OPTIONS);
  const inputSourceValues = valueSet(options.inputSources, INPUT_SOURCE_OPTIONS);

  if (!inputClassificationValues.has(body.classification)) {
    return 'classification must be one of configured values';
  }

  if (!inputProductValues.has(body.product)) {
    return 'product must be one of configured values';
  }

  if (!inputSourceValues.has(body.source)) {
    return 'source must be one of configured values';
  }

  if (body.deployBy && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.deployBy).trim())) {
    return 'deployBy must be YYYY-MM-DD';
  }

  return null;
}

function validateInputSourceProcess(body) {
  const message = required(body, ['decision', 'actor', 'reason']);
  if (message) return message;
  if (body.decision !== 'convert' && body.decision !== 'reject') {
    return 'decision must be convert|reject';
  }

  if (body.decision === 'convert') {
    const legacyInitiativeId = String(body.initiativeId || '').trim();
    const targetType = String(body.goalType || '').trim();
    const goalId = String(body.goalId || '').trim();
    if (!targetType && !legacyInitiativeId && !goalId) {
      return 'goalType/goalId or initiativeId is required when decision is convert';
    }
    if (targetType && goalId) {
      if (!INPUT_TARGET_TYPES.has(targetType)) {
        return 'goalType must be kr|sub_kr|initiative';
      }
    }
    if (!targetType && legacyInitiativeId) {
      // legacy client compatibility
    }
  }

  if (body.decision === 'reject') {
    const rejectionReason = String(body.rejectionReason || '').trim();
    if (!rejectionReason) {
      return 'rejectionReason is required when decision is reject';
    }
  }
  if (body.status !== undefined && !INPUT_SOURCE_STATUS_VALUES.has(body.status)) {
    return 'status must be registered|converted|rejected';
  }
  return null;
}

module.exports = {
  validateObjective,
  validateKR,
  validateExperiment,
  validateKRExperimentLink,
  validateInitiativeExperimentLink,
  validateMonthlyUpsert,
  validateSubKR,
  validateInitiative,
  validateDecisionLog,
  validateInputSource,
  validateInputSourceProcess
};
