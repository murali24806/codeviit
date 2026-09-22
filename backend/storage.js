const mongoose = require('mongoose')
require('dotenv').config()

// ---------------- MONGODB SCHEMAS ----------------
const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  registrationNumber: { type: String },
  branch: { type: String },
  section: { type: String },
  collegeName: { type: String },
  profilePhotoUrl: { type: String },
  isFirstTimeLogin: { type: Boolean, default: true },
  email: { type: String, required: true },
  role: { type: String, default: 'student' },
  createdAt: { type: String, default: () => new Date().toISOString() }
})

const contestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationMinutes: { type: Number, default: 60 },
  questions: { type: Array, default: [] },
  resultsPublished: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
})

const exerciseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  difficulty: { type: String, default: 'Easy' },
  tags: { type: Array, default: [] },
  inputFormat: { type: String },
  outputFormat: { type: String },
  constraints: { type: String },
  starterCode: { type: Object, default: {} },
  testCases: { type: Array, default: [] },
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
const ContestModel = mongoose.models.Contest || mongoose.model('Contest', contestSchema)
const ExerciseModel = mongoose.models.Exercise || mongoose.model('Exercise', exerciseSchema)
const SubmissionModel = mongoose.models.Submission || mongoose.model('Submission', submissionSchema)

let mongoPromise = null

async function ensureMongoConnected() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required for production safety.')
  }

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
        throw err
      })
  }

  try {
    await mongoPromise
    return mongoose.connection.readyState === 1
  } catch (err) {
    mongoPromise = null
    throw err
  }
}

