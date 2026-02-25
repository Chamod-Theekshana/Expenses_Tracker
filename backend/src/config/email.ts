export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  // Mock implementation - replace with actual email service (SendGrid, Nodemailer, etc.)
  console.log(`📧 OTP Email sent to ${email}: ${otp}`);
  
  // In production, use:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({
  //   to: email,
  //   subject: 'Your PulseSpend Passkey',
  //   html: `<h2>Your passkey is: <strong>${otp}</strong></h2><p>Valid for 5 minutes</p>`
  // });
}
