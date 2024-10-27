import express from 'express';
import jwt from 'jsonwebtoken';
const router = express.Router();
const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
    clientID: process.env.AUTH0_CLIENT_ID || '',
    issuerBaseURL: process.env.AUTH0_DOMAIN || '',
    secret: process.env.AUTH0_CLIENT_SECRET || '',
};
router.get('/callback', (req, res) => {
    res.redirect('/');
});
router.get('/login', (req, res) => {
    if (!req.oidc?.isAuthenticated()) {
        console.log('User is not authenticated, redirecting to login.');
        res.oidc.login();
    }
    else {
        const user = req.oidc.user;
        const userId = user?.sub;
        const userName = user?.name;
        const userEmail = user?.email;
        if (userId && userName && userEmail) {
            console.log('User is authenticated:', user);
            const token = jwt.sign({ id: userId, name: userName, email: userEmail }, process.env.JWT_SECRET || '', { expiresIn: '30d' });
            res.json({ token });
        }
        else {
            console.error('User data is incomplete:', user);
            res.status(500).json({ error: 'User data is incomplete' });
        }
    }
});
router.get('/logout', (req, res) => {
    if (res.oidc && typeof res.oidc.logout === 'function') {
        res.oidc.logout();
    }
    else {
        res.redirect('/');
    }
});
export default router;
