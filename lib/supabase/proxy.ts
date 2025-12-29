import { createServiceRoleClient } from "./server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  // Extract user ID from claims (JWT uses 'sub' for subject/user ID)
  const userId = claims?.sub;


  // ADMIN ROUTES - Only admin employees can access
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!userId) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/employee/login";
      return NextResponse.redirect(url);
    }
    
    const serviceSupabase = createServiceRoleClient();
    const employeeResult = await serviceSupabase
      .from('employees')
      .select('is_admin, is_active')
      .eq('id', userId)
      .single();

    // Must be admin AND active
    if (employeeResult.error || !employeeResult.data || 
        !employeeResult.data.is_active || !employeeResult.data.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/scan";
      return NextResponse.redirect(url);
    }
  }

  // EMPLOYEE INVITATION PAGE PROTECTION
  // Only allow access with valid invitation token
  // Block anonymous customers and logged-in non-employees
  if (request.nextUrl.pathname.startsWith('/auth/employee/invite/')) {
      if (userId) {
        // User is logged in - check if they're an employee
        const serviceSupabase = createServiceRoleClient();
        const employeeResult = await serviceSupabase
          .from('employees')
          .select('id, is_active')
          .eq('id', userId)
          .single();

      // If logged in but NOT an employee (anonymous customer), redirect away
      if (employeeResult.error || !employeeResult.data) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      // If already an employee, redirect to scan page
      if (employeeResult.data && employeeResult.data.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = "/scan";
        return NextResponse.redirect(url);
      }
    }
    // If no user, allow access (they'll validate token on the page)
  }

  // EMPLOYEE LOGIN PAGE PROTECTION
  // If logged-in employee tries to access login page, redirect them to scan page
  // (Admins can still access /admin directly if needed)
  if (request.nextUrl.pathname.startsWith('/auth/employee/login')) {
    if (userId) {
      // User is logged in - check if they're an employee
      const serviceSupabase = createServiceRoleClient();
      const employeeResult = await serviceSupabase
        .from('employees')
        .select('id, is_active')
        .eq('id', userId)
        .maybeSingle();

      // If logged in and is an active employee, redirect to scan page
      // (Admins can still navigate to /admin directly if they want)
      if (employeeResult.data && employeeResult.data.is_active) {
        const url = request.nextUrl.clone();
        url.pathname = "/scan";
        return NextResponse.redirect(url);
      }
      // If logged in but NOT an employee (anonymous customer), allow access to login page
      // (they might want to log in as an employee)
    }
    // If no user, allow access to login page
  }

  // EMPLOYEE LOGIN CHECK
  // check if accessing /scan - requires employee login

  if(request.nextUrl.pathname.startsWith('/scan')) {
    if (!userId) {
      // No user logged in, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = "/auth/employee/login";
      return NextResponse.redirect(url);
    }
    // Check if user is an employee using service role client
    const serviceSupabase = createServiceRoleClient();
    const employeeResult = await serviceSupabase
      .from('employees')
      .select('id, is_active')
      .eq('id', userId)
      .maybeSingle();

    const employee = employeeResult.data;
    const employeeError = employeeResult.error;

    // If not an employee or account inactive, redirect to login
    if (employeeError || !employee || !employee.is_active) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/employee/login";
      return NextResponse.redirect(url);
    }
  }

  if (
    request.nextUrl.pathname !== "/" &&
    !userId &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/join") &&
    !request.nextUrl.pathname.startsWith("/scan") &&
    !request.nextUrl.pathname.startsWith("/api/pass") &&
    !request.nextUrl.pathname.startsWith("/api/wallet") &&
    !request.nextUrl.pathname.startsWith("/api/test") &&
    !request.nextUrl.pathname.startsWith("/api/scan") &&
    !request.nextUrl.pathname.startsWith("/api/redeem") &&
    !request.nextUrl.pathname.startsWith("/api/purchase") &&
    !request.nextUrl.pathname.startsWith("/api/admin") &&
    !request.nextUrl.pathname.startsWith("/api/auth/employee/login") &&
    !request.nextUrl.pathname.startsWith("/api/auth/employee/check")
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
