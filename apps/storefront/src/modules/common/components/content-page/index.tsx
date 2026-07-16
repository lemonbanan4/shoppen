import React from "react"

/**
 * Simple prose layout for static content pages (policies, help, FAQ).
 */
const ContentPage = ({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string
  title: string
  intro?: string
  children: React.ReactNode
}) => {
  return (
    <div className="content-container py-12 small:py-20">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-[11px] tracking-[0.2em] uppercase text-brand mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl small:text-4xl font-medium text-neutral-950 mb-4">
          {title}
        </h1>
        {intro && (
          <p className="text-base text-neutral-500 leading-7 mb-10">{intro}</p>
        )}
        <div className="flex flex-col gap-y-8 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-neutral-950 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-neutral-600 [&_li]:text-sm [&_li]:leading-7 [&_li]:text-neutral-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-y-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export default ContentPage
