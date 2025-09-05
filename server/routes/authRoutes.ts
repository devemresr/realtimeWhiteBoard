import login from '../controllers/login';
import register from '../controllers/register';
import verifyJWT from '../middleware/verifyJWT';
import refreshAccessToken from '../middleware/refreshAccessToken';
import protectedd from '../controllers/protectedd';
import express from 'express';
import validateData from '../middleware/validateData';

const router = express.Router();

router.post('/register', register);
router.post('/login', validateData, login);
router.get('/protectedRoute', verifyJWT, refreshAccessToken, protectedd);

export default router;
