import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js'; 
import QRCode from 'qrcode';

interface Ticket {
    id: string;
    vatin: string;
    first_name: string;
    last_name: string;
    created_at: Date;
}

export const createTicketsTable = async (): Promise<void> => {
    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS tickets (
            id UUID PRIMARY KEY,
            vatin VARCHAR(20) NOT NULL,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `);
        console.log("Tickets table created successfully.");
    } catch (err) {
        console.error("Error creating tickets table", err);
    }
};

export const generateTicket = async (
    vatin: string,
    firstName: string,
    lastName: string
): Promise<{ ticketId: string; qrCodeBuffer: Buffer }> => {
    const existingTickets = await pool.query<Ticket>('SELECT * FROM tickets WHERE vatin = $1', [vatin]);

    console.log('Existing tickets for OIB:', existingTickets.rows.length);

    if (existingTickets.rows.length >= 3) {
        console.log('Max tickets reached for OIB:', vatin);
        throw new Error('A maximum of 3 tickets can be generated for the same OIB.');
    }

    const ticketId = uuidv4();
    const createdAt = new Date();

    try {
        await pool.query(
        'INSERT INTO tickets (id, vatin, first_name, last_name, created_at) VALUES ($1, $2, $3, $4, $5)',
        [ticketId, vatin, firstName, lastName, createdAt]
        );

        console.log('Ticket saved to database:', ticketId);
    } catch (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Error saving ticket to database');
    }

    const ticketUrl = `${process.env.AUTH0_BASE_URL}/ticket/${ticketId}`;
    const qrCodeBuffer = await QRCode.toBuffer(ticketUrl);

    return { ticketId, qrCodeBuffer };
};

createTicketsTable();

export default pool;
