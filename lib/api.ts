const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const BASE_URL = (RAW_BASE_URL && RAW_BASE_URL.length > 0 ? RAW_BASE_URL : "/api").replace(/\/$/, "");

/**
 * Build a full API URL from a path.
 * @example apiUrl("/complaints/start") -> "/api/complaints/start"
 */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export type DepartmentItem = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type AdminAuthData = {
  id: number;
  full_name: string;
  email: string;
  department: string;
  is_super_admin: boolean;
  created_at: string;
};

export type AdminAuthResponse = {
  success: boolean;
  access_token: string;
  token_type: string;
  data: AdminAuthData;
};

export type AdminSignupResponse = {
  success: boolean;
  message: string;
  email: string;
};

export type AdminOtpStatusResponse = {
  success: boolean;
  message: string;
  email_verified: boolean;
};

type ErrorResponse = {
  detail?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | ErrorResponse;
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

export async function fetchDepartments(): Promise<DepartmentItem[]> {
  const response = await fetch(apiUrl("/complaints/departments"), {
    method: "GET",
  });
  const data = await parseResponse<{ success: boolean; data: DepartmentItem[] }>(response);
  return data.data;
}

export async function adminSignup(payload: {
  full_name: string;
  email: string;
  department: string;
  password: string;
}): Promise<AdminSignupResponse> {
  const response = await fetch(apiUrl("/admin/auth/signup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminSignupResponse>(response);
}

export async function adminLogin(payload: {
  email: string;
  password: string;
}): Promise<AdminAuthResponse> {
  const response = await fetch(apiUrl("/admin/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminAuthResponse>(response);
}

export async function superAdminLogin(payload: {
  email: string;
  password: string;
}): Promise<AdminAuthResponse> {
  const response = await fetch(apiUrl("/admin/auth/super-login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminAuthResponse>(response);
}

export async function verifyAdminEmailOtp(payload: {
  email: string;
  otp: string;
}): Promise<AdminOtpStatusResponse> {
  const response = await fetch(apiUrl("/admin/auth/verify/email"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminOtpStatusResponse>(response);
}

export async function resendAdminOtps(payload: {
  email: string;
}): Promise<AdminOtpStatusResponse> {
  const response = await fetch(apiUrl("/admin/auth/otp/resend"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<AdminOtpStatusResponse>(response);
}
