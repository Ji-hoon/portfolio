export default function robots() {
  return {
    rules: [
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    sitemap: "https://www.jihoonkim.com/sitemap.xml",
  };
}
