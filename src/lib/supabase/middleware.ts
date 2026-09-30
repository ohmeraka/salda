import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/welcome", "/confirm", "/auth/callback"];

/**
 * Refreshes the Supabase auth session on every request and redirects
 * signed-out visitors away from protected pages. Called from src/proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath && request.nextUrl.pathname !== "/") {
    const welcomeUrl = request.nextUrl.clone();
    welcomeUrl.pathname = "/welcome";
    return NextResponse.redirect(welcomeUrl);
  }

  if (user && request.nextUrl.pathname === "/welcome") {
    const overviewUrl = request.nextUrl.clone();
    overviewUrl.pathname = "/overview";
    return NextResponse.redirect(overviewUrl);
  }

  return response;
}
