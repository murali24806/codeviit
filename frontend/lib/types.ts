export interface User {
  id: string
  name: string
  registrationNumber?: string
  email: string
  role?: 'student' | 'admin'
  createdAt?: string
  totalPoints?: number
  contestsAttempted?: number
  submissionsCount?: number
}

export interface TestCase {
  id: string
  input: string
  expectedOutput: string
  description?: string
}

export interface TestResult {
  id?: string
  passed: boolean
  input: string
  expectedOutput: string
  actualOutput: string
  error?: string | null
  status?: string
}

export interface Problem {
  id: string
  title: string
  description: string
  language: string
  code: string
  testCases: TestCase[]
  lastEdited: Date
  userId: string
}

export interface ContestQuestion {
  id: string
  title: string
  description: string
  inputFormat?: string
  outputFormat?: string
  constraints?: string
  sampleInput?: string
  sampleOutput?: string
  starterCode?: Record<string, string>
  testCases: TestCase[]
}

export interface Contest {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  durationMinutes: number
  questions: ContestQuestion[]
  createdAt?: string
}

export interface ContestSubmission {
  id: string
  contestId: string
  contestTitle: string
  questionId: string
  questionTitle: string
  userId: string
  userName: string
  registrationNumber: string
  email?: string
  language: string
  code: string
  score: number
  passedCount: number
  totalCount: number
  status: string
  submittedAt: string
}

export type Language = 'python' | 'javascript' | 'cpp' | 'c' | 'java' | 'go' | 'rust'

export const LANGUAGES: { value: Language; label: string; color: string }[] = [
  { value: 'python', label: 'Python', color: 'bg-blue-500' },
  { value: 'javascript', label: 'JavaScript', color: 'bg-yellow-500' },
  { value: 'cpp', label: 'C++', color: 'bg-orange-500' },
  { value: 'c', label: 'C', color: 'bg-gray-500' },
  { value: 'java', label: 'Java', color: 'bg-red-500' },
  { value: 'go', label: 'Go', color: 'bg-cyan-500' },
  { value: 'rust', label: 'Rust', color: 'bg-orange-600' },
]
