import {Router} from 'express';
import { registerUser, changePassword, loginUser, logoutUser, refreshAccessToken, updateAccountDetails, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory} from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/register').post(upload.fields([
    {name: 'avatar', maxCount: 1},
    {name: 'coverImage', maxCount: 1}
]) ,registerUser);

router.route('/login').post(loginUser);
//secure route
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/changePassword').post(verifyJWT, changePassword);
router.route('/updateAccountDetails').patch(verifyJWT, updateAccountDetails);
router.route('/updateAvatar').patch(verifyJWT, upload.single('avatar'), updateAvatar);
router.route('/updateCoverImage').patch(verifyJWT, upload.single('coverImage'), updateCoverImage);
router.route('/channel/:username').get(getUserChannelProfile);
router.route('/watch-history').get(verifyJWT, getWatchHistory);
export {router};