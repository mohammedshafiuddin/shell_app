import { Router } from "express";
import userRouter from "./user/user.router";
import dashboardRouter from "./dashboard/dashboard.router";
import paymentsRouter from "./payments/payments.router";

const router = Router();

router.use('/users', userRouter);
router.use('/dashboard', dashboardRouter);
router.use('/payments', paymentsRouter);

const v1Router = router;

export default v1Router;