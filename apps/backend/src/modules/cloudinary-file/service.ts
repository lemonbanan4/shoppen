import { AbstractFileProviderService } from "@medusajs/framework/utils"
import {
  Logger,
  ProviderUploadFileDTO,
  ProviderFileResultDTO,
  ProviderDeleteFileDTO,
  ProviderGetFileDTO,
} from "@medusajs/framework/types"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v2: cloudinary } = require("cloudinary")

type Options = {
  cloud_name?: string
  api_key?: string
  api_secret?: string
  secure?: boolean
}

export default class CloudinaryFileProviderService extends AbstractFileProviderService {
  static identifier = "cloudinary"
  protected logger_: Logger

  constructor({ logger }: { logger: Logger }, options: Options) {
    super()
    this.logger_ = logger

    cloudinary.config({
      cloud_name: options.cloud_name || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: options.api_key || process.env.CLOUDINARY_API_KEY,
      api_secret: options.api_secret || process.env.CLOUDINARY_API_SECRET,
      secure: options.secure !== false,
    })
  }

  async upload(file: ProviderUploadFileDTO): Promise<ProviderFileResultDTO> {
    const base64Data = `data:${file.mimeType};base64,${file.content}`
    const result = await cloudinary.uploader.upload(base64Data, {
      resource_type: "auto",
      public_id: file.filename.replace(/\.[^/.]+$/, ""),
      overwrite: true,
    })

    return {
      url: result.secure_url || result.url,
      key: result.public_id,
    }
  }

  async delete(file: ProviderDeleteFileDTO): Promise<void> {
    await cloudinary.uploader.destroy(file.fileKey)
  }

  async getPresignedDownloadUrl(fileData: ProviderGetFileDTO): Promise<string> {
    return fileData.fileKey
  }
}
