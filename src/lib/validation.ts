export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /\d/.test(password);
}