// ---------------- STORAGE API EXPORTS ----------------
module.exports = {
  // Users
  getUsers: async () => {
    await ensureMongoConnected()
    return await UserModel.find({}).lean()
  },

  findUserByEmail: async (email) => {
    if (!email) return null
    await ensureMongoConnected()
    const clean = email.trim().toLowerCase()
    return await UserModel.findOne({ email: new RegExp(`^${clean}$`, 'i') }).lean()
  },

  saveUser: async (user) => {
    await ensureMongoConnected()
    const cleanEmail = user.email ? user.email.trim().toLowerCase() : ''
    const userToSave = {
      ...user,
      email: cleanEmail
    }

    const emailRegex = new RegExp(`^${cleanEmail}$`, 'i')
    let existing = await UserModel.findOne({ $or: [{ id: user.id }, { email: emailRegex }] })
    if (existing) {
      existing.name = userToSave.name || existing.name
      existing.registrationNumber = userToSave.registrationNumber || existing.registrationNumber
      existing.branch = userToSave.branch || existing.branch
      existing.section = userToSave.section || existing.section
      existing.collegeName = userToSave.collegeName || existing.collegeName
      existing.profilePhotoUrl = userToSave.profilePhotoUrl || existing.profilePhotoUrl
      if (userToSave.isFirstTimeLogin !== undefined) existing.isFirstTimeLogin = userToSave.isFirstTimeLogin
      existing.email = cleanEmail || existing.email
      existing.role = userToSave.role || existing.role || 'student'
      await existing.save()
      return existing.toObject()
    } else {
      const created = await UserModel.create(userToSave)
      return created.toObject()
    }
  },

  deleteUser: async (id) => {
    await ensureMongoConnected()
    const query = { $or: [{ id: id }] }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id })
    }
    await UserModel.deleteMany(query)
  },

  // Contests
  getContests: async () => {
    await ensureMongoConnected()
    return await ContestModel.find({}).sort({ createdAt: -1 }).lean()
  },

  getContestById: async (id) => {
    await ensureMongoConnected()
    const query = { $or: [{ id: id }] }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id })
    }
    return await ContestModel.findOne(query).lean()
  },

  saveContest: async (contest) => {
    await ensureMongoConnected()
    return await ContestModel.findOneAndUpdate(
      { id: contest.id },
      contest,
      { upsert: true, new: true }
    ).lean()
  },

  deleteContest: async (id) => {
    await ensureMongoConnected()
    const query = { $or: [{ id: id }] }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id })
    }
    await ContestModel.deleteMany(query)
  },

  setContestPublished: async (id, published) => {
    await ensureMongoConnected()
    const query = { $or: [{ id: id }] }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id })
    }
    return await ContestModel.findOneAndUpdate(
      query,
      { $set: { resultsPublished: published } },
      { new: true }
    ).lean()
  },

  getContestLeaderboard: async (contestId) => {
    await ensureMongoConnected()
    const submissions = await SubmissionModel.find({ contestId }).lean()
    
    // Aggregate max score per question per user
    const userScores = {} // { userId: { totalScore: 0, userName: '', lastSubmit: '', questions: { qId: maxScore } } }
    
    submissions.forEach(sub => {
      if (!userScores[sub.userId]) {
        userScores[sub.userId] = {
          userId: sub.userId,
          userName: sub.userName || 'Student',
          registrationNumber: sub.registrationNumber || 'N/A',
          totalScore: 0,
          questions: {},
          lastSubmitTime: new Date(sub.submittedAt).getTime()
        }
      }
      
      const userRec = userScores[sub.userId]
      const currentQScore = userRec.questions[sub.questionId] || 0
      
      if (sub.score > currentQScore) {
        userRec.questions[sub.questionId] = sub.score
        // Update last submit time to this better submission
        userRec.lastSubmitTime = new Date(sub.submittedAt).getTime()
      } else if (sub.score === currentQScore && new Date(sub.submittedAt).getTime() < userRec.lastSubmitTime) {
        // If tied on max score, take the earlier one
        userRec.lastSubmitTime = new Date(sub.submittedAt).getTime()
      }
    })
    
    const leaderboard = Object.values(userScores).map(userRec => {
      const total = Object.values(userRec.questions).reduce((a, b) => a + b, 0)
      return {
        ...userRec,
        totalScore: total
      }
    })
    
    // Sort by totalScore DESC, then by lastSubmitTime ASC
    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      return a.lastSubmitTime - b.lastSubmitTime
    })
    
    // Add rank
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1
    })
    
    return leaderboard
  },

  // Exercises
  getExercises: async () => {
    await ensureMongoConnected()
    return await ExerciseModel.find({}).sort({ createdAt: -1 }).lean()
  },

  getExerciseById: async (id) => {
    await ensureMongoConnected()
    const query = { $or: [{ id: id }] }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id })
    }
    return await ExerciseModel.findOne(query).lean()
  },

  saveExercise: async (exercise) => {
    await ensureMongoConnected()
    return await ExerciseModel.findOneAndUpdate(
      { id: exercise.id },
      exercise,
      { upsert: true, new: true }
    ).lean()
  },

  deleteExercise: async (id) => {
    await ensureMongoConnected()
    const query = { $or: [{ id: id }] }
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id })
    }
    await ExerciseModel.deleteMany(query)
  },

  // Submissions
  getSubmissions: async () => {
    await ensureMongoConnected()
    return await SubmissionModel.find({}).sort({ submittedAt: -1 }).lean()
  },

  getUserSubmissions: async (identifiers) => {
    await ensureMongoConnected()
    const list = Array.isArray(identifiers) ? identifiers.filter(Boolean) : [identifiers].filter(Boolean)
    if (list.length === 0) return []

    const orConditions = list.flatMap(id => [
      { userId: id },
      { email: new RegExp(`^${id}$`, 'i') },
      { registrationNumber: new RegExp(`^${id}$`, 'i') }
    ])
    return await SubmissionModel.find({ $or: orConditions }).sort({ submittedAt: -1 }).lean()
  },

  getUsersWithStats: async () => {
    await ensureMongoConnected()
    const users = await UserModel.find({}).lean()
    const submissions = await SubmissionModel.find({}).lean()

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
    await ensureMongoConnected()
    return await SubmissionModel.create(submission)
  }
}
