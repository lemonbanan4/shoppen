"use client"

import React from "react"
import { toast } from "sonner"
import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomerPassword } from "@lib/data/customer"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfilePassword: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>()

  const updatePassword = async (formData: FormData) => {
    setErrorMessage(undefined)

    const oldPassword = formData.get("old_password") as string
    const newPassword = formData.get("new_password") as string
    const confirmPassword = formData.get("confirm_password") as string

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords don't match.")
      toast.error("New passwords don't match")
      return
    }

    if (!customer.email) {
      setErrorMessage("No account email on file.")
      return
    }

    const result = await updateCustomerPassword(
      customer.email,
      oldPassword,
      newPassword
    )

    if (!result.success) {
      setErrorMessage(result.error)
      toast.error(result.error || "Couldn't update your password")
      return
    }

    setSuccessState(true)
    toast.success("Password updated")
  }

  const clearState = () => {
    setSuccessState(false)
    setErrorMessage(undefined)
  }

  return (
    <form
      action={updatePassword}
      onReset={() => clearState()}
      className="w-full"
    >
      <AccountInfo
        label="Password"
        currentInfo={
          <span>The password is not shown for security reasons</span>
        }
        isSuccess={successState}
        isError={!!errorMessage}
        errorMessage={errorMessage}
        clearState={clearState}
        data-testid="account-password-editor"
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Old password"
            name="old_password"
            required
            type="password"
            data-testid="old-password-input"
          />
          <Input
            label="New password"
            type="password"
            name="new_password"
            required
            data-testid="new-password-input"
          />
          <Input
            label="Confirm password"
            type="password"
            name="confirm_password"
            required
            data-testid="confirm-password-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfilePassword
