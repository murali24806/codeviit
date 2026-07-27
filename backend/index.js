const express = require('express')
const cors = require('cors')
const axios = require('axios')
require('dotenv').config()
const storage = require('./storage')

const app = express()
app.use(cors())
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

// Root & Health Check Route
app.get(['/', '/api', '/api/', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'CodeViit Express API Backend Server is running live!',
    timestamp: new Date().toISOString()
  })
})

const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  java: 62,
  javascript: 63,
  python: 71,
  go: 60,
  rust: 73,
  typescript: 74,
  kotlin: 78,
  swift: 83,
  csharp: 51,
  php: 68,
  ruby: 72
}

// Brevo API OTP Sender Helper
async function sendBrevoOtpEmail(email, name, otpCode) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.log(`\n======================================================`)
    console.log(`[DEV MODE] Brevo API Key missing (BREVO_API_KEY env).`)
    console.log(`OTP Code for ${email} (${name}): >>> ${otpCode} <<<`)
    console.log(`======================================================\n`)
    return { devMode: true, otpCode }
  }

  let activeSenderEmail = process.env.BREVO_SENDER_EMAIL || 'muralipatnala2486@gmail.com'

  // Dynamic Brevo Account Sender Verification
  try {
    const sendersRes = await axios.get('https://api.brevo.com/v3/senders', {
      headers: { 'api-key': apiKey }
    })
    const senders = sendersRes.data?.senders || []
    if (senders.length > 0) {
      const match = senders.find(s => s.email?.toLowerCase() === activeSenderEmail.toLowerCase())
      if (!match) {
        // Fallback to the first active/verified sender registered in this Brevo account
        activeSenderEmail = senders[0].email
      }
    }
  } catch (e) {
    // Ignore lookup errors, fallback to configured
  }

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: 'CodeViit Platform',
          email: activeSenderEmail
        },
        to: [{ email, name: name || 'Student' }],
        subject: `${otpCode} is your CodeViit Verification Code`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">CodeViit</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Competitive Programming & Contest Arena</p>
            </div>
            <p style="font-size: 16px; color: #1e293b;">Hello <strong>${name || 'Student'}</strong>,</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.5;">Your one-time email verification code to access the CodeViit contest platform is:</p>
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 20px; text-align: center; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #ffffff; margin: 24px 0;">
              ${otpCode}
            </div>
            <p style="font-size: 14px; color: #64748b;">This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">CodeViit Platform &copy; ${new Date().getFullYear()}</p>
          </div>
        `
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Brevo API Error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.message || 'Failed to send OTP via Brevo API')
  }
}

// ---------------- AUTH ROUTES ----------------

// Request OTP (Student Auth)
app.post('/api/auth/send-otp', async (req, res) => {
  const { name, registrationNumber, email } = req.body

  if (!email || !name || !registrationNumber) {
    return res.status(400).json({ error: 'Name, Registration Number, and Email are required.' })
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name.trim()
  const cleanRegNo = registrationNumber.trim()

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 mins

  await storage.saveOtp({
    email: cleanEmail,
    name: cleanName,
    registrationNumber: cleanRegNo,
    code: otpCode,
    expiresAt
  })

  try {
    const result = await sendBrevoOtpEmail(cleanEmail, cleanName, otpCode)
    res.json({
      success: true,
      message: result.devMode
        ? `[DEV MODE] OTP sent! Check server console or enter: ${otpCode}`
        : `Verification code sent to ${cleanEmail}`,
      devMode: !!result.devMode,
      otpCode: result.devMode ? otpCode : undefined
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Verify OTP (Student Auth)
app.post('/api/auth/verify-otp', async (req, res) => {
  const { name, registrationNumber, email, code } = req.body

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and OTP code are required.' })
  }

  const cleanEmail = email.trim().toLowerCase()
  const cleanCode = code.trim()

  const verification = await storage.verifyOtp(cleanEmail, cleanCode)
  if (!verification.valid) {
    return res.status(400).json({ error: verification.message })
  }

  const existingUser = await storage.findUserByEmail(cleanEmail)
  const userId = existingUser?.id || ('user_' + Date.now())

  const finalName = (name && name.trim()) || existingUser?.name || verification.otpRecord?.name || cleanEmail.split('@')[0]
  const finalRegNo = (registrationNumber && registrationNumber.trim()) || existingUser?.registrationNumber || verification.otpRecord?.registrationNumber || 'N/A'

  const user = await storage.saveUser({
    id: userId,
    name: finalName,
    registrationNumber: finalRegNo,
    email: cleanEmail,
    role: 'student',
    createdAt: existingUser?.createdAt || new Date().toISOString()
  })

  res.json({
    success: true,
    user
  })
})

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
  const { email, password } = req.body

  if (email === 'admin@codeviit.edu.in' && password === 'codeviit@1457') {
    const adminUser = {
      id: 'admin_1',
      name: 'Platform Administrator',
      registrationNumber: 'ADMIN001',
      email: 'admin@codeviit.edu.in',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
    await storage.saveUser(adminUser)
    return res.json({ success: true, user: adminUser })
  }

  return res.status(401).json({ error: 'Invalid admin credentials.' })
})

// ---------------- CODE EXECUTION ROUTE ----------------
app.post('/api/execute', async (req, res) => {
  const { language, code, testCases } = req.body
  try {
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const submitRes = await axios.post(
          'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
          {
            source_code: code,
            language_id: LANGUAGE_IDS[language] || 71,
            stdin: testCase.input
          },
          { headers: { 'Content-Type': 'application/json' } }
        )
        const output = submitRes.data.stdout?.trim() || ''
        const expected = testCase.expectedOutput?.trim() || ''
        return {
          input: testCase.input,
          expectedOutput: expected,
          actualOutput: output,
          passed: output === expected,
          error: submitRes.data.stderr || null,
          status: submitRes.data.status?.description || 'Unknown'
        }
      })
    )
    res.json({
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
      }
    })
  } catch (error) {
    res.status(500).json({ error: 'Execution failed', details: error.message })
  }
})

// AI test case generation route
app.post('/api/ai', async (req, res) => {
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
app.get('/api/contests', async (req, res) => {
  const contests = await storage.getContests()
  res.json({ contests })
})

// Get contest by ID
app.get('/api/contests/:id', async (req, res) => {
  const contest = await storage.getContestById(req.params.id)
  if (!contest) {
    return res.status(404).json({ error: 'Contest not found' })
  }
  res.json({ contest })
})

// Admin: Create or update contest
app.post('/api/contests', async (req, res) => {
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
app.delete('/api/contests/:id', async (req, res) => {
  await storage.deleteContest(req.params.id)
  res.json({ success: true, message: 'Contest deleted successfully' })
})

// Student: Submit code for a contest problem
app.post('/api/contests/:id/submit', async (req, res) => {
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

    if (testCases.length > 0) {
      testResults = await Promise.all(
        testCases.map(async (tc) => {
          const submitRes = await axios.post(
            'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
            {
              source_code: code,
              language_id: LANGUAGE_IDS[language] || 71,
              stdin: tc.input
            },
            { headers: { 'Content-Type': 'application/json' } }
          )
          const output = submitRes.data.stdout?.trim() || ''
          const expected = tc.expectedOutput?.trim() || ''
          const passed = output === expected
          if (passed) passedCount++

          return {
            input: tc.input,
            expectedOutput: expected,
            actualOutput: output,
            passed,
            error: submitRes.data.stderr || null,
            status: submitRes.data.status?.description || 'Unknown'
          }
        })
      )
    }

    const totalCount = testCases.length || 1
    const score = Math.round((passedCount / totalCount) * 100)
    const status = passedCount === totalCount ? 'Accepted' : passedCount > 0 ? 'Partially Accepted' : 'Wrong Answer'

    const submission = await storage.saveSubmission({
      id: 'sub_' + Date.now(),
      contestId: contest.id,
      contestTitle: contest.title,
      questionId: question.id,
      questionTitle: question.title,
      userId: userId || 'anonymous',
      userName: userName || 'Student',
      registrationNumber: registrationNumber || 'N/A',
      email: email || '',
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

// Get user stats for student dashboard (total points, contest scores, attempted status)
app.get('/api/user/stats', async (req, res) => {
  const { identifier, email, userId, registrationNumber } = req.query
  const queryList = [identifier, email, userId, registrationNumber].filter(Boolean)
  if (queryList.length === 0) {
    return res.status(400).json({ error: 'User identifier, email or userId is required' })
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
app.get('/api/admin/users', async (req, res) => {
  const users = await storage.getUsersWithStats()
  res.json({ users })
})

// Get all contest submissions (Admin view)
app.get('/api/admin/submissions', async (req, res) => {
  const submissions = await storage.getSubmissions()
  res.json({ submissions })
})

async function syncBrevoSenderName() {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'muralipatnala2486@gmail.com'
  const targetName = process.env.BREVO_SENDER_NAME || 'CodeViit Platform'

  if (!apiKey) return

  try {
    const listRes = await axios.get('https://api.brevo.com/v3/senders', {
      headers: { 'api-key': apiKey }
    })
    const senders = listRes.data?.senders || []
    const match = senders.find(s => s.email?.toLowerCase() === senderEmail.toLowerCase())
    if (match && match.name !== targetName) {
      console.log(`[Brevo Sync] Updating Brevo account sender name from "${match.name}" to "${targetName}"...`)
      await axios.put(`https://api.brevo.com/v3/senders/${match.id}`, 
        { name: targetName },
        { headers: { 'api-key': apiKey, 'Content-Type': 'application/json' } }
      )
      console.log(`[Brevo Sync] ✅ Brevo account sender name updated to "${targetName}" successfully!`)
    } else if (match) {
      console.log(`[Brevo Sync] ✅ Brevo sender "${senderEmail}" is already named "${match.name}".`)
    }
  } catch (err) {
    console.log(`[Brevo Sync] Note: ${err.response?.data?.message || err.message}`)
  }
}

const PORT = process.env.PORT || 5000
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    syncBrevoSenderName()
  })
}

module.exports = (req, res) => {
  app(req, res)
}
