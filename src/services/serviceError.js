export class ServiceError extends Error {
    constructor(status, message) {
        super(message);
        this.name = "ServiceError";
        this.status = status;
    }
}

export function requiredText(value, message) {
    if (typeof value !== "string" || !value.trim()) throw new ServiceError(400, message);
    return value.trim();
}

export function quantity(value, { positive = false, message } = {}) {
    if ((typeof value !== "number" && typeof value !== "string") ||
        (typeof value === "string" && !value.trim()) ||
        !Number.isFinite(Number(value)) || (positive ? Number(value) <= 0 : Number(value) < 0)) {
        throw new ServiceError(400, message);
    }
    return Number(value);
}
