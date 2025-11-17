export interface AuthorizeResponse {
  auth_url: string;
  state: string;
}

export interface UserPermission {
  resource_id: string;
  resource_name: string;
}

export interface UserInfo {
  id: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  permissions: UserPermission[];
  roles: string[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  expires_at: string;
  refresh_expires_at: string;
  id_token: string;
  user_info: UserInfo;
  session_id: string;
}

export interface OAuth2CallbackRequest {
  code: string;
  state: string;
}

export interface SessionResponse extends AuthTokens {}

export interface User {
  id: string;
}
