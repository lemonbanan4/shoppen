import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"
import { BRAND } from "@lib/brand"

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to your ${BRAND.name} account.`,
}

export default function Login() {
  return <LoginTemplate />
}
