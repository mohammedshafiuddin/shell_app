import { Router } from "express";
import { signup, login, getUserById, updateUser, hasPushToken, addPushToken, sendOtp, loginOtp, googleAuth } from "./user.controller";
import { verifyToken } from "../middleware/auth";
import uploadHandler from '../lib/upload-handler';

const router = Router();

// User routes
router.post("/signup", uploadHandler.single('profilePic'), signup);
router.post("/login", login);
router.post("/google-auth", googleAuth);
router.get("/user/:userId", verifyToken, getUserById);
router.put("/:userId", verifyToken, uploadHandler.single('profilePic'), updateUser);
router.get('/has-push-token', hasPushToken);
router.post('/push-token', addPushToken)
router.post('/login-otp', loginOtp)
router.get('/send-otp/:phone', sendOtp)


export default router;