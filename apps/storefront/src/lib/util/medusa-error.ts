type MedusaError = {
  response?: {
    data: { message?: string } | string
    status: number
    headers: unknown
  }
  request?: unknown
  message?: string
  config?: { url: string; baseURL: string }
}

export default function medusaError(error: unknown): never {
  const err = error as MedusaError
  if (err.response) {
    try {
      const baseURL = err.config?.baseURL || "https://backend"
      const url = err.config?.url || ""
      const u = new URL(url, baseURL)
      console.error("Resource:", u.toString())
    } catch {
      console.error("Resource URL:", err.config?.url)
    }
    console.error("Response data:", err.response.data)
    console.error("Status code:", err.response.status)
    console.error("Headers:", err.response.headers)

    const data = err.response.data
    let message = "An unexpected error occurred with the store backend."
    if (typeof data === "string" && data.trim()) {
      message = data.trim()
    } else if (typeof data === "object" && data !== null) {
      if (typeof data.message === "string" && data.message.trim()) {
        message = data.message.trim()
      } else if ("error" in (data as Record<string, unknown>) && typeof (data as any).error === "string") {
        message = (data as any).error.trim()
      } else {
        try {
          message = JSON.stringify(data)
        } catch {
          message = String(data)
        }
      }
    } else if (err.message) {
      message = err.message
    }

    const formatted = message.charAt(0).toUpperCase() + message.slice(1)
    throw new Error(formatted.endsWith(".") ? formatted : formatted + ".")
  } else if (err.request) {
    throw new Error("No response received from store backend: " + (err.message || "Network request failed."))
  } else {
    throw new Error(err.message || "Error setting up request to store backend.")
  }
}
