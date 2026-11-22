import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Authentication
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // Profile
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    profilePic: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },

    // Languages
    nativeLanguages: [
      {
        type: String,
        trim: true,
      },
    ],

    learningLanguages: [
      {
        type: String,
        trim: true,
      },
    ],

    // Interests
    interests: [
      {
        type: String,
        trim: true,
      },
    ],

    // Location
    country: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    timezone: {
      type: String,
      default: "",
    },

    // Account status
    isVerified: {
      type: Boolean,
      default: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;