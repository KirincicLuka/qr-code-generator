import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv'; 
import { createTicketsTable } from './models/ticketModel.js';
import ticketRoutes from './routes/ticketRoutes.js';
import authRoutes from './routes/auth.js';
import cors from 'cors';
import pool from './config/db.js';
import { auth } from 'express-openid-connect';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: process.env.AUTH0_BASE_URL || '',
    clientID: process.env.AUTH0_CLIENT_ID || '',
    issuerBaseURL: process.env.AUTH0_DOMAIN || '',
    secret: process.env.AUTH0_CLIENT_SECRET || ''
};

app.use(auth(config));

app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true,
}));

const getTotalTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM tickets');
        (req as any).totalTickets = parseInt(result.rows[0].count); 
        next();
    } catch (error) {
        console.error('Error fetching total ticket count:', error);
        (req as any).totalTickets = 0; 
        next();
    }
  };
  

app.get('/', getTotalTickets, (req: Request, res: Response) => {
    const user = req.oidc?.user;
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code Ticket Generator API</title>
        </head>
        <body>
        <h1>Welcome to QR Code Ticket Generator API</h1>
        <h3><strong>Total Tickets Generated:</strong> ${(req as any).totalTickets}</h3>
        </body>
        </html>
    `);
});

app.use('/api', ticketRoutes);
app.use('/auth', authRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error occurred:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

createTicketsTable().then(() => {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch((err: Error) => {
    console.error('Error during table creation:', err);
});