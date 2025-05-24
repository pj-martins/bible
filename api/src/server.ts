import express from 'express';
import { registerRoutes } from './router';
import 'dotenv/config';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

registerRoutes(app);

app.listen(3001, () => {
  console.log('Application started on port 3001!');
});