const excludedPaths = ["/checkout", "/*/checkout", "/*/account", "/*/account/*", "/*/cart"]

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000",
  generateRobotsTxt: true,
  exclude: excludedPaths,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: excludedPaths,
      },
    ],
  },
}
