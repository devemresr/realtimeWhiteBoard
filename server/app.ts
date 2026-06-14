import express from 'express';
import credentials from './config/credantials';
import corsOptions from './config/corsOptions';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { handleSanitization } from 'middleware/handleSanitization.middleware';

const app = express();

app.use(credentials);
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(handleSanitization);
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
export default app;
