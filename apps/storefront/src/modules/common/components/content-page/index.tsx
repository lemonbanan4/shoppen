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
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-xs font-mono tracking-[0.25em] uppercase text-[#00d4ff] mb-3">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl small:text-4xl font-mono font-bold tracking-tight text-white uppercase mb-4">
          {title}
        </h1>
        {intro && (
          <p className="text-base text-neutral-300 font-sans leading-relaxed mb-10">
            {intro}
          </p>
        )}
        <div className="flex flex-col gap-y-8 text-neutral-300 font-sans [&_h2]:text-lg [&_h2]:font-mono [&_h2]:font-bold [&_h2]:text-white [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:mb-2 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-neutral-300 [&_strong]:text-white [&_strong]:font-semibold [&_li]:text-sm [&_li]:leading-7 [&_li]:text-neutral-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-y-1.5 [&_section]:border-b [&_section]:border-neutral-800/80 [&_section]:pb-8 [&_section:last-child]:border-0">
          {children}
        </div>
      </div>
    </div>
  )
}

export default ContentPage
