import { clx } from "@modules/common/components/ui"
import Image from "next/image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  /** Product name, so the image has a meaningful alt for screen readers
   *  and image search rather than a generic "Product image". */
  alt?: string
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  alt,
  size = "small",
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url
  const hoverImage = images?.find((img) => img.url && img.url !== initialImage)
    ?.url

  return (
    <div
      className={clx(
        "relative w-full overflow-hidden bg-neutral-100 rounded-xl",
        className,
        {
          "aspect-[4/5]": size !== "square",
          "aspect-[1/1]": size === "square",
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      {initialImage ? (
        <>
          <Image
            src={initialImage}
            alt={alt || "Product image"}
            className={clx(
              "absolute inset-0 object-cover object-center transition duration-500 ease-out",
              hoverImage
                ? "group-hover:opacity-0"
                : "group-hover:scale-[1.04]"
            )}
            draggable={false}
            quality={70}
            sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
            fill
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt={alt ? `${alt} — alternate view` : "Product image on hover"}
              className="absolute inset-0 object-cover object-center opacity-0 transition duration-500 ease-out group-hover:opacity-100 group-hover:scale-[1.04]"
              draggable={false}
              quality={70}
              sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
              fill
            />
          )}
        </>
      ) : (
        <div className="w-full h-full absolute inset-0 flex items-center justify-center">
          <PlaceholderImage size={size === "small" ? 16 : 24} />
        </div>
      )}
    </div>
  )
}

export default Thumbnail
