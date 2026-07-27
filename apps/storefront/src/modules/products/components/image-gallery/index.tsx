"use client"

import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /** Product name, so each view is described rather than numbered. */
  title?: string
}

const ImageGallery = ({ images, title }: ImageGalleryProps) => {
  // Index of the image open in the lightbox; null when closed.
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null || images.length === 0) return current
        return (current + delta + images.length) % images.length
      })
    },
    [images.length]
  )

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") step(1)
      if (e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    // Lock page scroll while the lightbox is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [openIndex, close, step])

  const openImage = openIndex !== null ? images[openIndex] : null

  return (
    <div className="flex items-start relative">
      <div className="flex flex-col flex-1 small:mx-16 gap-y-4">
        {images.map((image, index) => {
          return (
            <Container
              key={image.id}
              className="relative aspect-[29/34] w-full overflow-hidden bg-ui-bg-subtle cursor-zoom-in"
              id={image.id}
            >
              {!!image.url && (
                <button
                  type="button"
                  aria-label={`Zoom product image ${index + 1}`}
                  className="absolute inset-0"
                  onClick={() => setOpenIndex(index)}
                >
                  <Image
                    src={image.url}
                    priority={index <= 2 ? true : false}
                    className="absolute inset-0 rounded-rounded"
                    alt={
                      title
                        ? `${title} — view ${index + 1} of ${images.length}`
                        : `Product image ${index + 1}`
                    }
                    fill
                    sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                    style={{
                      objectFit: "cover",
                    }}
                  />
                </button>
              )}
            </Container>
          )
        })}
      </div>

      {openImage?.url && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/90 flex items-center justify-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 text-white text-xl leading-none hover:bg-white/20 transition-colors"
          >
            ×
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation()
                  step(-1)
                }}
                className="absolute left-3 small:left-6 z-10 h-11 w-11 rounded-full bg-white/10 text-white text-xl hover:bg-white/20 transition-colors"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation()
                  step(1)
                }}
                className="absolute right-3 small:right-6 z-10 h-11 w-11 rounded-full bg-white/10 text-white text-xl hover:bg-white/20 transition-colors"
              >
                ›
              </button>
            </>
          )}
          <div
            className="relative w-[92vw] h-[86vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={openImage.url}
              alt={
                title
                  ? `${title} — view ${openIndex! + 1}, enlarged`
                  : `Product image ${openIndex! + 1} enlarged`
              }
              fill
              sizes="92vw"
              style={{ objectFit: "contain" }}
            />
          </div>
          {images.length > 1 && (
            <p className="absolute bottom-4 inset-x-0 text-center text-white/70 text-sm">
              {openIndex! + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
