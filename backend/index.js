const express = require('express')
const cors = require('cors')
const axios = require('axios')
require('dotenv').config()
const storage = require('./storage')
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

// Initialize Firebase Admin SDK
// You must set FIREBASE_SERVICE_ACCOUNT in your .env as a base64 encoded JSON string
// or directly pass credentials if you prefer.
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'))
    initializeApp({
      credential: cert(serviceAccount)
    })
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT', err)
  }
} else {
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT not provided. Firebase Auth will fail.')
}

const app = express()

// CORS Restriction
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}))

app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/data')) {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url
  }
  next()
})
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return next()
  }
  express.json()(req, res, next)
})

// Middleware to verify Auth Token (Firebase or Admin JWT)
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  const token = authHeader.split(' ')[1]
  
  try {
    // Try Admin JWT first
    const decodedJwt = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')
    req.user = decodedJwt
    return next()
  } catch (jwtErr) {
    // Not a valid JWT, try Firebase
    if (!getApps().length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' })
    }
    try {
      const decodedFirebase = await getAuth().verifyIdToken(token)
      req.user = { id: decodedFirebase.uid, email: decodedFirebase.email, role: 'student' }
      return next()
    } catch (firebaseErr) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }
  }
}

// Middleware to ensure admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' })
  }
  next()
}

// Root & Health Check Route
app.get(['/', '/api', '/api/', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'CodeViit Express API Backend Server is running live!'
  })
})

const LANGUAGE_IDS = { c: 50, cpp: 54, java: 62, javascript: 63, python: 71, go: 60, rust: 73, typescript: 74, kotlin: 78, swift: 83, csharp: 51, php: 68, ruby: 72 }

// ---------------- AUTH ROUTES ----------------

// Verify Google Token & Sync User
app.post('/api/auth/google-login', async (req, res) => {
  const { token, name } = req.body
  if (!token) return res.status(400).json({ error: 'Token is required' })
  
  if (!getApps().length) return res.status(500).json({ error: 'Firebase Admin not initialized' })
  
  try {
    const decodedToken = await getAuth().verifyIdToken(token)
    const email = decodedToken.email.toLowerCase()
    
    let user = await storage.findUserByEmail(email)
    if (!user) {
      // First time login
      user = await storage.saveUser({
        id: decodedToken.uid,
        name: name || decodedToken.name || email.split('@')[0],
        email: email,
        role: 'student',
        isFirstTimeLogin: true
      })
    }
    
    res.json({ success: true, user })
  } catch (err) {
    res.status(401).json({ error: 'Invalid Google Token', details: err.message })
  }
})

// Update User Profile (Onboarding / Edits)
app.post('/api/user/profile', verifyToken, async (req, res) => {
  const { name, registrationNumber, branch, section, collegeName, profilePhotoUrl } = req.body
  
  let user = await storage.findUserByEmail(req.user.email)
  if (!user) return res.status(404).json({ error: 'User not found' })
  
  user = await storage.saveUser({
    ...user,
    ...(name ? { name } : {}),
    registrationNumber,
    branch,
    section,
    collegeName,
    profilePhotoUrl,
    isFirstTimeLogin: false
  })
  
  res.json({ success: true, user })
})

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
  const { email, password } = req.body

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@codeviit.edu.in'
  
  if (email === adminEmail) {
    // If ADMIN_PASSWORD env is set, use it. Otherwise fallback to the old default for demo purposes.
    const valid = process.env.ADMIN_PASSWORD ? password === process.env.ADMIN_PASSWORD : password === 'codeviit@1457'
    
    if (valid) {
      const adminUser = {
        id: 'admin_1',
        name: 'Platform Administrator',
        email: adminEmail,
        role: 'admin',
        createdAt: new Date().toISOString()
      }
      
      const token = jwt.sign(adminUser, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '24h' })
      
      await storage.saveUser(adminUser)
      return res.json({ success: true, user: adminUser, token })
    }
  }

  return res.status(401).json({ error: 'Invalid admin credentials.' })
})

