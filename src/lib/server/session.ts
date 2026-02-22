import { cookies } from "next/headers";

export const MOCK_SESSION_COOKIE = "om_session";

export async function getMockSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(MOCK_SESSION_COOKIE)?.value;
}

export async function setMockSessionToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });
}

export async function clearMockSessionToken() {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, "", { maxAge: 0, path: "/" });
}
