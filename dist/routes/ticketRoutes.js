import express from 'express';
import { generateTicket } from '../models/ticketModel.js';
import pool from '../config/db.js';
import QRCode from 'qrcode';
const router = express.Router();
const requireAuth = (req, res, next) => {
    console.log('User Authenticated:', req.oidc?.isAuthenticated());
    if (!req.oidc?.isAuthenticated()) {
        console.log('User is not authenticated, redirecting to login.');
        return res.oidc.login();
    }
    console.log('User is authenticated, proceeding to render ticket.');
    next();
};
async function generateQRCode(url) {
    return await QRCode.toBuffer(url);
}
router.post('/generate-ticket', async (req, res) => {
    const { vatin, first_name, last_name } = req.body;
    if (!vatin || !first_name || !last_name) {
        return res.status(400).json({ error: 'Missing required fields: vatin, first_name, last_name' });
    }
    try {
        const { ticketId } = await generateTicket(vatin, first_name, last_name);
        const ticketUrl = `${process.env.BASE_URL}/ticket/${ticketId}`;
        const qrCodeBuffer = await generateQRCode(ticketUrl);
        res.set('Content-Type', 'image/png');
        res.send(qrCodeBuffer);
    }
    catch (error) {
        if (error.message.includes('maximum of 3 tickets')) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/ticket-count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM tickets');
        res.json({ count: parseInt(result.rows[0].count, 10) });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/ticket/:ticketId', requireAuth, async (req, res) => {
    console.log(`Request received for ticket ID: ${req.params.ticketId}`);
    const { ticketId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        const ticket = result.rows[0];
        console.log('Rendering HTML for ticket details');
        res.setHeader('Content-Type', 'text/html');
        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Details</title>
            <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { max-width: 600px; margin: auto; }
            h1 { color: #333; }
            p { font-size: 1.2em; }
            .logout-btn { background-color: #f44336; color: white; border: none; padding: 10px 20px; cursor: pointer; }
            .logout-btn:hover { background-color: #d32f2f; }
            </style>
        </head>
        <body>
            <div class="container">
            <h1>Ticket Details</h1>
            <p><strong>First Name:</strong> ${ticket.first_name}</p>
            <p><strong>Last Name:</strong> ${ticket.last_name}</p>
            <p><strong>VATIN:</strong> ${ticket.vatin}</p>
            <p><strong>Created At:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
            
            <!-- Logout Button -->
            <form action="/auth/logout" method="GET">
                <button type="submit" class="logout-btn">Logout</button>
            </form>
            </div>
        </body>
        </html>
    `);
    }
    catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