// ---------------- CODE EXECUTION ROUTE ----------------
app.post('/api/execute', verifyToken, async (req, res) => {
  const { language, code, testCases } = req.body
  try {
    const judge0Headers = { 'Content-Type': 'application/json' }
    if (process.env.JUDGE0_API_KEY) {
       judge0Headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY
       judge0Headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'
    }

    const judge0Url = process.env.JUDGE0_URL || 'https://ce.judge0.com'

    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const submitRes = await axios.post(
          `${judge0Url}/submissions?base64_encoded=false&wait=true`,
          {
            source_code: code,
            language_id: LANGUAGE_IDS[language] || 71,
            stdin: testCase.input
          },
          { headers: judge0Headers }
        )
        const output = submitRes.data.stdout?.trim() || ''
        const expected = testCase.expectedOutput?.trim() || ''
        const compileOutput = submitRes.data.compile_output?.trim() || submitRes.data.message || ''
        const errorOutput = submitRes.data.stderr?.trim() || compileOutput
        const isHidden = testCase.isHidden === true
        const passed = output === expected
        const pts = testCase.points !== undefined ? Number(testCase.points) : Math.round(100 / testCases.length)
        
        return {
          input: isHidden ? "Hidden Test Case" : testCase.input,
          expectedOutput: isHidden ? "Hidden" : expected,
          actualOutput: isHidden && passed ? "Hidden" : output,
          passed,
          error: errorOutput || null,
          status: submitRes.data.status?.description || 'Unknown',
          points: pts,
          isHidden: isHidden
        }
      })
    )
    res.json({
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        totalPoints: results.reduce((sum, r) => sum + r.points, 0),
        earnedPoints: results.filter(r => r.passed).reduce((sum, r) => sum + r.points, 0)
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Execution failed', details: error.message })
  }
})

