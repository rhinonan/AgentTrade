/** 用户身份 */
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: "anonymous" | "user" | "admin";
}

/** 会话信息 */
export interface Session {
  user: User;
  expiresAt?: number;
}

/** 认证适配器接口 — 开源仓库只定义接口，不包含真实实现 */
export interface AuthAdapter {
  /** 从请求中解析会话（cookie/jwt/header），失败返回 null */
  getSession(request: Request): Promise<Session | null>;

  /** 用户是否有指定权限 */
  hasPermission(user: User, permission: string): boolean;

  /** 该用户的分析配额限制（-1 表示无限制） */
  getQuotaLimit(user: User): Promise<number>;

  /** 查询当前已用配额 */
  getQuotaUsed(user: User): Promise<number>;
}

/** 开源版默认实现——所有人匿名、不限配额 */
export class NoopAuthAdapter implements AuthAdapter {
  async getSession(_request: Request): Promise<Session | null> {
    return {
      user: { id: "anonymous", name: "匿名用户", role: "anonymous" },
    };
  }

  hasPermission(_user: User, _permission: string): boolean {
    return true;
  }

  async getQuotaLimit(_user: User): Promise<number> {
    return -1;
  }

  async getQuotaUsed(_user: User): Promise<number> {
    return 0;
  }
}

/** 全局单例——默认使用 Noop，私有仓库调用 setAuthAdapter() 替换 */
let _adapter: AuthAdapter = new NoopAuthAdapter();

export function getAuthAdapter(): AuthAdapter {
  return _adapter;
}

export function setAuthAdapter(adapter: AuthAdapter): void {
  _adapter = adapter;
}
