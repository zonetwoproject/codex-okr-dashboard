const path = require('path');
const { writeStore, id, nowIso, addAuditLog } = require('../src/store');

const filePath = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');

// Division 목록은 변경하지 않는다.
const divisions = [
  { name: '푸드프로덕트실', domain: 'Food' },
  { name: '신규성장추진실', domain: 'QC' },
  { name: '커머스고객확장프로덕트실', domain: 'Food + QC' },
  { name: '커머스거래성장프로덕트실', domain: 'Partner' },
  { name: '오더프로덕트실', domain: 'Delivery' },
  { name: '그로스프로덕트실', domain: 'Food + QC' },
  { name: '결제정산프로덕트실', domain: 'Partner' },
  { name: '파트너프로덕트실', domain: 'Partner' },
  { name: '배민상회실', domain: 'Food' },
  { name: '파트너성장서비스실', domain: 'Partner' },
  { name: '코어프로덕트실', domain: 'QC' },
  { name: '딜리버리서비스실', domain: 'Delivery' },
  { name: 'DF서비스실', domain: 'Delivery' },
  { name: '중계플랫폼실', domain: 'Rider' }
];

const teams = [
  '추천큐레이션팀',
  '정림수익화팀',
  '타임세일팀',
  '푸드서비스플랫폼팀',
  '신규온보딩팀',
  '재방문성장팀',
  '파트너정산팀',
  '딜리버리경험팀',
  '라이더경험팀',
  '정책운영팀'
];

function stampedEntity(payload) {
  return {
    ...payload,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };
}

