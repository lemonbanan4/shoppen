"use client"

import React from "react"
import { toast } from "sonner"
import { subscribeToNewsletter } from "@lib/data/newsletter"

const NewsletterForm = () => {
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async (formData: FormData) => {
    const email = (formData.get("email") as string)?.trim()
    if (!email) {
      return
    }

    setLoading(true)
    const result = await subscribeToNewsletter(email)
    setLoading(false)

    if (!result.success) {
      toast.error(result.error || "Couldn't subscribe right now.")
      return
    }

    toast.success("You're on the list")
  }

  return (
    <form
      action={onSubmit}
      className="flex flex-col gap-y-3"
      data-testid="newsletter-form"
    >
      <span className="text-white font-medium text-sm">Stay in the loop</span>
      <div className="flex gap-x-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="w-full min-w-0 bg-transparent border border-neutral-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 bg-white text-neutral-950 text-sm font-medium rounded-full px-5 py-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          Join
        </button>
      </div>
    </form>
  )
}

export default NewsletterForm
