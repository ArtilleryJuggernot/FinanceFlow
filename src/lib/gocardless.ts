const BASE_URL = "https://bankaccountdata.gocardless.com/api/v2";

let cachedToken: { access: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.access;
  }

  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: process.env.GOCARDLESS_SECRET_ID,
      secret_key: process.env.GOCARDLESS_SECRET_KEY,
    }),
  });

  if (!res.ok) throw new Error("Failed to get GoCardless token");

  const data = await res.json();
  cachedToken = {
    access: data.access,
    expires: Date.now() + (data.access_expires - 60) * 1000,
  };

  return data.access;
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `GoCardless API error: ${res.status}`);
  }

  return res.json();
}

export type Institution = {
  id: string;
  name: string;
  bic: string;
  logo: string;
  countries: string[];
};

export async function getInstitutions(country = "FR"): Promise<Institution[]> {
  return apiRequest(`/institutions/?country=${country}`);
}

export async function createAgreement(institutionId: string) {
  return apiRequest("/agreements/enduser/", {
    method: "POST",
    body: JSON.stringify({
      institution_id: institutionId,
      max_historical_days: 730,
      access_valid_for_days: 90,
      access_scope: ["balances", "details", "transactions"],
    }),
  });
}

export async function createRequisition(
  institutionId: string,
  redirectUrl: string,
  agreementId: string,
  reference: string
) {
  return apiRequest("/requisitions/", {
    method: "POST",
    body: JSON.stringify({
      redirect: redirectUrl,
      institution_id: institutionId,
      agreement: agreementId,
      reference,
      user_language: "FR",
    }),
  });
}

export async function getRequisition(requisitionId: string) {
  return apiRequest(`/requisitions/${requisitionId}/`);
}

export async function getAccountDetails(accountId: string) {
  return apiRequest(`/accounts/${accountId}/details/`);
}

export async function getAccountBalances(accountId: string) {
  return apiRequest(`/accounts/${accountId}/balances/`);
}

export async function getAccountTransactions(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
) {
  let endpoint = `/accounts/${accountId}/transactions/`;
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  if (params.toString()) endpoint += `?${params.toString()}`;

  return apiRequest(endpoint);
}
