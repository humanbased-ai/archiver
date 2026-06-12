import GhostContentAPI from "@tryghost/content-api";
import { BLOG_API_KEY } from "@/config";

class BlogApi {
  private api;
  constructor() {
    this.api = new GhostContentAPI({
      host: "https://blog.codatta.io",
      version: "v5.0",
      key: BLOG_API_KEY,
      url: "",
    });
  }

  async getLatesBlogs(limit: number = 3) {
    const desciPosts = await this.api.posts.browse({
      limit: 1,
      order: "published_at DESC",
      include: ["tags", "authors"],
      filter: "tag:desci",
    });

    const latestPosts = await this.api.posts.browse({
      limit: limit - 1,
      order: "published_at DESC",
      include: ["tags", "authors"],
      filter: "tag:-desci", // Exclude desci tagged posts
    });

    return [...desciPosts, ...latestPosts];
  }
}

export default new BlogApi();
