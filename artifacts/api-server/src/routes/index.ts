// @ts-nocheck
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import announcementsRouter from "./announcements";
import commentsRouter from "./comments";
import likesRouter from "./likes";
import feedRouter from "./feed";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(announcementsRouter);
router.use(commentsRouter);
router.use(likesRouter);
router.use(feedRouter);
router.use(adminRouter);

export default router;
