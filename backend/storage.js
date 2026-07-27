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

let mongoPromise = null

async function ensureMongoConnected() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) return false

  if (mongoose.connection.readyState === 1) {
    return true
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    })
      .then(() => {
        console.log('✅ MongoDB connected successfully to Cloud Database!')
        return true
      })
      .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err.message)
        mongoPromise = null
        return false
      })
  }

  try {
    await mongoPromise
    return mongoose.connection.readyState === 1
  } catch (err) {
    mongoPromise = null
    return false
  }
}

// ---------------- LOCAL JSON FALLBACK SETUP ----------------
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || (process.env.NODE_ENV === 'production' && !fs.existsSync(path.join(__dirname, 'data')))
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

let defaultData = {
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

try {
  const seedPath = path.join(__dirname, 'data', 'db.json')
  if (fs.existsSync(seedPath)) {
    const rawSeed = fs.readFileSync(seedPath, 'utf8')
    defaultData = JSON.parse(rawSeed)
  }
} catch (e) {
  // Ignore seed load errors
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
      if (!parsed.contests) {
        parsed.contests = defaultData.contests || []
      }
      if (!parsed.submissions) {
        parsed.submissions = defaultData.submissions || []
      }
      if (!parsed.users) {
        parsed.users = defaultData.users || []
      }
      if (!parsed.otps) {
        parsed.otps = []
      }
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
    if (await ensureMongoConnected()) {
      return await UserModel.find({}).lean()
    }
    const db = readDb()
    return db.users || []
  },

  findUserByEmail: async (email) => {
    if (!email) return null
    const clean = email.trim().toLowerCase()
    if (await ensureMongoConnected()) {
      return await UserModel.findOne({ email: new RegExp(`^${clean}$`, 'i') }).lean()
    }
    const db = readDb()
    return (db.users || []).find(u => u.email && u.email.toLowerCase() === clean)
  },

  saveUser: async (user) => {
    const cleanEmail = user.email ? user.email.trim().toLowerCase() : ''
    const userToSave = {
      ...user,
      email: cleanEmail
    }

    if (await ensureMongoConnected()) {
      const emailRegex = new RegExp(`^${cleanEmail}$`, 'i')
      let existing = await UserModel.findOne({ $or: [{ id: user.id }, { email: emailRegex }] })
      if (existing) {
        existing.name = userToSave.name || existing.name
        existing.registrationNumber = userToSave.registrationNumber || existing.registrationNumber
        existing.email = cleanEmail || existing.email
        existing.role = userToSave.role || existing.role || 'student'
        await existing.save()
        return existing.toObject()
      } else {
        const created = await UserModel.create(userToSave)
        return created.toObject()
      }
    }
    const db = readDb()
    if (!db.users) db.users = []
    const existingIdx = db.users.findIndex(u =>
      (u.id && u.id === user.id) ||
      (u.email && cleanEmail && u.email.toLowerCase() === cleanEmail)
    )
    if (existingIdx >= 0) {
      db.users[existingIdx] = { ...db.users[existingIdx], ...userToSave }
    } else {
      db.users.push(userToSave)
    }
    writeDb(db)
    return userToSave
  },

  // OTPs
  saveOtp: async (otpData) => {
    const cleanEmail = otpData.email ? otpData.email.trim().toLowerCase() : ''
    const dataToSave = { ...otpData, email: cleanEmail }
    if (await ensureMongoConnected()) {
      await OtpModel.deleteMany({ email: new RegExp(`^${cleanEmail}$`, 'i') })
      await OtpModel.create(dataToSave)
      return
    }
    const db = readDb()
    db.otps = (db.otps || []).filter(o => o.email.toLowerCase() !== cleanEmail)
    db.otps.push(dataToSave)
    writeDb(db)
  },

  verifyOtp: async (email, code) => {
    const cleanEmail = email ? email.trim().toLowerCase() : ''
    const cleanCode = code ? code.trim() : ''
    if (await ensureMongoConnected()) {
      const record = await OtpModel.findOne({ email: new RegExp(`^${cleanEmail}$`, 'i') }).lean()
      if (!record) return { valid: false, message: 'OTP not found or expired. Please request a new OTP.' }
      
      if (Date.now() > record.expiresAt) {
        await OtpModel.deleteOne({ email: new RegExp(`^${cleanEmail}$`, 'i') })
        return { valid: false, message: 'OTP has expired. Please request a new OTP.' }
      }

      if (record.code !== cleanCode) {
        return { valid: false, message: 'Invalid OTP code. Please check and try again.' }
      }

      await OtpModel.deleteOne({ email: new RegExp(`^${cleanEmail}$`, 'i') })
      return { valid: true, otpRecord: record }
    }

    const db = readDb()
    const record = (db.otps || []).find(o => o.email && o.email.toLowerCase() === cleanEmail)
    if (!record) return { valid: false, message: 'OTP not found or expired. Please request a new OTP.' }
    
    if (Date.now() > record.expiresAt) {
      db.otps = db.otps.filter(o => o.email.toLowerCase() !== cleanEmail)
      writeDb(db)
      return { valid: false, message: 'OTP has expired. Please request a new OTP.' }
    }

    if (record.code !== cleanCode) {
      return { valid: false, message: 'Invalid OTP code. Please check and try again.' }
    }

    db.otps = db.otps.filter(o => o.email.toLowerCase() !== cleanEmail)
    writeDb(db)
    return { valid: true, otpRecord: record }
  },

  // Contests
  getContests: async () => {
    if (await ensureMongoConnected()) {
      return await ContestModel.find({}).sort({ createdAt: -1 }).lean()
    }
    const db = readDb()
    return db.contests || []
  },

  getContestById: async (id) => {
    if (await ensureMongoConnected()) {
      const query = { $or: [{ id: id }] }
      if (mongoose.Types.ObjectId.isValid(id)) {
        query.$or.push({ _id: id })
      }
      return await ContestModel.findOne(query).lean()
    }
    const db = readDb()
    return (db.contests || []).find(c => c.id === id)
  },

  saveContest: async (contest) => {
    if (await ensureMongoConnected()) {
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
    if (await ensureMongoConnected()) {
      const query = { $or: [{ id: id }] }
      if (mongoose.Types.ObjectId.isValid(id)) {
        query.$or.push({ _id: id })
      }
      await ContestModel.deleteMany(query)
      return
    }
    const db = readDb()
    db.contests = (db.contests || []).filter(c => c.id !== id)
    writeDb(db)
  },

  // Submissions
  getSubmissions: async () => {
    if (await ensureMongoConnected()) {
      return await SubmissionModel.find({}).sort({ submittedAt: -1 }).lean()
    }
    const db = readDb()
    return db.submissions || []
  },

  getUserSubmissions: async (identifiers) => {
    const list = Array.isArray(identifiers) ? identifiers.filter(Boolean) : [identifiers].filter(Boolean)
    if (list.length === 0) return []

    if (await ensureMongoConnected()) {
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
    if (await ensureMongoConnected()) {
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
    if (await ensureMongoConnected()) {
      return await SubmissionModel.create(submission)
    }
    const db = readDb()
    if (!db.submissions) db.submissions = []
    db.submissions.unshift(submission)
    writeDb(db)
    return submission
  }
}
