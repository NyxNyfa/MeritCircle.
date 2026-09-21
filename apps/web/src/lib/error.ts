/**
 * Standardized Error Handling Helpers for Merit Circle Web Application
 * Ensures that all user-facing error messages are human-readable strings and never "[object Object]".
 */

export async function getApiErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error?.message && typeof data.error.message === "string") {
      return data.error.message;
    }
    if (data?.message && typeof data.message === "string") {
      return data.message;
    }
    if (data?.error && typeof data.error === "string") {
      return data.error;
    }
    if (data?.error?.code && typeof data.error.code === "string") {
      return data.error.code;
    }
    if (data?.code && typeof data.code === "string") {
      return data.code;
    }
    return `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

export function getErrorMessage(err: unknown): string {
  if (!err) {
    return "An unexpected error occurred";
  }

  if (typeof err === "string") {
    if (err === "[object Object]") {
      return "An unexpected error occurred";
    }
    return err;
  }

  if (typeof err === "object") {
    const e = err as Record<string, any>;

    // Check if e.message is already a clean string and not "[object Object]"
    if (typeof e.message === "string" && e.message.trim() !== "" && e.message !== "[object Object]") {
      return e.message;
    }

    // Check nested error object (e.g. { error: { message: "...", code: "..." } })
    if (e.error) {
      if (typeof e.error === "string" && e.error !== "[object Object]") {
        return e.error;
      }
      if (typeof e.error === "object") {
        if (typeof e.error.message === "string" && e.error.message !== "[object Object]") {
          return e.error.message;
        }
        if (typeof e.error.code === "string") {
          return e.error.code;
        }
      }
    }

    // Check ApiError details or payload
    if (e.details) {
      if (typeof e.details === "string" && e.details !== "[object Object]") {
        return e.details;
      }
      if (typeof e.details === "object" && typeof e.details.message === "string") {
        return e.details.message;
      }
      if (typeof e.details === "object" && typeof e.details.error?.message === "string") {
        return e.details.error.message;
      }
    }

    // Check error code
    if (typeof e.code === "string") {
      return e.code;
    }

    try {
      const serialized = JSON.stringify(err);
      if (serialized && serialized !== "{}" && serialized !== '""') {
        return serialized;
      }
    } catch {
      // ignore serialization error
    }
  }

  return "An unexpected error occurred";
}
