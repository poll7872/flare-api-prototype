import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
   const token = req.headers['authorization']?.split(' ')[1]; // Quita el Bearer
   if (!token) return res.status(401).json({ message: 'No token provided' });

   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid token', error: err.message });
        req.user = decoded;
        next();
   });
}
