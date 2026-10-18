import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { v2 as cloudinary } from "cloudinary"

export default async function migrateImagesToCloudinary({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    logger.error(
      "Missing Cloudinary credentials. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env."
    )
    return
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  logger.info(`Checking Cloudinary connection for cloud: ${cloudName}...`)
  try {
    const pingResult = await cloudinary.api.ping()
    logger.info(`Cloudinary connected successfully: ${JSON.stringify(pingResult)}`)
  } catch (err: any) {
    logger.error(`Cloudinary connection error: ${err.message}`)
    return
  }

  logger.info("Fetching products from database...")
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "images.id", "images.url"],
  })

  if (!products || products.length === 0) {
    logger.info("No products found in database.")
    return
  }

  logger.info(`Found ${products.length} product(s) to inspect.`)

  // Cache uploaded URLs to prevent duplicate uploads if multiple products share images
  const urlCache = new Map<string, string>()

  const uploadToCloudinary = async (rawUrl: string, productTitle: string): Promise<string> => {
    if (!rawUrl || typeof rawUrl !== "string") return rawUrl
    // Already hosted on Cloudinary
    if (rawUrl.includes("res.cloudinary.com")) {
      return rawUrl
    }
    // Check in-memory cache
    if (urlCache.has(rawUrl)) {
      return urlCache.get(rawUrl)!
    }

    try {
      logger.info(`  Uploading image for "${productTitle}": ${rawUrl.substring(0, 60)}...`)
      const res = await cloudinary.uploader.upload(rawUrl, {
        folder: "solkast_products",
        resource_type: "image",
        overwrite: false,
      })
      const finalUrl = res.secure_url || res.url
      urlCache.set(rawUrl, finalUrl)
      return finalUrl
    } catch (e: any) {
      logger.error(`  Failed to upload ${rawUrl}: ${e.message}`)
      return rawUrl // fallback to original on error so we don't break data
    }
  }

  let totalUpdated = 0

  for (const product of products) {
    logger.info(`Processing "${product.title}" (${product.id})...`)

    const currentImages = (product.images || []).map((img: any) => img.url).filter(Boolean)
    const currentThumbnail = product.thumbnail

    let hasChanges = false
    const newImages: string[] = []

    for (const imgUrl of currentImages) {
      if (!imgUrl.includes("res.cloudinary.com")) {
        const uploaded = await uploadToCloudinary(imgUrl, product.title)
        if (uploaded !== imgUrl) {
          hasChanges = true
        }
        newImages.push(uploaded)
      } else {
        newImages.push(imgUrl)
      }
    }

    let newThumbnail = currentThumbnail
    if (currentThumbnail && !currentThumbnail.includes("res.cloudinary.com")) {
      newThumbnail = await uploadToCloudinary(currentThumbnail, product.title)
      if (newThumbnail !== currentThumbnail) {
        hasChanges = true
      }
    } else if (!newThumbnail && newImages.length > 0) {
      newThumbnail = newImages[0]
      hasChanges = true
    }

    if (hasChanges) {
      try {
        await updateProductsWorkflow(container).run({
          input: {
            selector: { id: product.id },
            update: {
              thumbnail: newThumbnail,
              images: newImages.map((url) => ({ url })),
            },
          },
        })
        logger.info(`  ✓ Updated "${product.title}" with Cloudinary image URLs.`)
        totalUpdated++
      } catch (err: any) {
        logger.error(`  ✗ Error updating "${product.title}": ${err.message}`)
      }
    } else {
      logger.info(`  - "${product.title}" already uses Cloudinary or has no images. Skipped.`)
    }
  }

  logger.info(`Migration complete! Updated ${totalUpdated}/${products.length} product(s).`)
}
