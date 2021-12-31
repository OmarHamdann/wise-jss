const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaperSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  abstract: {
    type: String,
    required: true,
  },
  authors_id: {
    type: [],
    required: true,
  },
  authors_names: {
    type: [],
  },
  // 1 or 2 or 3  for different journal
  journal_id: {
    type: Number,
    required: true,
  },
  reviewers_id: {
    type: [],
  },
  judges_id: {
    type: [],
  },
  editor_id: {
    type: String,
  },
  reviewResult: {
    type: [],
  },
  evaluationResult: {
    type: [],
  },
  file_path: {
    type: String,
    required: true,
  },
  file_type: {
    type: String,
    required: true,
  },
  file_originalname: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'pending',
  },
  hiddenStatus: {
    type: String,
    default: 'newSubmission',
  },
  editable: {
    type: Boolean,
    default: false,
  },
  rejectCount: {
    type: Number,
    default: 0,
  },
  accepted: {
    type: Boolean,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now(),
  },
  dateAccepted: {
    type: Date,
  },
  dateWithdrawn: {
    type: Date,
  },
  dateRejected: {
    type: Date,
  },
});

module.exports.Papers = mongoose.model('papers', PaperSchema);
