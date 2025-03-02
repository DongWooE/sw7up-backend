const access = [
  'operator',
  'staff',
  'student',
];

const roles = [
  'admin',
  ...access
];

const permissions = [
  'all',
  'corruption report',
  'gallery',
  'newsletter',
  'notice',
  'operator',
  'press release',
  'resource',
  'qna',
  'staff',
  'student',
];

const centers = [
  '사업팀',
  'SW전공교육센터',
  'SW기초교육센터',
  'SW융합교육센터',
  'SW융합교육센터',
  'SW산학협력센터',
  '오픈소스SW센터'
];

const fileTypes = [
  'UserInfo',
  'CorruptionReport',
  'Gallery',
  'Notice',
  'PressRelease',
  'Resource',
];

const qnaCategories = [
  '기초컴퓨터프로그래밍',
  '정보기술프로그래밍',
  '정보기술의 이해',
  '파이썬 프로그래밍',
  'IoT기술과 프로그래밍',
  '인공지능과 기계학습',
  '빅데이터 이해와 분석',
  '자료구조와 문제해결기법',
  'Java 프로그래밍 기초',
  '운영체제의 이해',
  '웹 응용 프로그래밍'
];

exports.ROLES = roles;
exports.PERMISSIONS = permissions;
exports.CENTERS = centers;
exports.NOTICE_CATEGORIES = centers;
exports.FILE_ACCESS = access;
exports.NOTICE_ACCESS = access;
exports.FILE_TYPES = fileTypes;
exports.QNA_CATEGORIES = qnaCategories;
