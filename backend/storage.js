const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config()

// ---------------- MONGODB SCHEMAS ----------------
const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  registrationNumber: { type: String },
  email: { type: String, required: true },
  role: { type: String, default: 'student' },
  createdAt: { type: String, default: () => new Date().toISOString() }
})

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  registrationNumber: { type: String },
  code: { type: String, required: true },
  expiresAt: { type: Number, required: true }
})

const contestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationMinutes: { type: Number, default: 60 },
  questions: { type: Array, default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() }
})

const submissionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  contestId: { type: String },
  contestTitle: { type: String },
  questionId: { type: String },
  questionTitle: { type: String },
  userId: { type: String },
  userName: { type: String },
  registrationNumber: { type: String },
  email: { type: String },
  language: { type: String },
  code: { type: String },
  score: { type: Number, default: 0 },
  passedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  status: { type: String },
  testResults: { type: Array, default: [] },
  submittedAt: { type: String, default: () => new Date().toISOString() }
})

const UserModel = mongoose.models.User || mongoose.model('User', userSchema)
const OtpModel = mongoose.models.Otp || mongoose.model('Otp', otpSchema)
const ContestModel = mongoose.models.Contest || mongoose.model('Contest', contestSchema)
const SubmissionModel = mongoose.models.Submission || mongoose.model('Submission', submissionSchema)

let isMongoConnected = false

// Initialize MongoDB connection if MONGODB_URI is provided
const mongoUri = process.env.MONGODB_URI
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => {
      isMongoConnected = true
      console.log('✅ MongoDB connected successfully to Cloud Database!')
    })
    .catch((err) => {
      console.error('❌ MongoDB Connection Error:', err.message)
      console.log('⚠️ Falling back to local db.json storage.')
    })
} else {
  console.log('ℹ️ MONGODB_URI environment variable not found. Using local db.json storage.')
}

// ---------------- LOCAL JSON FALLBACK SETUP ----------------
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || (process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(__dirname, 'data')))
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

const defaultData = {
  users: [
    {
      id: 'admin_1',
      name: 'System Admin',
      registrationNumber: 'ADMIN001',
      email: 'admin@codeviit.edu.in',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ],
  otps: [],
  contests: [],
  submissions: []
}

let inMemoryData = JSON.parse(JSON.stringify(defaultData))

function ensureDbExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryData, null, 2))
    }
  } catch (e) {
    // Ignore read-only filesystem errors
  }
}

function readDb() {
  ensureDbExists()
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8')
      const parsed = JSON.parse(raw)
      inMemoryData = parsed
      return parsed
    }
  } catch (err) {
    // Ignore read-only errors
  }
  return inMemoryData
}

function writeDb(data) {
  inMemoryData = data
  try {
    ensureDbExists()
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    // Ignore read-only errors
  }
}

