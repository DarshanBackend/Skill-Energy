import mongoose from 'mongoose';

const userPreferencesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        required: true
    },
    height: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['FT', 'CM'],
            required: true
        }
    },
    weight: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['LB', 'KG'],
            required: true
        }
    },
    goalWeight: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['LB', 'KG'],
            required: true
        }
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    age: {
        type: Number,
        required: true,
        min: 13,
        max: 100
    },
    danceStyle: {
        type: String,
        enum: [
            'Try All Style',
            'Dance Fitness',
            'Boxing',
            'Jazz',
            'Afro',
            'Latin',
            'Belly Dance',
            'Hip Hop'
        ],
        required: true
    },
    musicStyle: {
        type: String,
        enum: [
            'Electronic',
            'Pop',
            'Latin',
            'Country',
            'K-Pop',
            'Non Preference'
        ],
        required: true
    },
    physicalActivity: {
        type: String,
        enum: [
            'Not Much',
            '1-2 per week',
            '3-5 per week',
            '5-7 per week'
        ],
        required: true
    }
}, {
    timestamps: true
});

// Create index for faster queries
userPreferencesSchema.index({ userId: 1 });

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

export default UserPreferences; 