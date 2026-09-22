require('dotenv').config()
const mongoose = require('mongoose')

const ContestSchema = new mongoose.Schema({}, { strict: false })
const ContestModel = mongoose.models.Contest || mongoose.model('Contest', ContestSchema)

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  const contests = await ContestModel.find({}).lean()
  console.log(contests.map(c => c.id))
  process.exit(0)
}
run()
