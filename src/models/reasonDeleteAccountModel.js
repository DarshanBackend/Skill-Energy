import mongoose from "mongoose";

const reasonDeleteAccountSchema = mongoose.Schema({
  reasonCancel: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'register',
    required: true
  }
});

export default mongoose.model("ReasonDeleteAccount", reasonDeleteAccountSchema);