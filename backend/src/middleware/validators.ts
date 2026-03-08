import { Request, Response, NextFunction } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function requireJson(req: Request, res: Response, next: NextFunction) {
  if (
    (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') &&
    req.headers['content-type']?.includes('application/json')
  ) {
    if (req.body == null) {
      return res.status(400).json({ message: 'Request body is required' });
    }
  }
  return next();
}

export function validateNumericParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const val = (req.params as any)[paramName];
    if (!val || !/^\d+$/.test(String(val))) {
      return res.status(400).json({ message: `Invalid ${paramName}` });
    }
    next();
  };
}

export function validateTransactionBody(req: Request, res: Response, next: NextFunction) {
  const { title, amount, category, created_at, dateISO } = req.body ?? {};

  if (typeof title !== 'string' || title.trim().length < 1) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (title.trim().length > 200) {
    return res.status(400).json({ message: 'Title must be 200 characters or fewer' });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount)) {
    return res.status(400).json({ message: 'Amount must be a number' });
  }
  if (numAmount === 0) {
    return res.status(400).json({ message: 'Amount cannot be zero' });
  }
  if (Math.abs(numAmount) > 1_000_000_000) {
    return res.status(400).json({ message: 'Amount is too large' });
  }

  if (typeof category !== 'string' || category.trim().length < 1) {
    return res.status(400).json({ message: 'Category is required' });
  }

  // Accept dateISO or created_at as YYYY-MM-DD
  const rawDate = dateISO ?? created_at;
  if (rawDate !== undefined) {
    const s = String(rawDate);
    if (!DATE_REGEX.test(s)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
    }
    // Validate it's an actual calendar date
    const d = new Date(s);
    if (isNaN(d.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    (req.body as any).created_at = s;
  }

  // Normalize
  (req.body as any).title = title.trim();
  (req.body as any).category = category.trim();
  (req.body as any).amount = numAmount;

  next();
}

export function validateProfileUpdateBody(req: Request, res: Response, next: NextFunction) {
  const { name, profile_photo, theme, currency, date_format } = req.body ?? {};

  const allowedDateFormats = new Set(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ message: 'Name must be a non-empty string' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ message: 'Name must be 100 characters or fewer' });
    }
    (req.body as any).name = name.trim();
  }

  if (profile_photo !== undefined) {
    if (typeof profile_photo !== 'string' || profile_photo.trim().length < 1) {
      return res.status(400).json({ message: 'profile_photo must be a non-empty string' });
    }
    // Basic URL check
    try {
      new URL(profile_photo.trim());
    } catch {
      return res.status(400).json({ message: 'profile_photo must be a valid URL' });
    }
    (req.body as any).profile_photo = profile_photo.trim();
  }

  if (theme !== undefined) {
    if (theme !== 'dark' && theme !== 'light') {
      return res.status(400).json({ message: "theme must be either 'dark' or 'light'" });
    }
  }

  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.trim().length < 1) {
      return res.status(400).json({ message: 'currency must be a non-empty string' });
    }
    const cleaned = currency.trim().toUpperCase();
    if (cleaned.length < 3 || cleaned.length > 10) {
      return res.status(400).json({ message: 'currency must be between 3 and 10 characters' });
    }
    (req.body as any).currency = cleaned;
  }

  if (date_format !== undefined) {
    if (typeof date_format !== 'string' || !allowedDateFormats.has(date_format)) {
      return res.status(400).json({
        message: 'date_format must be one of: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD',
      });
    }
  }

  if (
    name === undefined &&
    profile_photo === undefined &&
    theme === undefined &&
    currency === undefined &&
    date_format === undefined
  ) {
    return res.status(400).json({
      message: 'At least one field (name, profile_photo, theme, currency, date_format) is required',
    });
  }

  next();
}

export function validateEmailBody(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body ?? {};
  if (!email || !EMAIL_REGEX.test(String(email))) {
    return res.status(400).json({ message: 'Valid email is required' });
  }
  (req.body as any).email = String(email).toLowerCase().trim();
  next();
}
