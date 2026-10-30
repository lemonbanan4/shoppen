import React from "react"

export const VisaIcon = ({ className = "h-5 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 38 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Visa"
  >
    <rect width="38" height="24" rx="3.5" fill="#1434CB" />
    <path
      d="M15.4 16.5L17.3 7.5H19.5L17.6 16.5H15.4ZM24.2 7.7C23.7 7.5 22.9 7.3 22 7.3C19.7 7.3 18 8.6 18 10.3C18 11.6 19.1 12.3 20 12.8C20.9 13.2 21.2 13.5 21.2 13.9C21.2 14.6 20.4 14.9 19.6 14.9C18.7 14.9 18.2 14.7 17.5 14.4L17.1 14.2L16.7 16.2C17.3 16.5 18.3 16.8 19.4 16.8C21.9 16.8 23.5 15.6 23.5 13.8C23.5 12.4 22.5 11.6 21.4 11C20.6 10.6 20.1 10.3 20.1 9.8C20.1 9.3 20.6 8.9 21.5 8.9C22.2 8.9 22.8 9.1 23.3 9.3L23.5 9.4L24.2 7.7ZM30.4 16.5H32.4L30.6 7.5H28.8C28.3 7.5 27.9 7.8 27.7 8.3L24.4 16.5H26.7L27.2 15.1H30L30.4 16.5ZM27.8 13.4L29.1 9.7L29.8 13.4H27.8ZM13.9 7.5L11.7 13.8L11.5 12.3C11.1 11.1 10.1 10 8.9 9.4L10.9 16.5H13.3L16.8 7.5H13.9Z"
      fill="white"
    />
    <path
      d="M10 7.5H6.3V7.7C9.1 8.4 11.1 10.1 11.7 12.3L10.9 8.2C10.8 7.7 10.4 7.5 10 7.5Z"
      fill="#F7B600"
    />
  </svg>
)

export const MastercardIcon = ({ className = "h-5 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 38 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Mastercard"
  >
    <rect width="38" height="24" rx="3.5" fill="#141414" stroke="#262626" />
    <circle cx="14" cy="12" r="6.8" fill="#EB001B" />
    <circle cx="24" cy="12" r="6.8" fill="#F79E1B" />
    <path
      d="M19 7.2A6.77 6.77 0 0 1 21.6 12 6.77 6.77 0 0 1 19 16.8 6.77 6.77 0 0 1 16.4 12 6.77 6.77 0 0 1 19 7.2Z"
      fill="#FF5F00"
    />
  </svg>
)

export const AmexIcon = ({ className = "h-5 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 38 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="American Express"
  >
    <rect width="38" height="24" rx="3.5" fill="#016FD0" />
    <rect x="2" y="2" width="34" height="20" rx="2" stroke="white" strokeWidth="0.8" opacity="0.4" />
    <text
      x="19"
      y="15.2"
      textAnchor="middle"
      fill="white"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="8.5"
      fontWeight="900"
      letterSpacing="0.8"
    >
      AMEX
    </text>
  </svg>
)

export const ApplePayIcon = ({ className = "h-5 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 38 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Apple Pay"
  >
    <rect width="38" height="24" rx="3.5" fill="#000000" stroke="#333333" />
    {/* Apple Logo */}
    <path
      d="M12.6 8.7C12.1 9.4 11.2 9.9 10.4 9.8C10.3 8.9 10.7 8.1 11.2 7.5C11.7 6.9 12.6 6.4 13.4 6.4C13.5 7.3 13.1 8.1 12.6 8.7ZM13.4 9.9C12.3 9.9 11.7 9.2 11 9.2C10.2 9.2 9.6 9.8 8.8 9.8C7.5 9.8 6.2 11.1 6.2 13.3C6.2 15.3 7.5 17.6 8.8 17.6C9.5 17.6 9.9 17.1 10.8 17.1C11.7 17.1 12 17.6 12.8 17.6C14.1 17.6 15.2 15.6 15.2 15.4C14 14.8 13.9 12.9 15.1 12.2C14.5 10.9 13.6 9.9 13.4 9.9Z"
      fill="white"
    />
    {/* Pay text */}
    <path
      d="M17.8 7.8H20.4C21.8 7.8 22.8 8.8 22.8 10.1C22.8 11.5 21.8 12.5 20.4 12.5H19.1V16H17.8V7.8ZM20.3 11.3C21.1 11.3 21.6 10.8 21.6 10.1C21.6 9.5 21.1 9 20.3 9H19.1V11.3H20.3Z"
      fill="white"
    />
    <path
      d="M24.8 16H23.5L25.8 10.3H27.1L29.4 16H28.1L27.6 14.7H25.3L24.8 16ZM25.7 13.6H27.2L26.4 11.4L25.7 13.6Z"
      fill="white"
    />
    <path
      d="M29.8 10.3H31.1L32.4 14.3L33.7 10.3H35L33 16.3C32.4 17.9 31.8 18.4 30.6 18.4C30.3 18.4 29.9 18.3 29.7 18.2L30 17.1C30.2 17.2 30.4 17.3 30.7 17.3C31.3 17.3 31.7 17 32 16.2L29.8 10.3Z"
      fill="white"
    />
  </svg>
)

export const GooglePayIcon = ({ className = "h-5 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 38 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Google Pay"
  >
    <rect width="38" height="24" rx="3.5" fill="#000000" stroke="#333333" />
    {/* G Logo */}
    <path
      d="M13.5 12.2C13.5 11.8 13.5 11.4 13.4 11H9.5V12.7H11.8C11.7 13.4 11.3 14 10.7 14.4V15.7H12.4C13.4 14.8 13.5 13.4 13.5 12.2Z"
      fill="#4285F4"
    />
    <path
      d="M9.5 16.5C10.7 16.5 11.7 16.1 12.4 15.7L10.7 14.4C10.4 14.6 9.9 14.8 9.5 14.8C8.3 14.8 7.3 14 6.9 12.9H5.2V14.2C5.9 15.6 7.6 16.5 9.5 16.5Z"
      fill="#34A853"
    />
    <path
      d="M6.9 12.9C6.8 12.6 6.7 12.3 6.7 12C6.7 11.7 6.8 11.4 6.9 11.1V9.8H5.2C4.9 10.5 4.7 11.2 4.7 12C4.7 12.8 4.9 13.5 5.2 14.2L6.9 12.9Z"
      fill="#FBBC05"
    />
    <path
      d="M9.5 9.2C10.2 9.2 10.8 9.4 11.3 9.9L12.6 8.6C11.7 7.8 10.7 7.5 9.5 7.5C7.6 7.5 5.9 8.4 5.2 9.8L6.9 11.1C7.3 10 8.3 9.2 9.5 9.2Z"
      fill="#EA4335"
    />
    {/* Pay text */}
    <path
      d="M17.4 7.9H19.9C21.3 7.9 22.3 8.9 22.3 10.2C22.3 11.5 21.3 12.5 19.9 12.5H18.7V15.8H17.4V7.9ZM19.8 11.3C20.6 11.3 21 10.8 21 10.2C21 9.6 20.6 9.1 19.8 9.1H18.7V11.3H19.8Z"
      fill="white"
    />
    <path
      d="M24 15.8H22.7L25 10.3H26.3L28.6 15.8H27.3L26.8 14.5H24.5L24 15.8ZM24.9 13.4H26.4L25.6 11.4L24.9 13.4Z"
      fill="white"
    />
    <path
      d="M29 10.3H30.3L31.6 14.2L32.9 10.3H34.2L32.2 16.2C31.6 17.8 31 18.3 29.8 18.3C29.5 18.3 29.1 18.2 28.9 18.1L29.2 17C29.4 17.1 29.6 17.2 29.9 17.2C30.5 17.2 30.9 16.9 31.2 16.1L29 10.3Z"
      fill="white"
    />
  </svg>
)

export const StripeBadge = ({ className = "h-5 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 38 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Stripe"
  >
    <rect width="38" height="24" rx="3.5" fill="#635BFF" />
    <path
      d="M17.4 10.6C17.4 9.9 17.9 9.5 18.9 9.5C20.1 9.5 21.6 9.9 22.8 10.5V7.9C21.4 7.4 20.1 7.2 18.8 7.2C15.6 7.2 13.6 8.9 13.6 11.7C13.6 16.1 19.6 15.4 19.6 17.3C19.6 18.1 18.9 18.5 17.8 18.5C16.4 18.5 14.8 17.9 13.4 17.1V19.8C15 20.5 16.5 20.8 18 20.8C21.3 20.8 23.5 19.2 23.5 16.3C23.5 11.6 17.4 12.4 17.4 10.6Z"
      fill="white"
    />
  </svg>
)

export const LockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
      clipRule="evenodd"
    />
  </svg>
)

export const ShieldCheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const PaymentMethodBadges = ({
  size = "default",
  className = "",
}: {
  size?: "small" | "default" | "large"
  className?: string
}) => {
  const iconClass =
    size === "small"
      ? "h-4 w-auto rounded shadow-sm"
      : size === "large"
      ? "h-6 sm:h-7 w-auto rounded shadow-sm"
      : "h-5 w-auto rounded shadow-sm"

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <VisaIcon className={iconClass} />
      <MastercardIcon className={iconClass} />
      <AmexIcon className={iconClass} />
      <ApplePayIcon className={iconClass} />
      <GooglePayIcon className={iconClass} />
      <StripeBadge className={iconClass} />
    </div>
  )
}

export const CheckoutTrustBadge = ({ className = "" }: { className?: string }) => (
  <div
    className={`rounded-xl border border-neutral-200 bg-neutral-50/80 p-3.5 sm:p-4 text-xs font-sans text-neutral-600 ${className}`}
  >
    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-200">
      <div className="flex items-center gap-1.5 text-neutral-900 font-medium">
        <LockIcon className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-[11px] sm:text-xs tracking-tight font-semibold">
          Guaranteed Safe &amp; Secure Checkout
        </span>
      </div>
      <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-600 font-medium">
        256-Bit SSL
      </span>
    </div>

    <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <PaymentMethodBadges size="small" />
      <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-600">
        <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
        <span>Powered by Stripe</span>
      </div>
    </div>
  </div>
)
