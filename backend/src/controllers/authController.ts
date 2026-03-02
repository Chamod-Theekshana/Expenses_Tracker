import { UserModel } from '../models/UserModel';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../utils/jwt';
import { CategoryModel } from '../models/CategoryModel';

export async function signUp(req: any, res: any) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await UserModel.findByEmail(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.create(email.toLowerCase(), hashedPassword);

    await CategoryModel.seedDefaults(String(user.id));

    const token = signAccessToken({ id: user.id, email: user.email });

    res.status(201).json({ 
      message: "User created successfully", 
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error("Error in signUp:", error);
    res.status(500).json({ message: "Server Error" });
  }
}

export async function signIn(req: any, res: any) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await UserModel.findByEmail(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signAccessToken({ id: user.id, email: user.email });

    res.status(200).json({ 
      message: "Sign in successful", 
      token,
      user: { id: user.id, email: user.email }
    });
    console.log("token",token)
  } catch (error) {
    console.error("Error in signIn:", error);
    res.status(500).json({ message: "Server Error" });
  }
}