// ---------------- STORAGE API EXPORTS ----------------
module.exports = {
  // Users
  getUsers: async () => {
    if (isMongoConnected) {
      const users = await UserModel.find({}).lean()
      return users
    }
    const db = readDb()
    return db.users || []
  },

  findUserByEmail: async (email) => {
    if (isMongoConnected) {
      return await UserModel.findOne({ email: new RegExp(`^${email}$`, 'i') }).lean()
    }
    const db = readDb()
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  },

  saveUser: async (user) => {
    if (isMongoConnected) {
      const updated = await UserModel.findOneAndUpdate(
        { $or: [{ id: user.id }, { email: new RegExp(`^${user.email}$`, 'i') }] },
        user,
        { upsert: true, new: true }
      ).lean()
      return updated
    }
    const db = readDb()
    const existingIdx = db.users.findIndex(u =>
      (u.id && u.id === user.id) ||
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
    )
    if (existingIdx >= 0) {
      db.users[existingIdx] = { ...db.users[existingIdx], ...user }
    } else {
      db.users.push(user)
    }
    writeDb(db)
    return user
  },

  // OTPs
  saveOtp: async (otpData) => {
    if (isMongoConnected) {
      await OtpModel.deleteMany({ email: new RegExp(`^${otpData.email}$`, 'i') })
      await OtpModel.create(otpData)
      return
    }
    const db = readDb()
    db.otps = (db.otps || []).filter(o => o.email.toLowerCase() !== otpData.email.toLowerCase())
    db.otps.push(otpData)
    writeDb(db)
  },

  verifyOtp: async (email, code) => {
    if (isMongoConnected) {
      const record = await OtpModel.findOne({ email: new RegExp(`^${email}$`, 'i') }).lean()
      if (!record) return { valid: false, message: 'OTP not found or expired. Please request a new OTP.' }
      
      if (Date.now() > record.expiresAt) {
        await OtpModel.deleteOne({ email: new RegExp(`^${email}$`, 'i') })
        return { valid: false, message: 'OTP has expired. Please request a new OTP.' }
      }

      if (record.code !== code.trim()) {
        return { valid: false, message: 'Invalid OTP code. Please check and try again.' }
      }

      await OtpModel.deleteOne({ email: new RegExp(`^${email}$`, 'i') })
      return { valid: true }
    }

    const db = readDb()
    const record = (db.otps || []).find(o => o.email.toLowerCase() === email.toLowerCase())
    if (!record) return { valid: false, message: 'OTP not found or expired. Please request a new OTP.' }
    
    if (Date.now() > record.expiresAt) {
      db.otps = db.otps.filter(o => o.email.toLowerCase() !== email.toLowerCase())
      writeDb(db)
      return { valid: false, message: 'OTP has expired. Please request a new OTP.' }
    }

    if (record.code !== code.trim()) {
      return { valid: false, message: 'Invalid OTP code. Please check and try again.' }
    }

    db.otps = db.otps.filter(o => o.email.toLowerCase() !== email.toLowerCase())
    writeDb(db)
    return { valid: true }
  },

  // Contests
  getContests: async () => {
    if (isMongoConnected) {
      return await ContestModel.find({}).sort({ createdAt: -1 }).lean()
    }
    const db = readDb()
    return db.contests || []
  },

  getContestById: async (id) => {
    if (isMongoConnected) {
      return await ContestModel.findOne({ id }).lean()
    }
    const db = readDb()
    return (db.contests || []).find(c => c.id === id)
  },

  saveContest: async (contest) => {
    if (isMongoConnected) {
      return await ContestModel.findOneAndUpdate(
        { id: contest.id },
        contest,
        { upsert: true, new: true }
      ).lean()
    }
    const db = readDb()
    if (!db.contests) db.contests = []
    const idx = db.contests.findIndex(c => c.id === contest.id)
    if (idx >= 0) {
      db.contests[idx] = contest
    } else {
      db.contests.unshift(contest)
    }
    writeDb(db)
    return contest
  },

  deleteContest: async (id) => {
    if (isMongoConnected) {
      await ContestModel.deleteOne({ id })
      return
    }
    const db = readDb()
    db.contests = (db.contests || []).filter(c => c.id !== id)
    writeDb(db)
  },

  // Submissions
  getSubmissions: async () => {
    if (isMongoConnected) {
      return await SubmissionModel.find({}).sort({ submittedAt: -1 }).lean()
    }
    const db = readDb()
    return db.submissions || []
  },

  getUserSubmissions: async (identifiers) => {
    const list = Array.isArray(identifiers) ? identifiers.filter(Boolean) : [identifiers].filter(Boolean)
    if (list.length === 0) return []

    if (isMongoConnected) {
      const orConditions = list.flatMap(id => [
        { userId: id },
        { email: new RegExp(`^${id}$`, 'i') },
        { registrationNumber: new RegExp(`^${id}$`, 'i') }
      ])
      return await SubmissionModel.find({ $or: orConditions }).sort({ submittedAt: -1 }).lean()
    }

    const db = readDb()
    const lowerList = list.map(l => l.toString().toLowerCase())

    const matchedUsers = (db.users || []).filter(u =>
      (u.id && lowerList.includes(u.id.toLowerCase())) ||
      (u.email && lowerList.includes(u.email.toLowerCase())) ||
      (u.registrationNumber && lowerList.includes(u.registrationNumber.toLowerCase()))
    )

    const fullMatchSet = new Set([
      ...lowerList,
      ...matchedUsers.map(u => u.id?.toLowerCase()).filter(Boolean),
      ...matchedUsers.map(u => u.email?.toLowerCase()).filter(Boolean),
      ...matchedUsers.map(u => u.registrationNumber?.toLowerCase()).filter(Boolean)
    ])

    return (db.submissions || []).filter(s =>
      (s.userId && fullMatchSet.has(s.userId.toLowerCase())) ||
      (s.email && fullMatchSet.has(s.email.toLowerCase())) ||
      (s.registrationNumber && fullMatchSet.has(s.registrationNumber.toLowerCase()))
    )
  },

  getUsersWithStats: async () => {
    let users = []
    let submissions = []
    if (isMongoConnected) {
      users = await UserModel.find({}).lean()
      submissions = await SubmissionModel.find({}).lean()
    } else {
      const db = readDb()
      users = db.users || []
      submissions = db.submissions || []
    }

    return users.map(user => {
      const userMatchSet = new Set([
        user.id?.toLowerCase(),
        user.email?.toLowerCase(),
        user.registrationNumber?.toLowerCase()
      ].filter(Boolean))

      const userSubs = submissions.filter(s =>
        (s.userId && userMatchSet.has(s.userId.toLowerCase())) ||
        (s.email && userMatchSet.has(s.email.toLowerCase())) ||
        (s.registrationNumber && userMatchSet.has(s.registrationNumber.toLowerCase()))
      )

      const contestProblemScores = {}
      const attemptedContests = new Set()

      userSubs.forEach(s => {
        if (s.contestId) {
          attemptedContests.add(s.contestId)
          const key = `${s.contestId}:::${s.questionId || 'q0'}`
          contestProblemScores[key] = Math.max(contestProblemScores[key] || 0, s.score || 0)
        }
      })

      const totalPoints = Object.values(contestProblemScores).reduce((a, b) => a + b, 0)

      return {
        ...user,
        totalPoints,
        contestsAttempted: attemptedContests.size,
        submissionsCount: userSubs.length
      }
    })
  },

  saveSubmission: async (submission) => {
    if (isMongoConnected) {
      return await SubmissionModel.create(submission)
    }
    const db = readDb()
    if (!db.submissions) db.submissions = []
    db.submissions.unshift(submission)
    writeDb(db)
    return submission
  }
}
