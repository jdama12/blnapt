export const navigationItems = [
  { label: '단지소개', href: '#about' },
  { label: '생활환경', href: '#living' },
  { label: '단지소식', href: '#news' },
  { label: '입주민서비스', href: '#resident' },
]

export const complexStats = [
  { value: '734', label: '세대' },
  { value: '7', label: '개동' },
  { value: '2003', label: '사용승인' },
]

export const livingItems = [
  { icon: 'park', eyebrow: 'PARK', title: '보라매공원', description: '도심 가까이에서 산책과 휴식을 누리는 쾌적한 공원 생활권' },
  { icon: 'transport', eyebrow: 'TRANSPORT', title: '편리한 교통환경', description: '주요 업무지구와 생활권을 편리하게 연결하는 대중교통 환경' },
  { icon: 'education', eyebrow: 'EDUCATION', title: '교육환경', description: '일상 가까이에서 이용할 수 있는 안정적인 교육시설 접근성' },
  { icon: 'medical', eyebrow: 'MEDICAL', title: '의료환경', description: '보라매병원을 비롯한 생활권 내 의료시설의 편리한 접근성' },
] as const

export const newsItems = [
  { date: '2026.06', title: '엘리베이터 새단장 완료' },
]

export const residentServices = ['민원접수', '처리현황', '생활공지', '시설안내']

export const externalLinks = [
  {
    label: '네이버에서 보라매롯데낙천대 검색',
    description: '포털 검색 결과 보기',
    href: 'https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=%EB%B3%B4%EB%9D%BC%EB%A7%A4%EB%A1%AF%EB%8D%B0%EB%82%99%EC%B2%9C%EB%8C%80',
  },
  {
    label: '네이버 부동산 단지정보',
    description: '지도와 주변 정보 보기',
    href: 'https://fin.land.naver.com/map?center=3zeKUf-2AJ21E&zoom=15&layer=NobwRAlgJmBcYGMD2BbADgGwKYA8D6UWALgIYQZgA0YaJATiSgM5zjLrY4CSM8AzHwAcANjABfakyz0EACwAK9Ri1jhSAIziJUmXAFoIAOwBmScWIC6QA',
  },
  { label: '서울시 공동주택 정보', description: '공식 연결 주소 준비 중', href: null },
  { label: 'K-apt 공동주택관리정보', description: '공식 연결 주소 준비 중', href: null },
]

export const naverMapUrl =
  'https://naver.me/56X2iaMx'
