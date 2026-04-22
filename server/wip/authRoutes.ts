import login from '../controllers/login';
import register from '../controllers/register';
import express from 'express';

const router = express.Router();

router.post('/register', register);
router.post('/login', validateData, login);

export default router;
