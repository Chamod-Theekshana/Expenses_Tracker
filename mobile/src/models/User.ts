export interface User {
  id: string;
  email: string;
  name?: string;
  profilePhoto?: string | null;
  theme?: 'dark' | 'light';
  currency?: string;
  date_format?: string;
}
