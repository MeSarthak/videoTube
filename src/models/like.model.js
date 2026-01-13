import mongoose, {Schema} from 'mongoose';

const LikeSchema = new Schema({
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
    tweet: {
        type: Schema.Types.ObjectId,
        ref: 'Tweet',
        required: true
    }
}, { timestamps: true });

export const Like = mongoose.model('Like', LikeSchema);