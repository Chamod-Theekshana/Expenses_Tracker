import { Request, Response, NextFunction } from 'express';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TAG_REGEX = /^[a-z0-9][a-z0-9_-]{0,29}$/i;

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
  const { title, amount, category, created_at, dateISO, splits, notes, tags } = req.body ?? {};

  if (typeof title !== 'string' || title.trim().length < 1) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (title.trim().length > 200) {
    return res.status(400).json({ message: 'Title must be 200 characters or fewer' });
  }

  let normalizedNotes: string | undefined;
  if (notes !== undefined) {
    if (notes !== null && typeof notes !== 'string') {
      return res.status(400).json({ message: 'notes must be a string' });
    }
    const cleanedNotes = notes === null ? '' : notes.trim();
    if (cleanedNotes.length > 2000) {
      return res.status(400).json({ message: 'notes must be 2000 characters or fewer' });
    }
    normalizedNotes = cleanedNotes;
  }

  let normalizedTags: string[] | undefined;
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: 'tags must be an array of strings' });
    }
    if (tags.length > 20) {
      return res.status(400).json({ message: 'A maximum of 20 tags is allowed' });
    }

    const seenTags = new Set<string>();
    const parsedTags: string[] = [];

    for (let i = 0; i < tags.length; i++) {
      const rawTag = tags[i];
      if (typeof rawTag !== 'string') {
        return res.status(400).json({ message: `Tag #${i + 1} must be a string` });
      }

      const cleanTag = rawTag.trim().replace(/^#+/, '').toLowerCase();
      if (!cleanTag) {
        return res.status(400).json({ message: `Tag #${i + 1} is empty` });
      }
      if (!TAG_REGEX.test(cleanTag)) {
        return res.status(400).json({
          message: `Tag #${i + 1} is invalid (use letters, numbers, _ or -; max 30 chars)`,
        });
      }

      if (!seenTags.has(cleanTag)) {
        seenTags.add(cleanTag);
        parsedTags.push(cleanTag);
      }
    }

    normalizedTags = parsedTags;
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

  let normalizedCategory = typeof category === 'string' ? category.trim() : '';
  let normalizedSplits: Array<{ category: string; amount: number; percentage: number }> | undefined;

  if (splits !== undefined) {
    if (!Array.isArray(splits)) {
      return res.status(400).json({ message: 'splits must be an array' });
    }

    if (splits.length === 1) {
      return res.status(400).json({ message: 'Split transactions require at least 2 categories' });
    }

    if (splits.length > 0 && numAmount >= 0) {
      return res.status(400).json({ message: 'Splits are supported for expense transactions only' });
    }

    if (splits.length === 0) {
      normalizedSplits = [];
    } else {
      const absTotal = Math.abs(numAmount);
      let sumAmounts = 0;
      const seenCategories = new Set<string>();
      const parsed: Array<{ category: string; amount: number }> = [];

      for (let i = 0; i < splits.length; i++) {
        const row = (splits[i] ?? {}) as any;
        const splitCategory = typeof row.category === 'string' ? row.category.trim() : '';
        if (!splitCategory) {
          return res.status(400).json({ message: `Split #${i + 1}: category is required` });
        }
        if (splitCategory.length > 255) {
          return res.status(400).json({ message: `Split #${i + 1}: category is too long` });
        }

        const categoryKey = splitCategory.toLowerCase();
        if (seenCategories.has(categoryKey)) {
          return res.status(400).json({ message: 'Split categories must be unique' });
        }
        seenCategories.add(categoryKey);

        const splitAmount = Number(row.amount);
        if (!Number.isFinite(splitAmount) || splitAmount <= 0) {
          return res.status(400).json({ message: `Split #${i + 1}: amount must be a positive number` });
        }

        const roundedAmount = Math.round(splitAmount * 100) / 100;
        parsed.push({ category: splitCategory, amount: roundedAmount });
        sumAmounts += roundedAmount;
      }

      const roundedSum = Math.round(sumAmounts * 100) / 100;
      if (Math.abs(roundedSum - absTotal) > 0.05) {
        return res.status(400).json({
          message: 'Split amounts must add up to the total expense amount',
        });
      }

      let allocatedAmount = 0;
      let allocatedPercentage = 0;
      normalizedSplits = parsed.map((split, index) => {
        const isLast = index === parsed.length - 1;

        const amountAbs = isLast
          ? Math.round((absTotal - allocatedAmount) * 100) / 100
          : split.amount;
        const percentage = isLast
          ? Math.round((100 - allocatedPercentage) * 100) / 100
          : Math.round(((amountAbs / absTotal) * 100) * 100) / 100;

        allocatedAmount = Math.round((allocatedAmount + amountAbs) * 100) / 100;
        allocatedPercentage = Math.round((allocatedPercentage + percentage) * 100) / 100;

        return {
          category: split.category,
          amount: -Math.abs(amountAbs),
          percentage,
        };
      });

      normalizedCategory = normalizedSplits[0]?.category || normalizedCategory;
    }
  }

  if (!normalizedCategory) {
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
  (req.body as any).category = normalizedCategory;
  (req.body as any).amount = numAmount;
  if (normalizedNotes !== undefined) {
    (req.body as any).notes = normalizedNotes;
  }
  if (normalizedTags !== undefined) {
    (req.body as any).tags = normalizedTags;
  }
  if (normalizedSplits !== undefined) {
    (req.body as any).splits = normalizedSplits;
  }

  next();
}

export function validateProfileUpdateBody(req: Request, res: Response, next: NextFunction) {
  const { name, profile_photo, theme, currency, date_format, biometric_enabled } = req.body ?? {};

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

  if (biometric_enabled !== undefined) {
    if (typeof biometric_enabled !== 'boolean') {
      return res.status(400).json({ message: 'biometric_enabled must be a boolean' });
    }
  }

  if (
    name === undefined &&
    profile_photo === undefined &&
    theme === undefined &&
    currency === undefined &&
    date_format === undefined &&
    biometric_enabled === undefined
  ) {
    return res.status(400).json({
      message: 'At least one field (name, profile_photo, theme, currency, date_format, biometric_enabled) is required',
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
