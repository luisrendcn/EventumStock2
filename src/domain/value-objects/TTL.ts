export class TTLError extends Error { // 
  constructor(message: string) { 
    super(message);
    this.name = 'TTLError';
  }
}

export class TTL {
  static readonly MIN_SECONDS = 120;    // 2 minutos
  static readonly MAX_SECONDS = 86400;  // 24 horas
  static readonly DEFAULT_SECONDS = 900; // 15 minutos

  private readonly _seconds: number;

  private constructor(seconds: number) {
    this._seconds = seconds;
  }

  static create(seconds?: number): TTL {
    const value = seconds ?? TTL.DEFAULT_SECONDS;
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new TTLError(`TTL must be an integer number of seconds. Got: ${value}`);
    }
    if (value < TTL.MIN_SECONDS) {
      throw new TTLError(`TTL must be at least ${TTL.MIN_SECONDS}s (2 min). Got: ${value}s`);
    }
    if (value > TTL.MAX_SECONDS) {
      throw new TTLError(`TTL must be at most ${TTL.MAX_SECONDS}s (24 h). Got: ${value}s`);
    }
    return new TTL(value);
  }

  get seconds(): number {
    return this._seconds;
  }

  expiresAt(from: Date): Date {
    return new Date(from.getTime() + this._seconds * 1000);
  }
}
