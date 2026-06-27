import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Proxy del panel (antes "middleware"): refresca la sesión de Supabase en cada
// petición a /panel/* (los tokens caducan y hay que renovarlos en el servidor)
// y protege las rutas. El kiosko (/, /r/...) no pasa por aquí (ver config.matcher).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Sin configuración no podemos validar la sesión; dejamos pasar y el
    // layout del panel mostrará el error de configuración.
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/panel/login";

  if (!user && !isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/panel/login";
    redirectUrl.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/panel";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Solo el panel. El resto del sitio (kiosko, recibos) no pasa por el proxy.
  matcher: ["/panel/:path*"],
};
