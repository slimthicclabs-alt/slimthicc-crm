import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;

  if (!passcode) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const password = decoded.slice(decoded.indexOf(":") + 1);

    if (password === passcode) {
      return NextResponse.next();
    }
  }

  return new NextResponse("SlimThicc Command Center passcode required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SlimThicc Command Center"'
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|healthz).*)"]
};
