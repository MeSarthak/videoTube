import mongoose, {Schema} from 'mongoose';

const TweetSchema = new Schema({
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        required: true
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    likedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

export const Tweet = mongoose.model('Tweet', TweetSchema);