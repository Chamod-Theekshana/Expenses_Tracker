
import ratelimit from '../config/upstash';


const rateLimiter = async (req:any, res:any, next:any) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const { success } = await ratelimit.limit(ip);

        if (!success) {
            return res.status(429).json({ message: "Too many requests, please try again later." });
        }

        next();
    }
    catch (error) {
        console.error("Rate limiting error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export default rateLimiter;