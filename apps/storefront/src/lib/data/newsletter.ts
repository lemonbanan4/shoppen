"use server"

import { sdk } from "@lib/config"

export const subscribeToNewsletter = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await sdk.client.fetch(`/store/newsletter`, {
      method: "POST",
      body: { email },
    })
    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Couldn't subscribe right now.",
    }
  }
}