// AI test case generation route
app.post('/api/ai', verifyToken, requireAdmin, async (req, res) => {
  const { problem, code, count } = req.body

  const prompt = `You are a competitive programming assistant.

${problem ? `Problem Statement:\n${problem}` : ''}
${code ? `User's Code:\n${code}` : ''}

Generate exactly ${count || 5} diverse test cases for this problem.
Include simple cases, edge cases, and corner cases.

Respond ONLY in this exact JSON format with no extra text:
{
  "testCases": [
    {
      "input": "exact input here",
      "expectedOutput": "exact expected output here",
      "description": "what this case tests"
    }
  ]
}`

  try {
    const response = await axios.post(
      'https://api.puter.com/drivers/call',
      {
        interface: 'puter-chat-completion',
        driver: 'claude-sonnet-4-5',
        method: 'complete',
        args: {
          messages: [{ role: 'user', content: prompt }]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer anonymous'
        }
      }
    )

    const message = response.data?.result?.message?.content?.[0]?.text || ''
    const clean = message.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.json(parsed)
  } catch (error) {
    res.status(500).json({
      error: 'AI request failed',
      details: error.response?.data || error.message
    })
  }
})

// ---------------- CONTEST MANAGEMENT ROUTES ----------------

// Get all contests
app.get('/api/contests', verifyToken, async (req, res) => {
  const contests = await storage.getContests()
  res.json({ contests })
})

// Get contest by ID
app.get('/api/contests/:id', verifyToken, async (req, res) => {
  const contest = await storage.getContestById(req.params.id)
  if (!contest) {
    return res.status(404).json({ error: 'Contest not found' })
  }
  res.json({ contest })
})

// Admin: Create or update contest
app.post('/api/contests', verifyToken, requireAdmin, async (req, res) => {
  const { title, description, startTime, endTime, durationMinutes, questions } = req.body

  if (!title || !startTime || !endTime || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Title, startTime, endTime, and questions array are required.' })
  }

  const contest = {
    id: req.body.id || 'contest_' + Date.now(),
    title,
    description: description || '',
    startTime,
    endTime,
    durationMinutes: durationMinutes || 60,
    questions: questions.map((q, idx) => ({
      id: q.id || `q_${Date.now()}_${idx}`,
      title: q.title || `Problem ${idx + 1}`,
      description: q.description || '',
      inputFormat: q.inputFormat || '',
      outputFormat: q.outputFormat || '',
      constraints: q.constraints || '',
      sampleInput: q.sampleInput || '',
      sampleOutput: q.sampleOutput || '',
      starterCode: q.starterCode || {},
      testCases: q.testCases || []
    })),
    createdAt: req.body.createdAt || new Date().toISOString()
  }

  const saved = await storage.saveContest(contest)
  res.json({ success: true, contest: saved })
})

// Admin: Delete contest
app.delete('/api/contests/:id', verifyToken, requireAdmin, async (req, res) => {
  await storage.deleteContest(req.params.id)
  res.json({ success: true, message: 'Contest deleted successfully' })
})

// Admin: Publish/Unpublish contest results
app.put('/api/contests/:id/publish', verifyToken, requireAdmin, async (req, res) => {
  const { published } = req.body
  const updated = await storage.setContestPublished(req.params.id, !!published)
  res.json({ success: true, contest: updated })
})

// Student/Admin: Get Contest Leaderboard
app.get('/api/contests/:id/leaderboard', verifyToken, async (req, res) => {
  const contest = await storage.getContestById(req.params.id)
  if (!contest) return res.status(404).json({ error: 'Contest not found' })

  if (req.user.role !== 'admin' && !contest.resultsPublished) {
    return res.status(403).json({ error: 'Results are not published yet.' })
  }

  const leaderboard = await storage.getContestLeaderboard(req.params.id)
  res.json({ leaderboard })
})

// Student: Submit code for a contest problem
app.post('/api/contests/:id/submit', verifyToken, async (req, res) => {
  const { contestId, questionId, userId, userName, registrationNumber, email, language, code } = req.body

  const contest = await storage.getContestById(req.params.id)
  if (!contest) {
    return res.status(404).json({ error: 'Contest not found' })
  }

  const question = contest.questions.find(q => q.id === questionId)
  if (!question) {
    return res.status(404).json({ error: 'Question not found in this contest' })
  }

  const testCases = question.testCases || []

  try {
    let testResults = []
    let passedCount = 0

    const judge0Headers = { 'Content-Type': 'application/json' }
    if (process.env.JUDGE0_API_KEY) {
       judge0Headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY
       judge0Headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'
    }
    const judge0Url = process.env.JUDGE0_URL || 'https://ce.judge0.com'

    if (testCases.length > 0) {
      testResults = await Promise.all(
        testCases.map(async (tc) => {
          const submitRes = await axios.post(
            `${judge0Url}/submissions?base64_encoded=false&wait=true`,
            {
              source_code: code,
              language_id: LANGUAGE_IDS[language] || 71,
              stdin: tc.input
            },
            { headers: judge0Headers }
          )
          const output = submitRes.data.stdout?.trim() || ''
          const expected = tc.expectedOutput?.trim() || ''
          const compileOutput = submitRes.data.compile_output?.trim() || submitRes.data.message || ''
          const errorOutput = submitRes.data.stderr?.trim() || compileOutput
          const passed = output === expected
          if (passed) passedCount++

          const isHidden = tc.isHidden === true
          const pts = tc.points !== undefined ? Number(tc.points) : Math.round(100 / testCases.length)

          return {
            input: isHidden ? "Hidden Test Case" : tc.input,
            expectedOutput: isHidden ? "Hidden" : expected,
            actualOutput: isHidden && passed ? "Hidden" : output,
            passed,
            error: errorOutput || null,
            status: submitRes.data.status?.description || 'Unknown',
            points: pts,
            isHidden: isHidden
          }
        })
      )
    }

    const totalCount = testCases.length || 1
    const totalPossibleScore = testResults.reduce((sum, r) => sum + r.points, 0) || 100
    const earnedScore = testResults.filter(r => r.passed).reduce((sum, r) => sum + r.points, 0)
    const score = Math.round((earnedScore / totalPossibleScore) * 100)
    const status = passedCount === totalCount ? 'Accepted' : passedCount > 0 ? 'Partially Accepted' : 'Wrong Answer'

    const submission = await storage.saveSubmission({
      id: 'sub_' + Date.now(),
      contestId: contest.id,
      contestTitle: contest.title,
      questionId: question.id,
      questionTitle: question.title,
      userId: req.user.id || userId,
      userName: userName || req.user.name || 'Student',
      registrationNumber: registrationNumber || 'N/A',
      email: req.user.email || email || '',
      language,
      code,
      score,
      passedCount,
      totalCount,
      status,
      testResults,
      submittedAt: new Date().toISOString()
    })

    res.json({
      success: true,
      submission
    })
  } catch (error) {
    console.error('Submission execution error:', error)
    res.status(500).json({ error: 'Submission failed', details: error.message })
  }
})

// Get user stats for student dashboard
app.get('/api/user/stats', verifyToken, async (req, res) => {
  const { identifier, email, userId, registrationNumber } = req.query
  // Fallback to logged in user if no query params provided
  const queryList = [identifier, email, userId, registrationNumber, req.user.email, req.user.id].filter(Boolean)
  if (queryList.length === 0) {
    return res.status(400).json({ error: 'User identifier is required' })
  }

  const submissions = await storage.getUserSubmissions(queryList)

  const contestProblemScores = {}
  const contestScores = {}
  const attemptedContests = new Set()

  submissions.forEach(s => {
    if (s.contestId) {
      attemptedContests.add(s.contestId)
      const key = `${s.contestId}:::${s.questionId || 'q0'}`
      contestProblemScores[key] = Math.max(contestProblemScores[key] || 0, s.score || 0)
    }
  })

  Object.keys(contestProblemScores).forEach(key => {
    const parts = key.split(':::')
    const cId = parts[0]
    contestScores[cId] = (contestScores[cId] || 0) + contestProblemScores[key]
  })

  const totalPoints = Object.values(contestProblemScores).reduce((a, b) => a + b, 0)

  res.json({
    totalPoints,
    contestsAttemptedCount: attemptedContests.size,
    attemptedContestIds: Array.from(attemptedContests),
    contestScores,
    totalSubmissions: submissions.length,
    submissions
  })
})

// ---------------- ADMIN MONITORING ROUTES ----------------

// Get all users with stats (Admin view)
app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  const users = await storage.getUsersWithStats()
  res.json({ users })
})

// Delete user (Admin view)
app.delete('/api/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
  await storage.deleteUser(req.params.id)
  res.json({ success: true, message: 'User deleted successfully' })
})

// Get all contest submissions (Admin view)
app.get('/api/admin/submissions', verifyToken, requireAdmin, async (req, res) => {
  const submissions = await storage.getSubmissions()
  res.json({ submissions })
})

// ---------------- EXERCISE / PRACTICE ROUTES ----------------

// Get all exercises
app.get('/api/exercises', verifyToken, async (req, res) => {
  const exercises = await storage.getExercises()
  res.json({ exercises })
})

// Get exercise by ID
app.get('/api/exercises/:id', verifyToken, async (req, res) => {
  const exercise = await storage.getExerciseById(req.params.id)
  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' })
  }
  res.json({ exercise })
})

// Admin: Create or update exercise
app.post('/api/exercises', verifyToken, requireAdmin, async (req, res) => {
  const { title, description, difficulty, tags, inputFormat, outputFormat, constraints, starterCode, testCases } = req.body

  if (!title) {
    return res.status(400).json({ error: 'Title is required.' })
  }

  const exercise = {
    id: req.body.id || 'ex_' + Date.now(),
    title,
    description: description || '',
    difficulty: difficulty || 'Easy',
    tags: tags || [],
    inputFormat: inputFormat || '',
    outputFormat: outputFormat || '',
    constraints: constraints || '',
    starterCode: starterCode || {},
    testCases: testCases || [],
    createdAt: req.body.createdAt || new Date().toISOString()
  }

  const saved = await storage.saveExercise(exercise)
  res.json({ success: true, exercise: saved })
})

// Admin: Delete exercise
app.delete('/api/exercises/:id', verifyToken, requireAdmin, async (req, res) => {
  await storage.deleteExercise(req.params.id)
  res.json({ success: true, message: 'Exercise deleted successfully' })
})

// Student: Submit code for an exercise
app.post('/api/exercises/:id/submit', verifyToken, async (req, res) => {
  const { language, code } = req.body

  const exercise = await storage.getExerciseById(req.params.id)
  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' })
  }

  const testCases = exercise.testCases || []

  try {
    let testResults = []
    let passedCount = 0

    const judge0Headers = { 'Content-Type': 'application/json' }
    if (process.env.JUDGE0_API_KEY) {
       judge0Headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY
       judge0Headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'
    }
    const judge0Url = process.env.JUDGE0_URL || 'https://ce.judge0.com'

    if (testCases.length > 0) {
      testResults = await Promise.all(
        testCases.map(async (tc) => {
          const submitRes = await axios.post(
            `${judge0Url}/submissions?base64_encoded=false&wait=true`,
            {
              source_code: code,
              language_id: LANGUAGE_IDS[language] || 71,
              stdin: tc.input
            },
            { headers: judge0Headers }
          )
          const output = submitRes.data.stdout?.trim() || ''
          const expected = tc.expectedOutput?.trim() || ''
          const compileOutput = submitRes.data.compile_output?.trim() || submitRes.data.message || ''
          const errorOutput = submitRes.data.stderr?.trim() || compileOutput
          const passed = output === expected
          if (passed) passedCount++

          const isHidden = tc.isHidden === true

          return {
            input: isHidden ? "Hidden Test Case" : tc.input,
            expectedOutput: isHidden ? "Hidden" : expected,
            actualOutput: isHidden && passed ? "Hidden" : output,
            passed,
            error: errorOutput || null,
            status: submitRes.data.status?.description || 'Unknown'
          }
        })
      )
    }

    const totalCount = testCases.length || 1
    const score = Math.round((passedCount / totalCount) * 100)
    const status = passedCount === totalCount ? 'Accepted' : passedCount > 0 ? 'Partially Accepted' : 'Wrong Answer'

    // We can also save the exercise submission, but for now we just return the result
    res.json({
      success: true,
      submission: {
        score,
        passedCount,
        totalCount,
        status,
        testResults
      }
    })
  } catch (error) {
    console.error('Exercise execution error:', error)
    res.status(500).json({ error: 'Exercise submission failed', details: error.message })
  }
})

// ---------------- ADMIN SCRAPER ROUTE ----------------
app.post('/api/admin/scrape-leetcode', verifyToken, requireAdmin, async (req, res) => {
  const { url } = req.body
  if (!url || !url.includes('leetcode.com/problems/')) {
    return res.status(400).json({ error: 'Invalid LeetCode URL' })
  }

  const match = url.match(/problems\/([a-zA-Z0-9-]+)/)
  if (!match) {
    return res.status(400).json({ error: 'Could not extract problem slug' })
  }
  const titleSlug = match[1]

  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        content
        difficulty
        exampleTestcaseList
        codeSnippets {
          lang
          code
        }
      }
    }
  `

  try {
    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables: { titleSlug }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    })

    const data = response.data?.data?.question
    if (!data) {
      return res.status(404).json({ error: 'Problem not found on LeetCode' })
    }

    // Convert LeetCode HTML content to basic markdown for our UI
    let markdownContent = data.content || ''
    markdownContent = markdownContent
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<pre>(.*?)<\/pre>/gs, '```\n$1\n```')
      .replace(/<ul>/g, '\n')
      .replace(/<\/ul>/g, '\n')
      .replace(/<li>/g, '- ')
      .replace(/<\/li>/g, '\n')
      .replace(/<[^>]+>/g, '') // strip remaining tags

    res.json({
      success: true,
      data: {
        title: data.title,
        description: markdownContent.trim(),
        difficulty: data.difficulty,
        testCases: data.exampleTestcaseList?.map((tc, idx) => ({
          id: 'tc_' + Date.now() + '_' + idx,
          input: tc,
          expectedOutput: "Run code to determine output (LeetCode doesn't expose expected)",
          isHidden: false
        })) || []
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape LeetCode', details: error.message })
  }
})

const PORT = process.env.PORT || 5000
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

module.exports = (req, res) => {
  app(req, res)
}