function stampedRecord(payload) {
  return {
    ...payload,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

const objectives = [];
function addObjective({
  title,
  definition,
  division,
  domain,
  aarrrTag = '-',
  baseline = 0,
  q1Target = 100,
  q2Target = 200,
  owner,
  status = 'active'
}) {
  const objective = stampedEntity({
    id: id('obj'),
    half: 'H1',
    year: 2026,
    title,
    definition,
    division,
    domain,
    teamId: division,
    team: '',
    aarrrTag,
    baseline,
    q1Target,
    q2Target,
    owner,
    status
  });
  objectives.push(objective);
  return objective;
}

const krs = [];
function addKr({
  objective,
  title,
  definition,
  unit,
  targetValue,
  baseline = 0,
  q1Target = targetValue,
  q2Target = targetValue,
  ownerScope = 'division',
  division = objective.division,
  team = '',
  domain = objective.domain,
  aarrrTag = '-',
  owner,
  status = 'planned'
}) {
  const kr = stampedEntity({
    id: id('kr'),
    objectiveId: objective.id,
    title,
    definition,
    unit,
    targetValue,
    baseline,
    q1Target,
    q2Target,
    ownerScope,
    division,
    team,
    domain,
    aarrrTag,
    owner,
    status
  });
  krs.push(kr);
  return kr;
}

const objectiveById = new Map();
const subKrs = [];
function addSubKr({
  kr,
  title,
  definition,
  targetValue,
  baseline = 0,
  q1Target = targetValue,
  q2Target = targetValue,
  ownerScope = kr.ownerScope || 'division',
  division,
  team,
  domain,
  aarrrTag = kr.aarrrTag || '-',
  owner,
  status = 'planned'
}) {
  const objective = objectiveById.get(kr.objectiveId);
  const subKr = stampedEntity({
    id: id('subkr'),
    krId: kr.id,
    title,
    definition,
    targetValue,
    baseline,
    q1Target,
    q2Target,
    ownerScope,
    division: division || kr.division || (objective ? objective.division : ''),
    team: team !== undefined ? team : (kr.team || ''),
    domain: domain || kr.domain || (objective ? objective.domain : ''),
    aarrrTag,
    owner,
    status
  });
  subKrs.push(subKr);
  return subKr;
}

const initiatives = [];
function addInitiative({
  subKr,
  title,
  definition,
  progressQuant = 0,
  baseline = 0,
  q1Target = 1,
  q2Target = 1,
  division = subKr.division,
  team = subKr.team || '',
  domain = subKr.domain,
  aarrrTag = subKr.aarrrTag || '-',
  owner,
  status = 'planned',
  startDate,
  endDate
}) {
  const initiative = stampedEntity({
    id: id('init'),
    subKrId: subKr.id,
    title,
    definition,
    progressQuant,
    baseline,
    q1Target,
    q2Target,
    division,
    team,
    domain,
    aarrrTag,
    owner,
    status,
    startDate,
    endDate
  });
  initiatives.push(initiative);
  return initiative;
}

const experiments = [];
function addExperiment({
  title,
  aarrrTag,
  owner,
  status,
  hypothesis = null,
  startDate = null,
  endDate = null,
  result = null
}) {
  const exp = stampedEntity({
    id: id('exp'),
    title,
    aarrrTag,
    owner,
    status,
    hypothesis,
    startDate,
    endDate,
    result
  });
  experiments.push(exp);
  return exp;
}

const krExperimentLinks = [];
function addKrLink({ kr, experiment, weight, rationale }) {
  krExperimentLinks.push(
    stampedRecord({
      id: id('link'),
      krId: kr.id,
      experimentId: experiment.id,
      weight,
      rationale
    })
  );
}

const initiativeExperimentLinks = [];
function addInitiativeLink({ initiative, experiment }) {
  initiativeExperimentLinks.push(
    stampedRecord({
      id: id('inilink'),
      initiativeId: initiative.id,
      experimentId: experiment.id
    })
  );
}

const inputSources = [];

function inferInputClassificationFromRice({ reach, impact, confidence, effort, priority }) {
  if (priority === '상') return 'Problem';
  if (priority === '중') return 'Opportunity';
  if (priority === '하') return 'Needs';
  if (reach === undefined || impact === undefined || confidence === undefined || effort === undefined) return 'Needs';
  const score = (Number(reach) * Number(impact) * Number(confidence)) / Math.max(1, Number(effort));
  if (Number.isNaN(score)) return 'Needs';
  if (score >= 9) return 'Problem';
  if (score >= 5) return 'Opportunity';
  return 'Needs';
}

function inferInputProduct(inputDomain) {
  const domain = String(inputDomain || '').trim();
  if (domain === 'Food') return 'Food';
  if (domain === 'QC') return 'QC';
  if (domain === 'Order') return 'Order';
  if (domain === 'Core') return 'Core';
  if (domain === 'Delivery') return 'Delivery';
  if (domain === 'Membership') return 'Membership';
  if (domain === 'CS') return 'CS';
  if (domain === 'Partner') return 'Core';
  if (domain === 'Food + QC') return 'Food';
  if (domain === 'Rider') return 'Delivery';
  return 'Core';
}

function addInputSource({
  title,
  summary,
  detail = '',
  referenceUrl = '',
  division,
  team,
  reporter,
  kr = null,
  classification = '',
  product = '',
  source = 'Team',
  reach,
  impact,
  confidence,
  effort,
  status = 'registered',
  workingTeam = null,
  linkedInitiative = null,
  rejectionReason = null
}) {
  const normalizedClassification = classification || inferInputClassificationFromRice({ reach, impact, confidence, effort });
  const normalizedProduct = product || inferInputProduct(kr?.domain || kr?.area || '');
  const priority = normalizedClassification === 'Problem' ? '상' : normalizedClassification === 'Opportunity' ? '중' : '하';
  const processed = status === 'converted' || status === 'rejected';
  const input = stampedEntity({
    id: id('input'),
    title,
    summary,
    detail,
    referenceUrl,
    division,
    team,
    reporter,
    classification: normalizedClassification,
    product: normalizedProduct,
    source,
    domain: kr?.domain || '',
    krId: kr?.id || null,
    priority,
    status,
    workingTeam: workingTeam || null,
    linkedInitiativeId: linkedInitiative?.id || null,
    rejectionReason: rejectionReason || null,
    processedAt: processed ? nowIso() : null
  });
  inputSources.push(input);
  return input;
}

const monthlyPerformances = [];
function addMonthly({ targetType, targetId, month, value, sourceType = 'manual', note = '' }) {
  monthlyPerformances.push(
    stampedRecord({
      id: id('mp'),
      targetType,
      targetId,
      yearMonth: `2026-${String(month).padStart(2, '0')}`,
      actualValue: value,
      sourceType,
      note
    })
  );
}

function addMonthlySeries({ targetType, targetId, values, sourceType = 'synced', notePrefix = '' }) {
  values.forEach((value, idx) => {
    addMonthly({
      targetType,
      targetId,
      month: idx + 1,
      value,
      sourceType,
      note: notePrefix ? `${notePrefix}-${idx + 1}` : ''
    });
  });
}

const objFood = addObjective({
  title: '푸드 성장 가속',
  definition: '푸드 고객 유입-전환-재방문 흐름을 동시에 개선한다.',
  division: divisions[0].name,
  domain: divisions[0].domain,
  baseline: 100,
  q1Target: 350,
  q2Target: 700,
  owner: 'lead.food'
});
const objPartner = addObjective({
  title: '파트너 거래 확장',
  definition: '거래 파트너의 매출과 정산 안정성을 함께 높인다.',
  division: divisions[3].name,
  domain: divisions[3].domain,
  baseline: 120,
  q1Target: 260,
  q2Target: 500,
  owner: 'lead.partner'
});
const objDelivery = addObjective({
  title: '딜리버리 품질 개선',
  definition: '배달 성공률과 ETA 정확도를 개선한다.',
  division: divisions[11].name,
  domain: divisions[11].domain,
  baseline: 60,
  q1Target: 110,
  q2Target: 180,
  owner: 'lead.delivery'
});
const objQc = addObjective({
  title: 'QC 신규고객 활성화',
  definition: '신규 고객의 첫 주문 전환을 개선한다.',
  division: divisions[1].name,
  domain: divisions[1].domain,
  baseline: 30,
  q1Target: 60,
  q2Target: 95,
  owner: 'lead.qc'
});
const objRider = addObjective({
  title: 'Rider 경험 안정화',
  definition: '라이더 온보딩과 운영 만족도를 높인다.',
  division: divisions[13].name,
  domain: divisions[13].domain,
  baseline: 70,
  q1Target: 100,
  q2Target: 140,
  owner: 'lead.rider'
});

objectives.forEach((obj) => objectiveById.set(obj.id, obj));

const krFoodMau = addKr({
  objective: objFood,
  title: '푸드탭 월간 활성 사용자 600만 달성',
  definition: '푸드탭 활성 사용자 볼륨 확대',
  unit: '만명',
  targetValue: 600,
  baseline: 100,
  q1Target: 350,
  q2Target: 600,
  ownerScope: 'division',
  aarrrTag: '-',
  owner: 'pm.food.growth'
});
const krRecoConversion = addKr({
  objective: objFood,
  title: '추천큐레이션팀 상세 진입 전환율 120 달성',
  definition: '추천 피드에서 상세 진입률 개선',
  unit: 'pt',
  targetValue: 120,
  baseline: 20,
  q1Target: 70,
  q2Target: 120,
  ownerScope: 'team',
  team: teams[0],
  aarrrTag: 'Activation',
  owner: 'lead.recommend'
});
const krFoodPlatform = addKr({
  objective: objFood,
  title: '푸드서비스플랫폼팀 재방문 유도 지수 100 달성',
  definition: '검색/탐색 속도 개선으로 재방문 강화',
  unit: '점',
  targetValue: 100,
  baseline: 0,
  q1Target: 50,
  q2Target: 100,
  ownerScope: 'team',
  team: teams[3],
  aarrrTag: 'Retention',
  owner: 'lead.platform'
});
const krPartnerGmv = addKr({
  objective: objPartner,
  title: '정림수익화팀 거래액 200 달성',
  definition: '핵심 파트너 거래액 상향',
  unit: '억원',
  targetValue: 200,
  baseline: 100,
  q1Target: 150,
  q2Target: 200,
  ownerScope: 'team',
  team: teams[1],
  aarrrTag: 'Revenue',
  owner: 'lead.revenue'
});
const krPartnerSettlement = addKr({
  objective: objPartner,
  title: '파트너정산팀 정산 안정 지표 300 달성',
  definition: '정산 리드타임과 오류율 동시 개선',
  unit: '점',
  targetValue: 300,
  baseline: 120,
  q1Target: 210,
  q2Target: 300,
  ownerScope: 'team',
  team: teams[6],
  aarrrTag: 'Revenue',
  owner: 'lead.settlement'
});
const krDeliverySuccess = addKr({
  objective: objDelivery,
  title: '딜리버리서비스실 배달 성공 지수 150 달성',
  definition: '배달 성공률 개선',
  unit: '점',
  targetValue: 150,
  baseline: 60,
  q1Target: 100,
  q2Target: 150,
  ownerScope: 'division',
  aarrrTag: 'Retention',
  owner: 'pm.delivery'
});
const krDeliveryEta = addKr({
  objective: objDelivery,
  title: '딜리버리경험팀 ETA 정확도 지수 180 달성',
  definition: '도착예정시간 예측 품질 개선',
  unit: '점',
  targetValue: 180,
  baseline: 90,
  q1Target: 130,
  q2Target: 180,
  ownerScope: 'team',
  team: teams[7],
  aarrrTag: 'Retention',
  owner: 'lead.eta'
});
const krQcOnboarding = addKr({
  objective: objQc,
  title: '신규온보딩팀 첫 주문 전환 지수 90 달성',
  definition: '가입 후 첫 주문 전환 개선',
  unit: '점',
  targetValue: 90,
  baseline: 30,
  q1Target: 60,
  q2Target: 90,
  ownerScope: 'team',
  team: teams[4],
  aarrrTag: 'Acquisition',
  owner: 'lead.onboarding'
});
const krRiderNps = addKr({
  objective: objRider,
  title: '라이더경험팀 만족도 지수 130 달성',
  definition: '라이더 운영 만족도 개선',
  unit: '점',
  targetValue: 130,
  baseline: 70,
  q1Target: 95,
  q2Target: 130,
  ownerScope: 'team',
  team: teams[8],
  aarrrTag: 'Retention',
  owner: 'lead.rider'
});

const subFoodHome = addSubKr({
  kr: krFoodMau,
  title: '푸드 홈 진입 전환율 18 달성',
  definition: '푸드 홈 진입 퍼널 개선',
  targetValue: 18,
  baseline: 10,
  q1Target: 14,
  q2Target: 18,
  ownerScope: 'division',
  team: '',
  aarrrTag: 'Activation',
  owner: 'pm.food.home'
});
const subRecoCard = addSubKr({
  kr: krRecoConversion,
  title: '추천 카드 클릭 지수 80 달성',
  definition: '추천 카드 클릭률 개선',
  targetValue: 80,
  baseline: 40,
  q1Target: 60,
  q2Target: 80,
  ownerScope: 'team',
  team: teams[0],
  aarrrTag: 'Activation',
  owner: 'pm.recommend'
});
const subPlatformLatency = addSubKr({
  kr: krFoodPlatform,
  title: '탐색 응답속도 지수 75 달성',
  definition: '탐색 응답 시간 개선',
  targetValue: 75,
  baseline: 20,
  q1Target: 45,
  q2Target: 75,
  ownerScope: 'team',
  team: teams[3],
  aarrrTag: 'Retention',
  owner: 'pm.platform'
});
const subPartnerUpsell = addSubKr({
  kr: krPartnerGmv,
  title: '업셀 대상 주문비중 65 달성',
  definition: '업셀 노출 효율 개선',
  targetValue: 65,
  baseline: 30,
  q1Target: 48,
  q2Target: 65,
  ownerScope: 'team',
  team: teams[1],
  aarrrTag: 'Revenue',
  owner: 'pm.partner.gmv'
});
const subSettlementAlert = addSubKr({
  kr: krPartnerSettlement,
  title: '정산 이슈 조기감지 지수 85 달성',
  definition: '정산 이상치 조기 탐지',
  targetValue: 85,
  baseline: 40,
  q1Target: 62,
  q2Target: 85,
  ownerScope: 'team',
  team: teams[6],
  aarrrTag: 'Revenue',
  owner: 'pm.settlement'
});
const subDeliverySuccess = addSubKr({
  kr: krDeliverySuccess,
  title: '배달완료 안정 지수 88 달성',
  definition: '배달완료 성공률 개선',
  targetValue: 88,
  baseline: 60,
  q1Target: 74,
  q2Target: 88,
  ownerScope: 'division',
  team: '',
  aarrrTag: 'Retention',
  owner: 'pm.delivery.ops'
});
const subEtaModel = addSubKr({
  kr: krDeliveryEta,
  title: 'ETA 모델 정확도 지수 85 달성',
  definition: 'ETA 예측모델 오차 개선',
  targetValue: 85,
  baseline: 50,
  q1Target: 68,
  q2Target: 85,
  ownerScope: 'team',
  team: teams[7],
  aarrrTag: 'Retention',
  owner: 'pm.eta'
});
const subQcWelcome = addSubKr({
  kr: krQcOnboarding,
  title: '신규 가입 24시간 전환 지수 70 달성',
  definition: '가입 직후 전환 강화',
  targetValue: 70,
  baseline: 35,
  q1Target: 52,
  q2Target: 70,
  ownerScope: 'team',
  team: teams[4],
  aarrrTag: 'Acquisition',
  owner: 'pm.qc'
});
const subRiderGuide = addSubKr({
  kr: krRiderNps,
  title: '라이더 온보딩 완료 지수 92 달성',
  definition: '초기 온보딩 완료율 개선',
  targetValue: 92,
  baseline: 55,
  q1Target: 72,
  q2Target: 92,
  ownerScope: 'team',
  team: teams[8],
  aarrrTag: 'Retention',
  owner: 'pm.rider'
});

addInitiative({
  subKr: subRecoCard,
  title: '추천 카드 UI 개선',
  definition: '카드 가독성 및 CTA 개선',
  progressQuant: 60,
  team: teams[0],
  owner: 'squad.reco',
  status: 'in_progress',
  startDate: '2026-01-08',
  endDate: '2026-05-31'
});
addInitiative({
  subKr: subRecoCard,
  title: '추천 랭킹 실험 자동화',
  definition: '랭킹 모델 실험 파이프라인 구축',
  progressQuant: 45,
  team: teams[0],
  owner: 'squad.reco',
  status: 'in_progress',
  startDate: '2026-02-01',
  endDate: '2026-06-30'
});
addInitiative({
  subKr: subPlatformLatency,
  title: '탐색 API 캐시 전략 도입',
  definition: '탐색 API 캐시 정책 개선',
  progressQuant: 30,
  team: teams[3],
  owner: 'squad.platform',
  status: 'planned',
  startDate: '2026-03-01',
  endDate: '2026-06-30'
});
addInitiative({
  subKr: subPartnerUpsell,
  title: '업셀 배너 세그먼트 확장',
  definition: '업셀 배너 타깃 세분화',
  progressQuant: 68,
  team: teams[1],
  owner: 'squad.gmv',
  status: 'production_released',
  startDate: '2026-01-15',
  endDate: '2026-05-20'
});
addInitiative({
  subKr: subSettlementAlert,
  title: '정산 이슈 조기 경보 알림',
  definition: '정산 이상 알림 룰 구성',
  progressQuant: 40,
  team: teams[6],
  owner: 'squad.settlement',
  status: 'in_progress',
  startDate: '2026-02-10',
  endDate: '2026-06-15'
});
addInitiative({
  subKr: subDeliverySuccess,
  title: '배차 정책 실험 패키지',
  definition: '배차 정책 실험 반복 속도 개선',
  progressQuant: 55,
  owner: 'squad.delivery',
  status: 'holding',
  startDate: '2026-01-10',
  endDate: '2026-06-30'
});
addInitiative({
  subKr: subEtaModel,
  title: 'ETA 모델 재학습 자동화',
  definition: '모델 재학습 스케줄 자동화',
  progressQuant: 25,
  team: teams[7],
  owner: 'squad.eta',
  status: 'planned',
  startDate: '2026-03-05',
  endDate: '2026-06-30'
});
addInitiative({
  subKr: subQcWelcome,
  title: '가입 직후 웰컴 리워드 실험',
  definition: '웰컴 리워드 지급 정책 실험',
  progressQuant: 35,
  team: teams[4],
  owner: 'squad.qc',
  status: 'in_progress',
  startDate: '2026-02-05',
  endDate: '2026-06-20'
});
addInitiative({
  subKr: subRiderGuide,
  title: '라이더 온보딩 가이드 개편',
  definition: '온보딩 콘텐츠와 UI 개선',
  progressQuant: 52,
  team: teams[8],
  owner: 'squad.rider',
  status: 'production_released',
  startDate: '2026-01-12',
  endDate: '2026-05-25'
});
addInitiative({
  subKr: subRiderGuide,
  title: '라이더 커뮤니케이션 템플릿 개선',
  definition: '공지/알림 템플릿 표준화',
  progressQuant: 18,
  team: teams[8],
  owner: 'squad.rider',
  status: 'dropped',
  startDate: '2026-03-15',
  endDate: '2026-06-30'
});

const initiativeByTitle = new Map(initiatives.map((item) => [item.title, item]));
const experimentSpecs = [
  {
    title: '푸드 홈 상단 배너 실험',
    aarrrTag: 'Activation',
    owner: '문도윤',
    status: 'ended',
    result: '실험군(B) 위너 선정',
    hypothesis: '홈 상단 배너 노출 구성을 변경하면 첫 주문 전환율이 개선된다.',
    startDate: '2026-01-05',
    endDate: '2026-03-17',
    targetType: 'kr',
    target: krFoodMau,
    weight: 60,
    rationale: '푸드탭 활성 사용자 확대 직접 기여'
  },
  {
    title: '재방문 쿠폰 리마인드 실험',
    aarrrTag: 'Retention',
    owner: '임가은',
    status: 'winner_selected',
    result: '대조군(A) 위너 선정',
    hypothesis: '쿠폰 리마인드 타이밍을 조정하면 재방문율이 개선된다.',
    startDate: '2026-02-08',
    endDate: '2026-04-20',
    targetType: 'kr',
    target: krFoodMau,
    weight: 40,
    rationale: '재방문 보조 성장 기여'
  },
  {
    title: '추천 카드 문구 최적화 실험',
    aarrrTag: 'Activation',
    owner: '홍지민',
    status: 'winner_selected',
    result: '실험군(B) 위너 선정',
    hypothesis: '추천 카드 문구를 행동 중심으로 바꾸면 상세 진입 전환이 상승한다.',
    startDate: '2026-01-22',
    endDate: '2026-03-29',
    targetType: 'kr',
    target: krRecoConversion,
    weight: 100,
    rationale: '추천 상세 진입 전환 목표 직접 기여'
  },
  {
    title: '탐색 응답속도 개선 실험',
    aarrrTag: 'Retention',
    owner: '강현우',
    status: 'in_progress',
    result: '위너 선정 전',
    hypothesis: '탐색 API 응답시간을 단축하면 재방문 세션 비중이 증가한다.',
    startDate: '2026-03-11',
    endDate: '2026-05-23',
    targetType: 'kr',
    target: krFoodPlatform,
    weight: 100,
    rationale: '탐색 속도 개선 직접 기여'
  },
  {
    title: '파트너 업셀 구간 확장 실험',
    aarrrTag: 'Revenue',
    owner: '배수아',
    status: 'in_progress',
    result: '위너 선정 전',
    hypothesis: '업셀 구간 노출 폭을 확장하면 파트너 거래액이 증가한다.',
    startDate: '2026-04-14',
    endDate: '2026-06-26',
    targetType: 'kr',
    target: krPartnerGmv,
    weight: 100,
    rationale: '거래액 지표 직접 기여'
  },
  {
    title: '정산 알림 리마인드 실험',
    aarrrTag: 'Revenue',
    owner: '송민재',
    status: 'before_start',
    result: '위너 선정 전',
    hypothesis: '정산 알림 리마인드 주기 최적화 시 정산 안정성이 향상된다.',
    startDate: '2026-05-17',
    endDate: '2026-06-28',
    targetType: 'kr',
    target: krPartnerSettlement,
    weight: 100,
    rationale: '정산 안정 지표 직접 기여'
  },
  {
    title: '배차 로직 번들링 실험',
    aarrrTag: 'Retention',
    owner: '조은별',
    status: 'ended',
    result: '대조군(A) 위너 선정',
    hypothesis: '배차 로직 번들링 정책 적용 시 배달 성공률이 개선된다.',
    startDate: '2026-01-09',
    endDate: '2026-03-31',
    targetType: 'kr',
    target: krDeliverySuccess,
    weight: 100,
    rationale: '배달 성공 지표 직접 기여'
  },
  {
    title: 'ETA 예측모델 고도화 실험',
    aarrrTag: 'Retention',
    owner: '권도현',
    status: 'winner_selected',
    result: '실험군(B) 위너 선정',
    hypothesis: '모델 피처를 고도화하면 ETA 정확도가 향상된다.',
    startDate: '2026-01-23',
    endDate: '2026-03-28',
    targetType: 'kr',
    target: krDeliveryEta,
    weight: 100,
    rationale: 'ETA 정확도 개선 직접 기여'
  },
  {
    title: '신규가입 웰컴 퍼널 단축 실험',
    aarrrTag: 'Acquisition',
    owner: '남지윤',
    status: 'in_progress',
    result: '위너 선정 전',
    hypothesis: '가입 직후 퍼널 단계를 단축하면 첫 주문 전환이 개선된다.',
    startDate: '2026-02-06',
    endDate: '2026-04-18',
    targetType: 'kr',
    target: krQcOnboarding,
    weight: 100,
    rationale: '신규 전환 지표 직접 기여'
  },
  {
    title: '라이더 가이드 플로우 개선 실험',
    aarrrTag: 'Retention',
    owner: '서지훈',
    status: 'discarded',
    result: '위너 선정 전',
    hypothesis: '온보딩 가이드 단계를 간소화하면 라이더 만족도가 개선된다.',
    startDate: '2026-03-09',
    endDate: '2026-05-21',
    targetType: 'kr',
    target: krRiderNps,
    weight: 100,
    rationale: '라이더 만족도 지표 직접 기여'
  },
  {
    title: '추천 카드 UI 개선 후속 검증 실험',
    aarrrTag: 'Activation',
    owner: '장수빈',
    status: 'in_progress',
    result: '위너 선정 전',
    hypothesis: '카드 레이아웃 간격 조정 시 상세 페이지 진입률이 개선된다.',
    startDate: '2026-03-02',
    endDate: '2026-06-20',
    targetType: 'initiative',
    targetTitle: '추천 카드 UI 개선'
  },
  {
    title: '추천 랭킹 자동화 롤아웃 실험',
    aarrrTag: 'Activation',
    owner: '문도윤',
    status: 'before_start',
    result: '위너 선정 전',
    hypothesis: '자동화된 랭킹 배포 주기 적용 시 랭킹 품질이 안정화된다.',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    targetType: 'initiative',
    targetTitle: '추천 랭킹 실험 자동화'
  },
  {
    title: '탐색 API 캐시 TTL 비교 실험',
    aarrrTag: 'Retention',
    owner: '강현우',
    status: 'in_progress',
    result: '위너 선정 전',
    hypothesis: 'TTL 구간을 비교하면 탐색 재호출 효율이 개선된다.',
    startDate: '2026-03-20',
    endDate: '2026-06-30',
    targetType: 'initiative',
    targetTitle: '탐색 API 캐시 전략 도입'
  },
  {
    title: '업셀 배너 세그먼트 확장 후속 실험',
    aarrrTag: 'Revenue',
    owner: '배수아',
    status: 'ended',
    result: '실험군(B) 위너 선정',
    hypothesis: '세그먼트 노출 조건을 세분화하면 업셀 효율이 개선된다.',
    startDate: '2026-01-18',
    endDate: '2026-04-30',
    targetType: 'initiative',
    targetTitle: '업셀 배너 세그먼트 확장'
  },
  {
    title: '정산 이상 알림 임계치 실험',
    aarrrTag: 'Revenue',
    owner: '송민재',
    status: 'in_progress',
    result: '위너 선정 전',
    hypothesis: '알림 임계치 튜닝 시 이슈 대응 리드타임이 단축된다.',
    startDate: '2026-02-14',
    endDate: '2026-06-15',
    targetType: 'initiative',
    targetTitle: '정산 이슈 조기 경보 알림'
  },
  {
    title: '배차 정책 실험 패키지 후속 실험',
    aarrrTag: 'Retention',
    owner: '조은별',
    status: 'winner_selected',
    result: '대조군(A) 위너 선정',
    hypothesis: '배차 정책 조합을 미세 조정하면 배달 성공률 변동성이 축소된다.',
    startDate: '2026-02-01',
    endDate: '2026-05-31',
    targetType: 'initiative',
    targetTitle: '배차 정책 실험 패키지'
  },
  {
    title: 'ETA 재학습 주기 최적화 실험',
    aarrrTag: 'Retention',
    owner: '권도현',
    status: 'before_start',
    result: '위너 선정 전',
    hypothesis: '재학습 주기를 최적화하면 ETA 정확도 개선 폭이 증가한다.',
    startDate: '2026-04-10',
    endDate: '2026-06-30',
    targetType: 'initiative',
    targetTitle: 'ETA 모델 재학습 자동화'
  },
  {
    title: '웰컴 리워드 조건 분기 실험',
    aarrrTag: 'Acquisition',
    owner: '남지윤',
    status: 'in_progress',
    result: '위너 선정 전',
    hypothesis: '리워드 조건 분기 적용 시 가입 후 첫 주문 전환율이 상승한다.',
    startDate: '2026-02-21',
    endDate: '2026-06-20',
    targetType: 'initiative',
    targetTitle: '가입 직후 웰컴 리워드 실험'
  },
  {
    title: '라이더 온보딩 가이드 개편 후속 실험',
    aarrrTag: 'Retention',
    owner: '서지훈',
    status: 'winner_selected',
    result: '실험군(B) 위너 선정',
    hypothesis: '온보딩 가이드 문구 개선 시 라이더 초기 이탈률이 감소한다.',
    startDate: '2026-01-26',
    endDate: '2026-05-25',
    targetType: 'initiative',
    targetTitle: '라이더 온보딩 가이드 개편'
  },
  {
    title: '라이더 커뮤니케이션 템플릿 개선 검증 실험',
    aarrrTag: 'Retention',
    owner: '장수빈',
    status: 'before_start',
    result: '위너 선정 전',
    hypothesis: '공지 템플릿 구조를 정비하면 공지 확인율이 상승한다.',
    startDate: '2026-03-15',
    endDate: '2026-06-30',
    targetType: 'initiative',
    targetTitle: '라이더 커뮤니케이션 템플릿 개선'
  }
];

experimentSpecs.forEach((spec) => {
  const experiment = addExperiment({
    title: spec.title,
    aarrrTag: spec.aarrrTag,
    owner: spec.owner,
    status: spec.status,
    hypothesis: spec.hypothesis,
    startDate: spec.startDate,
    endDate: spec.endDate,
    result: spec.result
  });

  if (spec.targetType === 'kr') {
    addKrLink({
      kr: spec.target,
      experiment,
      weight: Number.isFinite(Number(spec.weight)) ? Number(spec.weight) : 100,
      rationale: spec.rationale || null
    });
    return;
  }

  if (spec.targetType === 'initiative') {
    const initiative = initiativeByTitle.get(spec.targetTitle);
    if (!initiative) {
      throw new Error(`initiative target not found: ${spec.targetTitle}`);
    }
    addInitiativeLink({ initiative, experiment });
  }
});

addInputSource({
  title: '추천 카드 클릭률 하락 대응',
  summary: '추천 카드 상세 진입률이 2주 연속 하락해 즉시 개선이 필요합니다.',
  detail: '카드 타이틀 길이와 CTA 위치 변경안 비교 테스트 필요',
  referenceUrl: 'https://docs.example.com/input/reco-card-drop',
  division: divisions[0].name,
  team: teams[0],
  reporter: '김민수',
  kr: krRecoConversion,
  reach: 3,
  impact: 3,
  confidence: 2,
  effort: 2,
  status: 'converted',
  workingTeam: teams[0],
  linkedInitiative: initiativeByTitle.get('추천 카드 UI 개선')
});

addInputSource({
  title: '추천 랭킹 자동화 기준 정비',
  summary: '랭킹 품질 편차가 커서 배포 기준 자동화가 필요합니다.',
  detail: '랭킹 산식/노출군별 품질 기준표 정리 요청',
  referenceUrl: 'https://docs.example.com/input/reco-ranking-rule',
  division: divisions[0].name,
  team: teams[0],
  reporter: '이서연',
  kr: krRecoConversion,
  reach: 2,
  impact: 3,
  confidence: 2,
  effort: 2,
  status: 'converted',
  workingTeam: teams[0],
  linkedInitiative: initiativeByTitle.get('추천 랭킹 실험 자동화')
});

addInputSource({
  title: '푸드 홈 첫 진입 UX 개선 제안',
  summary: '첫 진입 유저의 홈 이탈률이 높아 카드 탐색 경로 개선이 필요합니다.',
  detail: '온보딩 퀵탭과 추천 묶음 섹션 우선순위 조정 제안',
  referenceUrl: 'https://docs.example.com/input/food-home-entry',
  division: divisions[0].name,
  team: teams[3],
  reporter: '박준호',
  kr: krFoodMau,
  reach: 3,
  impact: 2,
  confidence: 2,
  effort: 3,
  status: 'registered'
});

addInputSource({
  title: '탐색 API 캐시 미스율 개선',
  summary: '캐시 미스율이 증가하여 응답속도 저하 이슈가 관측됩니다.',
  detail: 'TTL 정책 재정의 및 캐시 키 정합성 점검 필요',
  referenceUrl: 'https://docs.example.com/input/search-cache-miss',
  division: divisions[0].name,
  team: teams[3],
  reporter: '최지우',
  kr: krFoodPlatform,
  reach: 3,
  impact: 3,
  confidence: 3,
  effort: 2,
  status: 'converted',
  workingTeam: teams[3],
  linkedInitiative: initiativeByTitle.get('탐색 API 캐시 전략 도입')
});

addInputSource({
  title: '업셀 배너 과노출 VOC',
  summary: '업셀 배너 과노출 관련 VOC가 증가하여 노출 정책 재검토 필요',
  detail: '세그먼트별 빈도 제한과 예외 조건 정의 필요',
  referenceUrl: 'https://docs.example.com/input/upsell-voc',
  division: divisions[7].name,
  team: teams[1],
  reporter: '정하늘',
  kr: krPartnerGmv,
  reach: 2,
  impact: 2,
  confidence: 2,
  effort: 2,
  status: 'converted',
  workingTeam: teams[1],
  linkedInitiative: initiativeByTitle.get('업셀 배너 세그먼트 확장')
});

addInputSource({
  title: '정산 알림 채널 통합 요청',
  summary: '정산 이슈 알림이 다채널로 분산되어 대응 누락 가능성 존재',
  detail: '알림 라우팅 단일화가 필요하나 외부 의존성이 높음',
  referenceUrl: 'https://docs.example.com/input/settlement-alert-channel',
  division: divisions[6].name,
  team: teams[6],
  reporter: '오지훈',
  kr: krPartnerSettlement,
  reach: 2,
  impact: 2,
  confidence: 1,
  effort: 3,
  status: 'rejected',
  workingTeam: teams[6],
  rejectionReason: '외부 시스템 의존성이 커서 이번 반기 범위에서 제외'
});

addInputSource({
  title: '배차 예외 케이스 분류 자동화',
  summary: '배차 실패 원인 라벨링 자동화로 장애 대응 시간을 단축하고자 함',
  detail: '실시간 라벨 모델 정확도 검증 필요',
  referenceUrl: 'https://docs.example.com/input/dispatch-labeling',
  division: divisions[11].name,
  team: teams[7],
  reporter: '윤태호',
  kr: krDeliverySuccess,
  reach: 2,
  impact: 3,
  confidence: 2,
  effort: 2,
  status: 'converted',
  workingTeam: teams[7],
  linkedInitiative: initiativeByTitle.get('배차 정책 실험 패키지')
});

addInputSource({
  title: 'ETA 오차 큰 구간 보정',
  summary: '피크타임 특정 구간에서 ETA 오차가 반복적으로 높게 발생',
  detail: '구간별 피처와 재학습 주기 분리 실험 필요',
  referenceUrl: 'https://docs.example.com/input/eta-bias-fix',
  division: divisions[11].name,
  team: teams[7],
  reporter: '한유진',
  kr: krDeliveryEta,
  reach: 2,
  impact: 3,
  confidence: 2,
  effort: 2,
  status: 'converted',
  workingTeam: teams[7],
  linkedInitiative: initiativeByTitle.get('ETA 모델 재학습 자동화')
});

addInputSource({
  title: '신규가입 웰컴 리워드 조건 단순화',
  summary: '웰컴 리워드 조건이 복잡해 전환 저해 요인으로 작용',
  detail: '조건 단순화 시 비용 리스크 검토 필요',
  referenceUrl: 'https://docs.example.com/input/welcome-reward',
  division: divisions[1].name,
  team: teams[4],
  reporter: '장수빈',
  kr: krQcOnboarding,
  reach: 3,
  impact: 3,
  confidence: 2,
  effort: 2,
  status: 'converted',
  workingTeam: teams[4],
  linkedInitiative: initiativeByTitle.get('가입 직후 웰컴 리워드 실험')
});

addInputSource({
  title: '라이더 온보딩 문구 난이도 개선',
  summary: '온보딩 가이드 문구 난이도가 높아 초기 이탈이 증가',
  detail: '난이도별 버전 분기와 FAQ 링크 강화 필요',
  referenceUrl: 'https://docs.example.com/input/rider-guide-copy',
  division: divisions[13].name,
  team: teams[8],
  reporter: '문도윤',
  kr: krRiderNps,
  reach: 2,
  impact: 3,
  confidence: 2,
  effort: 2,
  status: 'converted',
  workingTeam: teams[8],
  linkedInitiative: initiativeByTitle.get('라이더 온보딩 가이드 개편')
});

addInputSource({
  title: '라이더 공지 템플릿 통합 제안',
  summary: '공지 템플릿이 채널별로 달라 전달 일관성이 떨어집니다.',
  detail: '템플릿 통합 시 브랜드/법무 검토 선행 필요',
  referenceUrl: 'https://docs.example.com/input/rider-template',
  division: divisions[13].name,
  team: teams[8],
  reporter: '임가은',
  kr: krRiderNps,
  reach: 1,
  impact: 2,
  confidence: 2,
  effort: 3,
  status: 'converted',
  workingTeam: teams[8],
  linkedInitiative: initiativeByTitle.get('라이더 커뮤니케이션 템플릿 개선')
});

addInputSource({
  title: '파트너 정산 상세 리포트 추가 요청',
  summary: '파트너가 상세 정산 리포트 자동 발송 기능을 요청했습니다.',
  detail: '리포트 생성 비용이 높아 분기 내 구현 난이도 큼',
  referenceUrl: 'https://docs.example.com/input/partner-report',
  division: divisions[6].name,
  team: teams[6],
  reporter: '홍지민',
  kr: krPartnerSettlement,
  reach: 1,
  impact: 2,
  confidence: 1,
  effort: 3,
  status: 'rejected',
  workingTeam: teams[6],
  rejectionReason: '분기 내 처리 가능한 범위를 초과하여 백로그로 이관'
});

// KR 신호 분포: green 2 / yellow 4 / red 3
addMonthlySeries({
  targetType: 'kr',
  targetId: krFoodMau.id,
  values: [80, 90, 95, 100, 110, 120],
  sourceType: 'synced',
  notePrefix: 'kr-food-mau'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krRecoConversion.id,
  values: [8, 10, 11, 12, 14, 15],
  sourceType: 'calculated',
  notePrefix: 'kr-reco'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krFoodPlatform.id,
  values: [5, 6, 8, 9, 10, 11],
  sourceType: 'manual',
  notePrefix: 'kr-platform'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krPartnerGmv.id,
  values: [30, 32, 34, 36, 38, 40],
  sourceType: 'synced',
  notePrefix: 'kr-gmv'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krPartnerSettlement.id,
  values: [20, 25, 30, 35, 40, 45],
  sourceType: 'manual',
  notePrefix: 'kr-settle'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krDeliverySuccess.id,
  values: [10, 12, 15, 16, 18, 20],
  sourceType: 'synced',
  notePrefix: 'kr-delivery-success'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krDeliveryEta.id,
  values: [8, 9, 10, 11, 12, 14],
  sourceType: 'manual',
  notePrefix: 'kr-eta'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krQcOnboarding.id,
  values: [4, 5, 6, 7, 8, 9],
  sourceType: 'manual',
  notePrefix: 'kr-qc'
});
addMonthlySeries({
  targetType: 'kr',
  targetId: krRiderNps.id,
  values: [10, 11, 12, 13, 14, 15],
  sourceType: 'manual',
  notePrefix: 'kr-rider'
});

// Sub-KR 샘플(월 3, 6 중심)
[
  { subKr: subFoodHome, m3: 13, m6: 18, sourceType: 'manual' },
  { subKr: subRecoCard, m3: 58, m6: 76, sourceType: 'calculated' },
  { subKr: subPlatformLatency, m3: 33, m6: 51, sourceType: 'manual' },
  { subKr: subPartnerUpsell, m3: 44, m6: 60, sourceType: 'synced' },
  { subKr: subSettlementAlert, m3: 55, m6: 71, sourceType: 'manual' },
  { subKr: subDeliverySuccess, m3: 68, m6: 79, sourceType: 'synced' },
  { subKr: subEtaModel, m3: 59, m6: 67, sourceType: 'manual' },
  { subKr: subQcWelcome, m3: 43, m6: 58, sourceType: 'manual' },
  { subKr: subRiderGuide, m3: 61, m6: 74, sourceType: 'manual' }
].forEach((item) => {
  addMonthly({
    targetType: 'sub_kr',
    targetId: item.subKr.id,
    month: 3,
    value: item.m3,
    sourceType: item.sourceType,
    note: 'q1'
  });
  addMonthly({
    targetType: 'sub_kr',
    targetId: item.subKr.id,
    month: 6,
    value: item.m6,
    sourceType: item.sourceType,
    note: 'q2'
  });
});

// Initiative 샘플(완료 여부/진행률 표현)
initiatives.forEach((initiative, idx) => {
  const q1Value = Number((0.15 + (idx % 4) * 0.12).toFixed(2));
  const q2Value = Number(Math.min(1, q1Value + 0.35).toFixed(2));
  addMonthly({
    targetType: 'initiative',
    targetId: initiative.id,
    month: 3,
    value: q1Value,
    sourceType: 'manual',
    note: 'q1'
  });
  addMonthly({
    targetType: 'initiative',
    targetId: initiative.id,
    month: 6,
    value: q2Value,
    sourceType: 'manual',
    note: 'q2'
  });
});

const decisionLogs = [
  {
    id: id('decision'),
    title: 'AARRR 프리셋에 - 포함',
    context: '실 O/실 KR은 AARRR 비대상인 경우가 있음',
    decision: 'AARRR 프리셋 첫 옵션으로 - 제공',
    actor: 'lead.han',
    timestamp: nowIso()
  },
  {
    id: id('decision'),
    title: '리뷰 우선순위 기준 확정',
    context: '리뷰 대시보드에 대상이 비어있어 가시성이 낮음',
    decision: 'red/yellow 신호 KR을 달성률 오름차순으로 우선 노출',
    actor: 'lead.pm',
    timestamp: nowIso()
  }
];

const objectiveOwnerNames = ['김민수', '이서연', '박준호', '최지우', '정하늘'];
const krOwnerNames = ['최지우', '정하늘', '한유진', '오지훈', '신예린', '윤태호', '장수빈', '문도윤', '임가은'];
const subKrOwnerNames = ['한유진', '오지훈', '신예린', '윤태호', '장수빈', '문도윤', '임가은', '홍지민', '강현우'];
const initiativeOwnerNames = ['장수빈', '문도윤', '임가은', '홍지민', '강현우', '배수아', '송민재', '조은별', '권도현', '남지윤'];

objectives.forEach((item, idx) => {
  item.owner = objectiveOwnerNames[idx % objectiveOwnerNames.length];
});
krs.forEach((item, idx) => {
  item.owner = krOwnerNames[idx % krOwnerNames.length];
});
subKrs.forEach((item, idx) => {
  item.owner = subKrOwnerNames[idx % subKrOwnerNames.length];
});
initiatives.forEach((item, idx) => {
  item.owner = initiativeOwnerNames[idx % initiativeOwnerNames.length];
});

const store = {
  objectives,
  krs,
  subKrs,
  initiatives,
  experiments,
  krExperimentLinks,
  initiativeExperimentLinks,
  inputSources,
  monthlyPerformances,
  decisionLogs,
  auditLogs: []
};

addAuditLog(store, {
  actor: 'seed.system',
  reason: 'expanded sample dataset for dashboard and review',
  action: 'seed',
  entityType: 'dataset',
  entityId: 'prototype',
  beforeValue: null,
  afterValue: {
    objectiveCount: objectives.length,
    krCount: krs.length,
    subKrCount: subKrs.length,
    initiativeCount: initiatives.length,
    experimentCount: experiments.length,
    inputSourceCount: inputSources.length,
    divisionCount: divisions.length,
    teamCount: teams.length
  }
});

writeStore(filePath, store);
console.log(`Seeded data file: ${filePath}`);
console.log(`Objectives: ${store.objectives.length}`);
console.log(`KRs: ${store.krs.length}`);
console.log(`Sub-KRs: ${store.subKrs.length}`);
console.log(`Initiatives: ${store.initiatives.length}`);
console.log(`Experiments: ${store.experiments.length}`);
console.log(`Input Sources: ${store.inputSources.length}`);
console.log(`Divisions: ${divisions.length}`);
console.log(`Teams: ${teams.length}`);
